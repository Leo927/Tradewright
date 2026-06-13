import {
  LocalGameHost,
  createSave,
  loadSave,
  serializeSave,
  launchContent,
  getStorage,
  type SaveGame,
} from '@tradewright/engine';
import locales from '@tradewright/content/text/locales.json';
import { loadSaveJson, wireAutosave, scheduleAutosave } from '../persistence/indexeddb.js';
import { createClientClock } from './test-clock.js';
import { probeNetworkTime } from './time-probe.js';

export interface LocalBoot {
  host: LocalGameHost;
  save: SaveGame;
}

/** Binds LocalGameHost in-process — the Principle V transport-adapter
 *  exception; everything else in the client sees only `GameTransport`. */
export async function createLocalTransport(): Promise<LocalBoot> {
  const json = await loadSaveJson();
  let save: SaveGame;
  if (json) {
    try {
      save = loadSave(json, launchContent);
    } catch {
      save = createSave(launchContent, newWorldSeed());
    }
  } else {
    save = createSave(launchContent, newWorldSeed());
  }

  const host = new LocalGameHost({
    clock: createClientClock(() => host.pump()),
    save,
    supportedLocaleIds: locales.map((l) => l.id),
    onMutate: () => scheduleAutosave(),
  });

  wireAutosave(() => serializeSave(save));
  host.start();
  window.setInterval(() => host.pump(), 1000);
  void probeNetworkTime();
  if (import.meta.env.DEV) {
    window.__twFlushSave = async () => {
      const { persistSaveJson } = await import('../persistence/indexeddb.js');
      await persistSaveJson(serializeSave(save));
    };
    // E2E-only: seed raw materials into a settlement's storage so produce-chain
    // flows (US3) can start from owned inputs without scripting every gather.
    window.__twGrant = (settlementId, itemId, qty) => {
      const storage = getStorage(save, settlementId);
      storage.slots[itemId] = (storage.slots[itemId] ?? 0) + qty;
    };
  }
  return { host, save };
}

function newWorldSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) | 0;
}

declare global {
  interface Window {
    __twFlushSave?: () => Promise<void>;
    __twGrant?: (settlementId: string, itemId: string, qty: number) => void;
  }
}
