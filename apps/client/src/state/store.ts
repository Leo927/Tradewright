import { useSyncExternalStore } from 'react';
import type {
  ActivityView,
  CharacterView,
  EventSummaryView,
  GameEvent,
  MarketView,
  NotificationPrefsView,
  OrderView,
  RouteView,
  ShipmentView,
  StorageView,
  TransactionsPage,
} from '@tradewright/contract';
import { setTransport, transport } from '../transport/index.js';
import { createLocalTransport } from '../transport/local.js';
import { resolveInitialLocale } from '../i18n/locale.js';
import {
  ensureNotificationPermission,
  scheduleNotifications,
  clearScheduledNotifications,
  type PendingMoment,
} from '../notifications/scheduler.js';

export type ScreenId =
  | 'first-run'
  | 'create-character'
  | 'home'
  | 'activities'
  | 'crafting'
  | 'market'
  | 'map'
  | 'caravans'
  | 'storage'
  | 'transactions'
  | 'settings';

export interface AppState {
  phase: 'booting' | 'ready';
  locale: string;
  screen: ScreenId;
  character: CharacterView | null;
  activities: ActivityView[];
  storage: StorageView | null;
  summary: EventSummaryView | null;
  newlyUnlockedSkillIds: string[];
  marketSettlementId: string | null;
  market: MarketView | null;
  myOrders: OrderView[];
  transactions: TransactionsPage | null;
  routes: RouteView[];
  shipments: ShipmentView[];
  composerRouteId: string | null;
  notificationPrefs: NotificationPrefsView | null;
}

let state: AppState = {
  phase: 'booting',
  locale: 'en',
  screen: 'first-run',
  character: null,
  activities: [],
  storage: null,
  summary: null,
  newlyUnlockedSkillIds: [],
  marketSettlementId: null,
  market: null,
  myOrders: [],
  transactions: null,
  routes: [],
  shipments: [],
  composerRouteId: null,
  notificationPrefs: null,
};

const subscribers = new Set<() => void>();

function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  for (const fn of subscribers) fn();
}

export function getState(): AppState {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    () => state,
  );
}

export async function refreshCharacter(): Promise<void> {
  const character = await transport().query({ type: 'GetCharacter' });
  setState({ character });
}

export async function refreshActivities(): Promise<void> {
  const activities = await transport().query({ type: 'GetActivities' });
  setState({ activities });
}

export async function refreshStorage(): Promise<void> {
  const c = state.character;
  if (!c || c.locationState.kind !== 'at') {
    setState({ storage: null });
    return;
  }
  const storage = await transport().query({
    type: 'GetStorage',
    settlementId: c.locationState.settlementId,
  });
  setState({ storage });
}

export async function refreshMarket(settlementId?: string): Promise<void> {
  const id = settlementId ?? state.marketSettlementId;
  if (!id) return;
  const market = await transport().query({ type: 'GetMarket', settlementId: id });
  const myOrders = await transport().query({ type: 'GetMyOrders' });
  setState({ marketSettlementId: id, market, myOrders });
}

export async function refreshTransactions(offset = 0): Promise<void> {
  const transactions = await transport().query({ type: 'GetTransactions', offset, limit: 20 });
  setState({ transactions });
}

export async function refreshRoutes(): Promise<void> {
  const routes = await transport().query({ type: 'GetRoutes' });
  setState({ routes });
}

export async function refreshShipments(): Promise<void> {
  const shipments = await transport().query({ type: 'GetShipments' });
  setState({ shipments });
}

export async function refreshNotificationPrefs(): Promise<void> {
  const notificationPrefs = await transport().query({ type: 'GetNotificationPrefs' });
  setState({ notificationPrefs });
}

/** Best-effort V1: (re)schedule device notifications for opted-in categories
 *  from the moments visible in current state (FR-064, research R15). */
function rescheduleNotifications(): void {
  const character = state.character;
  const prefs = state.notificationPrefs?.categories ?? [];
  const optedIn = new Set(prefs.filter((c) => c.optedIn).map((c) => c.categoryId));
  if (!character || optedIn.size === 0) {
    clearScheduledNotifications();
    return;
  }
  const moments: PendingMoment[] = [];
  if (optedIn.has('caravan-arrival')) {
    for (const s of state.shipments) {
      if (s.status === 'in-transit') {
        moments.push({ categoryId: 'caravan-arrival', fireAtTick: s.arriveAtTick, settlementId: s.toSettlementId });
      }
    }
  }
  if (optedIn.has('order-filled-expired')) {
    for (const o of state.myOrders) {
      if (o.status === 'open' || o.status === 'partially-filled') {
        moments.push({ categoryId: 'order-filled-expired', fireAtTick: o.expiresAtTick, settlementId: o.settlementId });
      }
    }
  }
  scheduleNotifications(moments, {
    currentTick: character.currentTick,
    tickSeconds: character.tickSeconds,
    locale: state.locale,
  });
}

export async function refreshWorld(): Promise<void> {
  await refreshCharacter();
  await Promise.all([refreshActivities(), refreshStorage()]);
  if (state.screen === 'market') await refreshMarket();
  if (state.screen === 'transactions') await refreshTransactions(state.transactions?.offset ?? 0);
  if (state.screen === 'map') await refreshRoutes();
  if (state.screen === 'caravans') await Promise.all([refreshRoutes(), refreshShipments()]);
  rescheduleNotifications();
}

export async function setNotificationPrefAction(
  categoryId: string,
  optIn: boolean,
): Promise<void> {
  // The preference persists regardless of OS permission; permission is only
  // needed to actually deliver, so request it in the background (FR-064).
  await transport().send({ type: 'SetNotificationPref', categoryId, optIn });
  await refreshNotificationPrefs();
  if (optIn) {
    void ensureNotificationPermission().then(() => rescheduleNotifications());
  } else {
    rescheduleNotifications();
  }
}

let refreshQueued = false;

function queueRefresh(): void {
  if (refreshQueued) return;
  refreshQueued = true;
  setTimeout(() => {
    refreshQueued = false;
    void refreshWorld();
  }, 50);
}

function onGameEvent(e: GameEvent): void {
  switch (e.type) {
    case 'SkillLeveled':
      if (e.unlockedActivityIds.length > 0 && !state.newlyUnlockedSkillIds.includes(e.skillId)) {
        setState({ newlyUnlockedSkillIds: [...state.newlyUnlockedSkillIds, e.skillId] });
      }
      queueRefresh();
      break;
    case 'SummaryReady':
      setState({ summary: e.summary });
      queueRefresh();
      break;
    case 'ActionCompleted':
    case 'ActivityHalted':
    case 'WalletChanged':
    case 'StorageChanged':
    case 'TravelArrived':
    case 'CaravanArrived':
    case 'OrderFilled':
    case 'OrderPartiallyFilled':
    case 'OrderExpired':
    case 'OrderCancelled':
      queueRefresh();
      break;
    default:
      break;
  }
}

export async function boot(): Promise<void> {
  const { host, save } = await createLocalTransport();
  setTransport(host);
  host.subscribe(onGameEvent);
  const locale = resolveInitialLocale(save.settings.displayLocale);
  const character = await host.query({ type: 'GetCharacter' });
  const summary = await host.query({ type: 'GetSummary' });
  const notificationPrefs = await host.query({ type: 'GetNotificationPrefs' });
  setState({
    phase: 'ready',
    locale,
    character,
    summary,
    notificationPrefs,
    screen: character ? 'home' : 'first-run',
  });
  if (character) await refreshWorld();
  if (import.meta.env.DEV) {
    window.__twSetLocale = setLocale;
    window.__twWorldState = () => {
      const {
        settings: _settings,
        nextIds: _nextIds,
        lastSeenWallClock: _wall,
        lastMonotonicMark: _mono,
        ...world
      } = save;
      return JSON.stringify(world);
    };
  }
}

export function navigate(screen: ScreenId): void {
  if (screen === 'activities' || screen === 'crafting') {
    setState({ screen, newlyUnlockedSkillIds: [] });
    void refreshActivities();
    void refreshStorage();
    return;
  }
  if (screen === 'market') {
    const here =
      state.character?.locationState.kind === 'at'
        ? state.character.locationState.settlementId
        : null;
    setState({ screen });
    void refreshMarket(state.marketSettlementId ?? here ?? undefined);
    void refreshStorage();
    return;
  }
  if (screen === 'transactions') {
    setState({ screen });
    void refreshTransactions(0);
    return;
  }
  if (screen === 'settings') {
    setState({ screen });
    void refreshNotificationPrefs();
    return;
  }
  if (screen === 'storage') {
    setState({ screen });
    void refreshStorage();
    return;
  }
  if (screen === 'map') {
    setState({ screen });
    void refreshRoutes();
    return;
  }
  if (screen === 'caravans') {
    setState({ screen });
    void refreshStorage();
    void refreshRoutes();
    void refreshShipments();
    return;
  }
  setState({ screen });
}

/** Opening the composer for a route navigates to the caravans screen with that
 *  route preselected (the design's map → composer flow). */
export function openCaravanComposer(routeId: string): void {
  setState({ screen: 'caravans', composerRouteId: routeId });
  void refreshStorage();
  void refreshRoutes();
  void refreshShipments();
}

/** Locale switch is local-immediate (SC-012): re-render now, persist behind
 *  (the GUI never waits on the ack — protocol Part V). */
export function setLocale(localeId: string): void {
  setState({ locale: localeId });
  void transport().send({ type: 'SetDisplayLocale', localeId });
}

export async function createCharacterAction(
  name: string,
  startSettlementId: string,
): Promise<string | null> {
  const ack = await transport().send({ type: 'CreateCharacter', name, startSettlementId });
  if (!ack.accepted) return ack.code;
  await refreshWorld();
  setState({ screen: 'home' });
  return null;
}

export async function assignActivityAction(
  activityId: string,
  confirmReplace: boolean,
): Promise<string | null> {
  const ack = await transport().send({ type: 'AssignActivity', activityId, confirmReplace });
  if (!ack.accepted) return ack.code;
  await refreshWorld();
  setState({ screen: 'home' });
  return null;
}

export async function stopActivityAction(): Promise<void> {
  await transport().send({ type: 'StopActivity' });
  await refreshWorld();
}

export function selectMarketSettlement(settlementId: string): void {
  void refreshMarket(settlementId);
}

export interface PlaceOrderForm {
  settlementId: string;
  side: 'buy' | 'sell';
  itemId: string;
  qty: number;
  unitPrice: number;
  durationHours: number;
}

export async function placeOrderAction(form: PlaceOrderForm): Promise<string | null> {
  const ack = await transport().send({ type: 'PlaceOrder', ...form });
  if (!ack.accepted) return ack.code;
  await refreshWorld();
  await refreshMarket(form.settlementId);
  return null;
}

export async function cancelOrderAction(orderId: string): Promise<string | null> {
  const ack = await transport().send({ type: 'CancelOrder', orderId });
  if (!ack.accepted) return ack.code;
  await refreshWorld();
  await refreshMarket();
  return null;
}

export function collectSummaryAction(): void {
  setState({ summary: null });
  void transport().send({ type: 'CollectSummary' });
}

export async function travelToAction(
  routeId: string,
  confirmHaltAssignment: boolean,
): Promise<string | null> {
  const ack = await transport().send({ type: 'TravelTo', routeId, confirmHaltAssignment });
  if (!ack.accepted) return ack.code;
  await refreshWorld();
  return null;
}

export async function expandStorageAction(settlementId: string): Promise<string | null> {
  const ack = await transport().send({ type: 'ExpandStorage', settlementId });
  if (!ack.accepted) return ack.code;
  await refreshWorld();
  await refreshStorage();
  return null;
}

export interface DispatchCaravanForm {
  routeId: string;
  manifest: { itemId: string; qty: number }[];
  mitigation: boolean;
}

export async function dispatchCaravanAction(form: DispatchCaravanForm): Promise<string | null> {
  const ack = await transport().send({ type: 'DispatchCaravan', ...form });
  if (!ack.accepted) return ack.code;
  setState({ composerRouteId: null });
  await refreshWorld();
  await Promise.all([refreshShipments(), refreshStorage()]);
  return null;
}

declare global {
  interface Window {
    __twSetLocale?: (localeId: string) => void;
    __twWorldState?: () => string;
  }
}
