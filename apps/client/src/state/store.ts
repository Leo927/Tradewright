import { useSyncExternalStore } from 'react';
import type { CharacterView, GameEvent } from '@tradewright/contract';
import { setTransport, transport } from '../transport/index.js';
import { createLocalTransport } from '../transport/local.js';
import { resolveInitialLocale } from '../i18n/locale.js';

export type ScreenId =
  | 'first-run'
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
}

let state: AppState = {
  phase: 'booting',
  locale: 'en',
  screen: 'first-run',
  character: null,
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

function onGameEvent(e: GameEvent): void {
  switch (e.type) {
    case 'WalletChanged':
    case 'SkillLeveled':
    case 'ActionCompleted':
    case 'ActivityHalted':
    case 'TravelArrived':
      void refreshCharacter();
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
  setState({
    phase: 'ready',
    locale,
    character,
    screen: character ? 'home' : 'first-run',
  });
}

export function navigate(screen: ScreenId): void {
  setState({ screen });
}

/** Locale switch is local-immediate (SC-012): re-render now, persist behind
 *  (the GUI never waits on the ack — protocol Part V). */
export function setLocale(localeId: string): void {
  setState({ locale: localeId });
  void transport().send({ type: 'SetDisplayLocale', localeId });
}
