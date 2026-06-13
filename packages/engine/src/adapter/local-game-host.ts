import type {
  Command,
  CommandAck,
  GameEvent,
  GameTransport,
  Query,
  QueryResultMap,
  CharacterView,
  StorageView,
  Unsubscribe,
} from '@tradewright/contract';
import { content as defaultContent, type ContentIndex } from '@tradewright/content';
import type { Clock } from '../simulation/clock.js';
import { fastForward, type TickContext } from '../simulation/tick.js';
import { nextId, getStorage, type SaveGame } from '../world/state.js';
import { accumulateSummary, mergeSummaries } from '../simulation/summary.js';
import { EngineError } from '../world/ledger.js';
import { createCharacter } from '../world/character.js';
import { activityDef, assignActivity, stopActivity } from '../skills/activities.js';
import { missingItems } from '../world/storage.js';
import { effectiveStationTier } from '../world/facilities.js';
import { levelForXp, tierForLevel, xpForLevelUp } from '../skills/progression.js';

export interface LocalGameHostOptions {
  /** Defaults to the launch content shipped with the engine's content dep. */
  content?: ContentIndex;
  clock: Clock;
  save: SaveGame;
  /** Locale ids from `text/locales.json` — passed in by the GUI because the
   *  engine never reads the text tree (protocol Part V, research R1 i18n). */
  supportedLocaleIds: string[];
  onMutate?: () => void;
}

export class LocalGameHost implements GameTransport {
  private readonly listeners = new Set<(e: GameEvent) => void>();
  private readonly ctx: TickContext;

  private readonly contentIndex: ContentIndex;

  constructor(private readonly opts: LocalGameHostOptions) {
    this.contentIndex = opts.content ?? defaultContent;
    this.ctx = {
      content: this.contentIndex,
      emit: (e) => this.emit(e),
    };
  }

  get save(): SaveGame {
    return this.opts.save;
  }

  private get content(): ContentIndex {
    return this.contentIndex;
  }

  private emit(e: GameEvent): void {
    for (const listener of this.listeners) listener(e);
  }

  private mutated(): void {
    this.opts.onMutate?.();
  }

  /** Run catch-up on host boot, before the first query (T070): elapsed ticks
   *  replay with events folded into a pending summary instead of streamed. */
  start(): void {
    const save = this.save;
    const walletBefore = save.character?.wallet ?? 0;
    const fromTick = save.tick;
    const events: GameEvent[] = [];
    const result = this.advance((e) => events.push(e));
    if (result && result.ticksRun > 0) {
      const summary = accumulateSummary({
        events,
        fromTick,
        toTick: save.tick,
        tickSeconds: this.content.world.worldTickSeconds,
        elapsedSeconds: result.elapsedSeconds,
        capped: result.capped,
        capHours: result.capped ? this.content.world.offlineCapHours : null,
        netCoinDelta: (save.character?.wallet ?? 0) - walletBefore,
      });
      if (summary.entries.length > 0 || summary.capped) {
        save.pendingSummary = save.pendingSummary
          ? mergeSummaries(save.pendingSummary, summary)
          : summary;
        this.emit({ type: 'SummaryReady', summary: save.pendingSummary });
      }
    }
  }

  /** Advance world time to the host clock, streaming events live. Residual
   *  sub-tick time stays anchored so no seconds are lost between pumps. */
  pump(): void {
    this.advance((e) => this.emit(e));
  }

  private advance(
    emit: (e: GameEvent) => void,
  ): { ticksRun: number; capped: boolean; elapsedSeconds: number } | null {
    const save = this.save;
    const now = this.opts.clock.now();
    save.lastMonotonicMark = this.opts.clock.monotonic?.() ?? null;
    if (save.lastSeenWallClock === null) {
      save.lastSeenWallClock = now;
      this.mutated();
      return null;
    }
    const elapsedSeconds = Math.max(0, (now - save.lastSeenWallClock) / 1000);
    const tickSeconds = this.content.world.worldTickSeconds;
    if (elapsedSeconds < tickSeconds) return null;
    const result = fastForward(save, elapsedSeconds, { content: this.content, emit });
    save.lastSeenWallClock = result.capped
      ? now
      : save.lastSeenWallClock + result.ticksRun * tickSeconds * 1000;
    if (result.ticksRun > 0) this.mutated();
    return { ...result, elapsedSeconds };
  }

  send(command: Command): Promise<CommandAck> {
    try {
      this.handle(command);
      this.mutated();
      return Promise.resolve({ accepted: true, commandId: nextId(this.save, 'cmd') });
    } catch (e) {
      if (e instanceof EngineError) {
        return Promise.resolve({
          accepted: false,
          code: e.code,
          message: e.message,
          details: e.details,
        });
      }
      throw e;
    }
  }

  private handle(command: Command): void {
    switch (command.type) {
      case 'CreateCharacter': {
        createCharacter(this.save, this.content, {
          name: command.name,
          startSettlementId: command.startSettlementId,
        });
        this.emit({ type: 'WalletChanged', balance: this.save.character!.wallet });
        this.emit({ type: 'StorageChanged', settlementId: command.startSettlementId });
        return;
      }
      case 'AssignActivity': {
        assignActivity(this.save, this.content, {
          activityId: command.activityId,
          confirmReplace: command.confirmReplace,
        });
        return;
      }
      case 'StopActivity': {
        stopActivity(this.save);
        return;
      }
      case 'CollectSummary': {
        this.save.pendingSummary = null;
        return;
      }
      case 'SetDisplayLocale': {
        if (!this.opts.supportedLocaleIds.includes(command.localeId)) {
          throw new EngineError('UNSUPPORTED_LOCALE', `unknown locale ${command.localeId}`);
        }
        this.save.settings.displayLocale = command.localeId;
        return;
      }
      case 'SetNotificationPref': {
        if (!this.content.notificationCategories.some((c) => c.id === command.categoryId)) {
          throw new EngineError('NOT_FOUND', `unknown category ${command.categoryId}`);
        }
        this.save.settings.notificationPrefs.categories[command.categoryId] = command.optIn;
        return;
      }
      default:
        throw new EngineError('NOT_FOUND', `command ${command.type} not yet supported`);
    }
  }

  query<Q extends Query>(q: Q): Promise<QueryResultMap[Q['type']]> {
    const result = this.answer(q);
    return Promise.resolve(result as QueryResultMap[Q['type']]);
  }

  private answer(q: Query): unknown {
    switch (q.type) {
      case 'GetCharacter':
        return this.characterView();
      case 'GetStorage':
        return this.storageView(q.settlementId);
      case 'GetActivities':
        return this.activityViews();
      case 'GetMarket':
        return { settlementId: q.settlementId, items: [] };
      case 'GetMyOrders':
        return [];
      case 'GetRoutes':
        return [];
      case 'GetShipments':
        return [];
      case 'GetTransactions': {
        const all = [...this.save.transactions].reverse();
        return {
          entries: all.slice(q.offset, q.offset + q.limit).map((t) => ({
            id: t.id,
            kind: t.kind,
            coinDelta: t.coinDelta,
            balanceAfter: t.balanceAfter,
            items: t.items,
            settlementId: t.settlementId,
            refId: t.refId,
            atTick: t.atTick,
          })),
          offset: q.offset,
          limit: q.limit,
          total: all.length,
        };
      }
      case 'GetSummary':
        return this.save.pendingSummary;
      case 'GetSettlementFacilities': {
        const settlement = this.content.settlements.find((s) => s.id === q.settlementId);
        if (!settlement) throw new EngineError('NOT_FOUND', `unknown settlement ${q.settlementId}`);
        return settlement.facilities.map((f) => ({
          facilityId: f.id,
          kind: f.kind,
          craftFamily: f.craftFamily ?? null,
          baseTier: f.baseTier,
          effectiveTier:
            f.kind === 'station' && f.craftFamily
              ? effectiveStationTier(this.content, settlement.id, f.craftFamily)
              : f.baseTier,
        }));
      }
      case 'GetNotificationPrefs':
        return {
          categories: this.content.notificationCategories.map((c) => ({
            categoryId: c.id,
            optedIn: this.save.settings.notificationPrefs.categories[c.id] ?? false,
          })),
        };
    }
  }

  private activityViews() {
    const c = this.save.character;
    if (!c || c.locationState.kind !== 'at') return [];
    const settlementId = c.locationState.settlementId;
    const settlement = this.content.settlements.find((s) => s.id === settlementId);
    if (!settlement) return [];
    const skillById = new Map(this.content.skills.map((s) => [s.id, s]));
    return this.content.activities
      .filter((a) => a.settlementTags.some((t) => settlement.activityTags.includes(t)))
      .map((a) => {
        const skill = skillById.get(a.skillId)!;
        const state = c.skills[a.skillId] ?? { xp: 0, level: 1 };
        const currentTier = tierForLevel(skill, levelForXp(skill.xpCurve, state.xp));
        const lockReasons: import('@tradewright/contract').ActivityLockReason[] = [];
        if (currentTier < a.tier) {
          lockReasons.push({
            code: 'TIER_LOCKED',
            requiredTier: a.tier,
            skillId: a.skillId,
            currentTier,
          });
        }
        if (a.stationFamily) {
          const stationTier = effectiveStationTier(this.content, settlementId, a.stationFamily);
          if (stationTier < a.tier) {
            lockReasons.push({
              code: 'STATION_TIER_LOW',
              stationFamily: a.stationFamily,
              requiredTier: a.tier,
              effectiveTier: stationTier,
            });
          }
        }
        if (a.inputs.length > 0) {
          const missing = missingItems(this.save, settlementId, a.inputs);
          if (missing.length > 0) lockReasons.push({ code: 'INSUFFICIENT_INPUTS', missing });
        }
        return {
          activityId: a.id,
          skillId: a.skillId,
          tier: a.tier,
          actionSeconds: a.actionSeconds,
          inputs: a.inputs,
          outputs: a.outputs,
          xpPerAction: a.xpPerAction,
          locked: lockReasons.length > 0,
          lockReasons,
        };
      });
  }

  private characterView(): CharacterView | null {
    const c = this.save.character;
    if (!c) return null;
    const skillById = new Map(this.content.skills.map((s) => [s.id, s]));
    return {
      id: c.id,
      name: c.name,
      locationState: c.locationState,
      wallet: c.wallet,
      skills: Object.entries(c.skills).map(([skillId, s]) => {
        const def = skillById.get(skillId);
        const level = def ? levelForXp(def.xpCurve, s.xp) : s.level;
        return {
          skillId,
          xp: s.xp,
          level,
          tier: def ? tierForLevel(def, level) : 0,
          xpForNextLevel: def ? xpForLevelUp(def.xpCurve, level) : null,
        };
      }),
      assignment: c.assignment
        ? {
            activityId: c.assignment.activityId,
            settlementId: c.assignment.settlementId,
            startedAtTick: c.assignment.startedAtTick,
            nextActionAtTick:
              this.save.tick +
              Math.ceil(
                (activityDef(this.content, c.assignment.activityId).actionSeconds -
                  c.assignment.progressSeconds) /
                  this.content.world.worldTickSeconds,
              ),
            haltReason: c.assignment.haltReason,
            haltedAtTick: c.assignment.haltedAtTick,
          }
        : null,
      caravanSlotsTotal: c.caravanSlots,
      caravanSlotsBusy: this.save.shipments.filter(
        (s) => s.ownerId === c.id && s.status === 'in-transit',
      ).length,
      currentTick: this.save.tick,
    };
  }

  private storageView(settlementId: string): StorageView {
    const settlement = this.content.settlements.find((s) => s.id === settlementId);
    if (!settlement) throw new EngineError('NOT_FOUND', `unknown settlement ${settlementId}`);
    const storage = getStorage(this.save, settlementId);
    const itemById = new Map(this.content.items.map((i) => [i.id, i]));
    const capacityUsed = Object.entries(storage.slots).reduce(
      (sum, [itemId, qty]) => sum + (itemById.get(itemId)?.weight ?? 0) * qty,
      0,
    );
    const capacity =
      settlement.baseStorageCapacity +
      storage.expansionLevel * settlement.storageExpansion.capacityPerLevel;
    const storageFacility = settlement.facilities.find((f) => f.kind === 'storage');
    const capLevel = storageFacility?.baseTier ?? 0;
    const capReached = storage.expansionLevel >= capLevel;
    return {
      settlementId,
      slots: Object.entries(storage.slots)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => ({ itemId, qty })),
      capacityUsed,
      capacity,
      expansionLevel: storage.expansionLevel,
      nextExpansion: capReached
        ? null
        : {
            cost: Math.round(
              settlement.storageExpansion.costBase *
                Math.pow(settlement.storageExpansion.costGrowth, storage.expansionLevel),
            ),
            capacityGain: settlement.storageExpansion.capacityPerLevel,
          },
      expansionCapReached: capReached,
    };
  }

  subscribe(listener: (e: GameEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
