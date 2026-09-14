import type { DieColor } from './sheet';

export type GameMode = 'clever' | 'clever3';

/** Where the chosen die sits, which decides some placement rules (Clever hoch Drei). */
export interface PlacementContext {
  role: 'active' | 'passive';
  /** Die-field index (0..2) when the die counts as one of the active player's dice. */
  field: number | null;
  /** Real values of the other dice in the same group (die fields, or silver platter). */
  companions: number[];
}

export interface DieValues {
  /** Effective value of the chosen die (real, or pretended through an "any number" action). */
  value: number;
  /** Effective blue + white sum when the chosen die is blue or white. */
  blue: number;
  /** Real value of every die. */
  real: Record<DieColor, number>;
}

export interface AreaScore {
  key: string;
  points: number;
}

export interface Scores {
  areas: AreaScore[];
  foxes: number;
  foxPoints: number;
  total: number;
}

export interface AreaMeta {
  key: string;
  label: string;
  short: string;
  color: string;
}

export interface AnyNumberChoice {
  slot: number;
  /** Fixed number printed on the slot, or null for a free choice. */
  value: number | null;
}

/**
 * Everything that differs between the games of the series. The turn engine
 * (rolls, silver platter, passive picks, actions, rounds) is shared.
 */
export interface Variant<S = unknown, T = unknown, B = unknown> {
  id: GameMode;
  title: string;
  dieLabel: Record<DieColor, string>;
  areas: AreaMeta[];
  /** What happens when the active player cannot use a roll. */
  unusableRoll: 'takeDie' | 'forfeit';
  newSheet(): S;
  targets(sheet: S, color: DieColor, values: DieValues, ctx: PlacementContext): T[];
  /** Writes the die at `target`; returns triggered bonuses. */
  apply(sheet: S, target: T, values: DieValues, ctx: PlacementContext): B[];
  sameTarget(a: T, b: T): boolean;
  describeTarget(t: T): string;
  roundBonus(round: number): B | null;
  isChoice(b: B): boolean;
  /** Optional choices may be skipped by the player. */
  isOptional(b: B): boolean;
  bonusTargets(sheet: S, b: B, real: Record<DieColor, number>): T[];
  applyBonusAt(sheet: S, b: B, target: T): B[];
  applyAuto(sheet: S, b: B): B[];
  describeBonus(b: B): string;
  rerollsLeft(sheet: S): number;
  useReroll(sheet: S): void;
  plusOnesLeft(sheet: S): number;
  usePlusOne(sheet: S): void;
  anyNumberChoices(sheet: S): AnyNumberChoice[];
  useAnyNumber(sheet: S, slot: number): void;
  score(sheet: S): Scores;
  soloRating(total: number): string;
}

export function winners(scores: Scores[]): number[] {
  const best = Math.max(...scores.map((s) => s.total));
  let tied = scores.map((s, i) => (s.total === best ? i : -1)).filter((i) => i >= 0);
  if (tied.length > 1) {
    const bestArea = (s: Scores) => Math.max(...s.areas.map((a) => a.points));
    const top = Math.max(...tied.map((i) => bestArea(scores[i])));
    tied = tied.filter((i) => bestArea(scores[i]) === top);
  }
  return tied;
}
