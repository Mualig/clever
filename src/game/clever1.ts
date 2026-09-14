import {
  applyAutoBonus,
  applyBonusAt,
  applyTarget,
  areasForDie,
  bonusTargets,
  isChoiceBonus,
  legalTargets,
  newSheet,
  plusOnesLeft,
  rerollsLeft,
  sameTarget,
  scoreSheet,
} from './rules';
import { ROUND_BONUS, describeBonus, soloRating, type Bonus } from './sheet';
import type { Sheet, Target } from './types';
import type { Variant } from './variant';

/** The original "Ganz schön clever". */
export const clever1: Variant<Sheet, Target, Bonus> = {
  id: 'clever',
  title: 'Ganz schön clever',
  dieLabel: { white: 'white', yellow: 'yellow', green: 'green', blue: 'blue', orange: 'orange', purple: 'purple' },
  areas: [
    { key: 'yellow', label: 'Yellow', short: 'Y', color: '#f2c94c' },
    { key: 'blue', label: 'Blue', short: 'B', color: '#4f8fd9' },
    { key: 'green', label: 'Green', short: 'G', color: '#6ab04c' },
    { key: 'orange', label: 'Orange', short: 'O', color: '#f0932b' },
    { key: 'purple', label: 'Purple', short: 'P', color: '#9b59b6' },
  ],
  unusableRoll: 'takeDie',
  newSheet,
  targets(sheet, color, values) {
    return areasForDie(color).flatMap((area) => legalTargets(sheet, area, area === 'blue' ? values.blue : values.value));
  },
  apply(sheet, target, values) {
    return applyTarget(sheet, target, values.value);
  },
  sameTarget,
  describeTarget: (t) => t.area,
  roundBonus: (round) => ROUND_BONUS[round - 1] ?? null,
  isChoice: isChoiceBonus,
  isOptional: () => false,
  bonusTargets: (sheet, b) => bonusTargets(sheet, b),
  applyBonusAt,
  applyAuto: applyAutoBonus,
  describeBonus,
  rerollsLeft,
  useReroll: (s) => {
    s.rerollsUsed += 1;
  },
  plusOnesLeft,
  usePlusOne: (s) => {
    s.plusOnesUsed += 1;
  },
  anyNumberChoices: () => [],
  useAnyNumber: () => {
    throw new Error('no "any number" action in this game');
  },
  score(sheet) {
    const s = scoreSheet(sheet);
    return {
      areas: [
        { key: 'yellow', points: s.yellow },
        { key: 'blue', points: s.blue },
        { key: 'green', points: s.green },
        { key: 'orange', points: s.orange },
        { key: 'purple', points: s.purple },
      ],
      foxes: s.foxes,
      foxPoints: s.foxPoints,
      total: s.total,
    };
  },
  soloRating,
};
