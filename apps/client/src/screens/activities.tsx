import { useAppState } from '../state/store.js';
import { ActivityGroups } from './activity-list.js';

/** Work screen: gathering activities only (no inputs). Input-consuming recipes
 *  live on the Crafting screen (crafting design). */
export function ActivitiesScreen() {
  const { activities } = useAppState();
  return (
    <ActivityGroups
      activities={activities.filter((a) => a.inputs.length === 0)}
      dataScreen="activities"
      titleId="nav.activities"
    />
  );
}
