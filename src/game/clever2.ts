import {
  AREAS2,
  applyAuto2,
  applyTarget2,
  areaOfDie2,
  areaTargets,
  bonusTargets2,
  describeTarget2,
  isChoice2,
  isOptional2,
  newSheet2,
  sameTarget2,
  score2,
  silverRowFor,
  type Sheet2,
  type Target2,
} from './rules2';
import { ROUND_BONUS2, SOLO_RATINGS2, describeBonus2, type Bonus2 } from './sheet2';
import type { Variant } from './variant';

/** "Doppelt so clever" / "Twice as Clever" (2019). */
export const clever2: Variant<Sheet2, Target2, Bonus2> = {
  id: 'clever2',
  title: 'Doppelt so clever',
  dieLabel: { white: 'white', yellow: 'yellow', green: 'green', blue: 'blue', orange: 'silver', purple: 'pink' },
  areas: [
    { key: 'silver', label: 'Silver', short: 'S', color: '#8e9299' },
    { key: 'yellow', label: 'Yellow', short: 'Y', color: '#e6b422' },
    { key: 'blue', label: 'Blue', short: 'B', color: '#2f5bd7' },
    { key: 'green', label: 'Green', short: 'G', color: '#6cb33f' },
    { key: 'pink', label: 'Pink', short: 'P', color: '#e9679f' },
  ],
  unusableRoll: 'forfeit',
  newSheet: newSheet2,
  targets(sheet, color, values) {
    const area = areaOfDie2(color);
    const areas = area ? [area] : AREAS2;
    return areas.flatMap((a) => areaTargets(sheet, a, values.value, values.blue));
  },
  apply(sheet, target, _values, ctx) {
    const bonuses = applyTarget2(sheet, target);
    // Dice swept onto the silver platter by the silver die may also be marked in the silver
    // area, each in the row of its own colour (white and silver go in any row).
    if (target.area === 'silver') for (const d of ctx.swept) bonuses.push({ type: 'sx', value: d.value, row: silverRowFor(d.color) });
    return bonuses;
  },
  sameTarget: sameTarget2,
  describeTarget: describeTarget2,
  roundBonus: (round) => ROUND_BONUS2[round - 1] ?? null,
  isChoice: isChoice2,
  isOptional: isOptional2,
  bonusTargets: (sheet, b) => bonusTargets2(sheet, b),
  applyBonusAt: (sheet, _b, target) => applyTarget2(sheet, target),
  applyAuto: applyAuto2,
  describeBonus: describeBonus2,
  rerollsLeft: (s) => s.rerollsUnlocked - s.rerollsUsed,
  useReroll: (s) => {
    s.rerollsUsed += 1;
  },
  plusOnesLeft: (s) => s.plusOnesUnlocked - s.plusOnesUsed,
  usePlusOne: (s) => {
    s.plusOnesUsed += 1;
  },
  returnsLeft: (s) => s.returnsUnlocked - s.returnsUsed,
  useReturn: (s) => {
    s.returnsUsed += 1;
  },
  anyNumberChoices: () => [],
  useAnyNumber: () => {
    throw new Error('no "any number" action in this game');
  },
  polishLeft: () => 0,
  usePolish: () => {
    throw new Error('no polish action in this game');
  },
  score: score2,
  soloRating: (total) => SOLO_RATINGS2.find((r) => total >= r.min)!.label,
};
