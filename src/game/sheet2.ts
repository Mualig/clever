/**
 * Static description of the "Doppelt so clever" (Twice as Clever) score sheet.
 * Dice: white (wild), yellow, blue, green, pink, silver. Internally the engine
 * keeps the base game's colour ids: orange = silver, purple = pink.
 * Transcribed from the official English rulebook (Schmidt Spiele, 2019).
 */

export type Area2 = 'silver' | 'yellow' | 'blue' | 'green' | 'pink';

export type Bonus2 =
  | { type: 'reroll' }
  | { type: 'plusOne' }
  /** Return action: take a die back from the silver platter into the next roll. */
  | { type: 'return' }
  | { type: 'fox' }
  /** "?"-bonus: write any number in the area ("any" = black ?, free choice of area). */
  | { type: 'q'; color: Area2 | 'any' }
  /**
   * Optional extra silver mark for a die swept onto the platter by the silver die.
   * `row` is the silver row the die's colour forces; null for the wild white and
   * silver dice, which may be marked in any row.
   */
  | { type: 'sx'; value: number; row: number | null };

const reroll: Bonus2 = { type: 'reroll' };
const plusOne: Bonus2 = { type: 'plusOne' };
const ret: Bonus2 = { type: 'return' };
const fox: Bonus2 = { type: 'fox' };
const qSilver: Bonus2 = { type: 'q', color: 'silver' };
const qYellow: Bonus2 = { type: 'q', color: 'yellow' };
const qBlue: Bonus2 = { type: 'q', color: 'blue' };
const qGreen: Bonus2 = { type: 'q', color: 'green' };
const qPink: Bonus2 = { type: 'q', color: 'pink' };
const qAny: Bonus2 = { type: 'q', color: 'any' };

// Silver: 4 coloured rows (yellow, blue, green, pink) of 1..6. A silver die marks its
// number in any row. Completing a column gives the bonus above it; rows score by count.
export const SILVER_ROWS: readonly Exclude<Area2, 'silver'>[] = ['yellow', 'blue', 'green', 'pink'];
export const SILVER_COL_BONUS: readonly Bonus2[] = [plusOne, qYellow, fox, qBlue, qGreen, qPink];
export const SILVER_ROW_POINTS: readonly number[] = [0, 2, 4, 7, 11, 16, 22];

// Yellow: 10 numbers on a staggered 5 × 4 lattice. A yellow die first circles its
// number, a second one crosses it. Lines completed with circles give bonuses; only
// crosses score.
export interface YellowCell2 {
  row: number;
  col: number;
  value: number;
}
export const Y2_CELLS: readonly YellowCell2[] = [
  { row: 0, col: 1, value: 3 },
  { row: 0, col: 3, value: 6 },
  { row: 1, col: 0, value: 1 },
  { row: 1, col: 2, value: 2 },
  { row: 2, col: 1, value: 4 },
  { row: 2, col: 3, value: 3 },
  { row: 3, col: 0, value: 2 },
  { row: 3, col: 2, value: 5 },
  { row: 4, col: 1, value: 5 },
  { row: 4, col: 3, value: 4 },
];
export const Y2_ROWS = 5;
export const Y2_COLS = 4;
export const Y2_ROW_BONUS: readonly Bonus2[] = [qBlue, ret, qYellow, qGreen, qPink];
export const Y2_COL_BONUS: readonly Bonus2[] = [reroll, plusOne, qSilver, fox];
/** Points for n crossed numbers. */
export const Y2_POINTS: readonly number[] = [0, 3, 10, 21, 36, 55, 75, 96, 118, 141, 165];

// Blue: 12 spaces, blue + white, each number ≤ the previous one.
export const B2_POINTS: readonly number[] = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78];
export const B2_BONUS: readonly (Bonus2 | null)[] = [null, ret, qYellow, null, plusOne, reroll, qPink, null, fox, ret, null, qGreen];

// Green: 12 spaces in 6 pairs; die × multiplier is written, each pair scores first − second.
export const G2_MULT: readonly number[] = [2, 2, 2, 1, 3, 3, 3, 2, 3, 1, 4, 1];
export const G2_BONUS: readonly (Bonus2 | null)[] = [null, reroll, null, qBlue, ret, null, fox, qSilver, plusOne, null, qPink, qYellow];

// Pink: 12 spaces, any number; the bonus below needs the printed minimum.
export const P2_MIN: readonly (number | null)[] = [null, null, 2, 3, 4, 5, 6, 2, 3, 4, 5, 6];
export const P2_BONUS: readonly (Bonus2 | null)[] = [null, null, reroll, ret, plusOne, qGreen, qYellow, fox, qSilver, reroll, qBlue, qYellow];

export const TRACK_LENGTH2 = 12;
export const ACTION_SLOTS2 = 6;
/** Bonus gained when the 6th slot of an action row is unlocked. */
export const ROW_END_BONUS2: Record<'reroll' | 'return' | 'plusOne', Bonus2> = { reroll: fox, return: qPink, plusOne: qSilver };

export const ROUND_BONUS2: readonly (Bonus2 | null)[] = [reroll, plusOne, ret, qAny, null, null];

export const SOLO_RATINGS2: readonly { min: number; label: string }[] = [
  { min: 320, label: 'Twice as clever!' },
  { min: 300, label: 'Points = IQ!' },
  { min: 280, label: 'Respect!' },
  { min: 260, label: "This can't be luck!" },
  { min: 240, label: 'People, look at this!' },
  { min: 220, label: 'Pretty, pretty clever!' },
  { min: 200, label: "You've been training!" },
  { min: 180, label: 'You should be happy!' },
  { min: 160, label: 'On the right way.' },
  { min: 140, label: 'You can do better.' },
  { min: -Infinity, label: 'Half as clever.' },
];

export function describeBonus2(b: Bonus2): string {
  switch (b.type) {
    case 'reroll':
      return 'Re-roll';
    case 'plusOne':
      return '+1 die';
    case 'return':
      return 'Return';
    case 'fox':
      return 'Fox';
    case 'q':
      return b.color === 'any' ? '? (any colour)' : `${b.color} ?`;
    case 'sx':
      return b.row === null ? `extra silver ${b.value} (any row)` : `extra silver ${b.value} (${SILVER_ROWS[b.row]} row)`;
  }
}
