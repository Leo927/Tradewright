import { content } from './index.js';
import { loadTextTree, loadRawData } from './loader.js';
import { generatePseudoLocales } from './gen-pseudo.js';
import {
  checkReferentialIntegrity,
  checkRecipeDag,
  checkInputsObtainable,
  checkTier1GatheringEverywhere,
  checkRouteGraphConnected,
  checkAsymmetryBudget,
  checkTierCoverage,
  checkNpcSanity,
  checkRouteDurations,
  checkSkillFamilyCounts,
  checkDenylist,
  checkTextGates,
  checkNoDisplayTextInData,
} from './gates.js';
import denylist from '../tests/denylist.json';

generatePseudoLocales();
const tree = loadTextTree();
const rawData = loadRawData();

const errors: string[] = [
  ...checkReferentialIntegrity(content),
  ...checkRecipeDag(content),
  ...checkInputsObtainable(content),
  ...checkTier1GatheringEverywhere(content),
  ...checkRouteGraphConnected(content),
  ...checkAsymmetryBudget(content),
  ...checkTierCoverage(content),
  ...checkNpcSanity(content),
  ...checkRouteDurations(content),
  ...checkSkillFamilyCounts(content),
  ...checkDenylist(tree, denylist),
  ...checkNoDisplayTextInData(rawData),
];
const textReport = checkTextGates(tree, content);
errors.push(...textReport.errors);

for (const warning of textReport.warnings) console.warn(`warning: ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(`\ncontent validation FAILED with ${errors.length} error(s)`);
  process.exit(1);
}
console.log(
  `content validation OK (contentVersion ${content.contentVersion}, ` +
    `${content.activities.length} activities, ${tree.locales.length} locales)`,
);
