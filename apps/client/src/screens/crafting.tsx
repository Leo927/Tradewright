import { useAppState } from '../state/store.js';
import { ActivityGroups } from './activity-list.js';

/** Crafting screen (US3): every input-consuming activity — refining and
 *  crafting — grouped by skill, with tier/station/missing-input lock chips and
 *  the shared confirm sheet (crafting design). */
export function CraftingScreen() {
  const { activities } = useAppState();
  return (
    <ActivityGroups
      activities={activities.filter((a) => a.inputs.length > 0)}
      dataScreen="crafting"
      titleId="nav.crafting"
    />
  );
}
