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
import { EngineError } from '../world/ledger.js';
import { createCharacter } from '../world/character.js';
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

  /** Run catch-up on host boot, before the first query (T070). */
  start(): void {
    this.pump();
  }

  /** Advance world time to the host clock. Residual sub-tick time stays
   *  anchored so no seconds are lost between pumps. */
  pump(): void {
    const save = this.save;
    const now = this.opts.clock.now();
    if (save.lastSeenWallClock === null) {
      save.lastSeenWallClock = now;
      this.mutated();
      return;
    }
    const elapsedSeconds = Math.max(0, (now - save.lastSeenWallClock) / 1000);
    const tickSeconds = this.content.world.worldTickSeconds;
    if (elapsedSeconds < tickSeconds) return;
    const result = fastForward(save, elapsedSeconds, this.ctx);
    save.lastSeenWallClock = result.capped
      ? now
      : save.lastSeenWallClock + result.ticksRun * tickSeconds * 1000;
    if (result.ticksRun > 0) this.mutated();
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
        return [];
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
          effectiveTier: f.baseTier,
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
            nextActionAtTick: this.save.tick,
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
