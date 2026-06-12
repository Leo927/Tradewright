import type { SaveGame } from '../world/state.js';
import type { TickContext } from '../simulation/tick.js';

/** Per-tick action resolution lands with US1 (T058). */
export function resolveActivityTick(_save: SaveGame, _ctx: TickContext): void {}
