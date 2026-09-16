import {
  AREAS3,
  anyNumberChoices3,
  applyAuto3,
  applyTarget3,
  areaOfDie3,
  areaTargets,
  bonusTargets3,
  describeTarget3,
  isChoice3,
  isOptional3,
  newSheet3,
  sameTarget3,
  score3,
  turquoiseTargets,
  type Sheet3,
  type Target3,
} from './rules3';
import { ROUND_BONUS3, SOLO_RATINGS3, describeBonus3, type Bonus3 } from './sheet3';
import type { Variant } from './variant';

/** "Clever hoch Drei" / "Clever Cubed" (Ganz schön clever 3). */
export const clever3: Variant<Sheet3, Target3, Bonus3> = {
  id: 'clever3',
  title: 'Clever hoch Drei',
  dieLabel: { white: 'white', yellow: 'yellow', green: 'turquoise', blue: 'blue', orange: 'brown', purple: 'pink' },
  areas: [
    { key: 'yellow', label: 'Yellow', short: 'Y', color: '#e3b23c' },
    { key: 'turquoise', label: 'Turquoise', short: 'T', color: '#2a9d8f' },
    { key: 'blue', label: 'Blue', short: 'B', color: '#3f51b5' },
    { key: 'brown', label: 'Brown', short: 'Br', color: '#a0785a' },
    { key: 'pink', label: 'Pink', short: 'P', color: '#e85d9a' },
  ],
  unusableRoll: 'forfeit',
  newSheet: newSheet3,
  targets(sheet, color, values, ctx) {
    const area = areaOfDie3(color);
    const areas = area ? [area] : AREAS3;
    return areas.flatMap((a) => areaTargets(sheet, a, values.value, values.blue, ctx));
  },
  apply(sheet, target, values, ctx) {
    const bonuses = applyTarget3(sheet, target);
    if (target.area === 'turquoise') {
      // Every other die of the same group showing the same number allows one more cross.
      const extras = ctx.companions.filter((v) => v === values.value).length;
      for (let i = 0; i < extras; i++) if (turquoiseTargets(sheet, values.value).length > 0) bonuses.push({ type: 'tx', value: values.value });
    }
    return bonuses;
  },
  sameTarget: sameTarget3,
  describeTarget: describeTarget3,
  roundBonus: (round) => ROUND_BONUS3[round - 1] ?? null,
  isChoice: isChoice3,
  isOptional: isOptional3,
  bonusTargets: (sheet, b, real) => bonusTargets3(sheet, b, real.white),
  applyBonusAt: (sheet, _b, target) => applyTarget3(sheet, target),
  applyAuto: applyAuto3,
  describeBonus: describeBonus3,
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
  anyNumberChoices: anyNumberChoices3,
  useAnyNumber: (s, slot) => {
    if (slot >= s.anyUnlocked || s.anyUsed[slot]) throw new Error('action not available');
    s.anyUsed[slot] = true;
  },
  polishLeft: () => 0,
  usePolish: () => {
    throw new Error('no polish action in this game');
  },
  score: score3,
  soloRating: (total) => SOLO_RATINGS3.find((r) => total >= r.min)!.label,
};
