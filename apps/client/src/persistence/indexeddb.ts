import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'tradewright';
const STORE = 'saves';
const KEY = 'main';

let db: Promise<IDBPDatabase> | null = null;

function database(): Promise<IDBPDatabase> {
  db ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore(STORE);
    },
  });
  return db;
}

export async function loadSaveJson(): Promise<string | null> {
  const d = await database();
  return ((await d.get(STORE, KEY)) as string | undefined) ?? null;
}

export async function persistSaveJson(json: string): Promise<void> {
  const d = await database();
  await d.put(STORE, json, KEY);
}

export async function clearSave(): Promise<void> {
  const d = await database();
  await d.delete(STORE, KEY);
}

/** Debounced autosave on mutation events + explicit save on tab hide (R7). */
export function wireAutosave(getJson: () => string): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    void persistSaveJson(getJson());
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 500);
  };
  const onHide = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', flush);
  autosaveSchedule = schedule;
  return () => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', flush);
    autosaveSchedule = null;
  };
}

let autosaveSchedule: (() => void) | null = null;

export function scheduleAutosave(): void {
  autosaveSchedule?.();
}
