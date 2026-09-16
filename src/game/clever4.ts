import {
  AREAS4,
  applyAuto4,
  applyTarget4,
  areaOfDie4,
  blueTargets,
  bonusTargets4,
  describeTarget4,
  greenTargets,
  greyTargets,
  isChoice4,
  isOptional4,
  newSheet4,
  pinkTargets,
  sameTarget4,
  score4,
  yellowTargets,
  type Sheet4,
  type Target4,
} from './rules4';
import { ROUND_BONUS4, SOLO_RATINGS4, describeBonus4, type Area4, type Bonus4 } from './sheet4';
import type { DieValues, Variant } from './variant';

function areaTargets(sheet: Sheet4, area: Area4, values: DieValues): Target4[] {
  switch (area) {
    case 'yellow':
      return yellowTargets(sheet, values.value);
    case 'blue':
      // Blue and white are combined as coordinates, whichever of the two was chosen.
      return blueTargets(sheet, values.effective.blue, values.effective.white);
    case 'grey':
      return greyTargets(sheet, values.value);
    case 'green':
      return greenTargets(sheet, values.value);
    case 'pink':
      return pinkTargets(sheet, values.value);
  }
}

/** "Clever 4Ever" (Ganz schön clever 4, 2022). */
export const clever4: Variant<Sheet4, Target4, Bonus4> = {
  id: 'clever4',
  title: 'Clever 4Ever',
  dieLabel: { white: 'white', yellow: 'yellow', green: 'green', blue: 'blue', orange: 'grey', purple: 'pink' },
  areas: [
    { key: 'yellow', label: 'Yellow', short: 'Y', color: '#e8b400' },
    { key: 'blue', label: 'Blue', short: 'B', color: '#1f8fd6' },
    { key: 'grey', label: 'Grey', short: 'Gr', color: '#7b7f86' },
    { key: 'green', label: 'Green', short: 'G', color: '#7cb82f' },
    { key: 'pink', label: 'Pink', short: 'P', color: '#ef6fa8' },
  ],
  unusableRoll: 'forfeit',
  newSheet: newSheet4,
  targets(sheet, color, values) {
    const area = areaOfDie4(color);
    const areas = area ? [area] : AREAS4;
    return areas.flatMap((a) => areaTargets(sheet, a, values));
  },
  apply: (sheet, target) => applyTarget4(sheet, target),
  sameTarget: sameTarget4,
  describeTarget: describeTarget4,
  roundBonus: (round) => ROUND_BONUS4[round - 1] ?? null,
  isChoice: isChoice4,
  isOptional: isOptional4,
  bonusTargets: (sheet, b) => bonusTargets4(sheet, b),
  applyBonusAt: (sheet, _b, target) => applyTarget4(sheet, target),
  applyAuto: applyAuto4,
  describeBonus: describeBonus4,
  rerollsLeft: (s) => s.rerollsUnlocked - s.rerollsUsed,
  useReroll: (s) => {
    s.rerollsUsed += 1;
  },
  plusOnesLeft: (s) => s.plusOnesUnlocked - s.plusOnesUsed,
  usePlusOne: (s) => {
    s.plusOnesUsed += 1;
  },
  returnsLeft: () => 0,
  useReturn: () => {
    throw new Error('no return action in this game');
  },
  anyNumberChoices: () => [],
  useAnyNumber: () => {
    throw new Error('no "any number" action in this game');
  },
  polishLeft: (s) => s.polishUnlocked - s.polishUsed,
  usePolish: (s, steps) => {
    if (steps > s.polishUnlocked - s.polishUsed) throw new Error('not enough polish actions');
    s.polishUsed += steps;
  },
  score: score4,
  soloRating: (total) => SOLO_RATINGS4.find((r) => total >= r.min)!.label,
};
