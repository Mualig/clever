/**
 * Static description of the "Clever hoch Drei" (Clever Cubed) score sheet.
 * Dice: white (wild), yellow, turquoise, blue, brown, pink. Internally the
 * engine keeps the base game's colour ids: green = turquoise, orange = brown,
 * purple = pink.
 */

export type Area3 = 'yellow' | 'turquoise' | 'blue' | 'brown' | 'pink';

export type Bonus3 =
  | { type: 'reroll' }
  | { type: 'plusOne' }
  | { type: 'anyNumber' }
  | { type: 'fox' }
  /** "?"-bonus: choose a number 1–6 and write it in the area as if rolled ("any" = black ?). */
  | { type: 'q'; color: Area3 | 'any' }
  /** Optional extra turquoise cross of the given number (matching dice). */
  | { type: 'tx'; value: number };

const reroll: Bonus3 = { type: 'reroll' };
const plusOne: Bonus3 = { type: 'plusOne' };
const anyNumber: Bonus3 = { type: 'anyNumber' };
const fox: Bonus3 = { type: 'fox' };
const qYellow: Bonus3 = { type: 'q', color: 'yellow' };
const qTurq: Bonus3 = { type: 'q', color: 'turquoise' };
const qBlue: Bonus3 = { type: 'q', color: 'blue' };
const qBrown: Bonus3 = { type: 'q', color: 'brown' };
const qPink: Bonus3 = { type: 'q', color: 'pink' };
const qAny: Bonus3 = { type: 'q', color: 'any' };

// Yellow: 3 rows (I, II, III) of 1..6. Grey cells are the only ones passive players may cross.
export const Y3_GREY: readonly (readonly boolean[])[] = [
  [false, false, false, false, true, true],
  [false, false, true, true, false, false],
  [true, true, false, false, false, false],
];
/** Bonus between row g and g+1 in each column, gained when both cells are crossed. */
export const Y3_GAP_BONUS: readonly (readonly Bonus3[])[] = [
  [reroll, anyNumber, qPink, plusOne, qTurq, fox],
  [anyNumber, qTurq, qBlue, qBrown, qYellow, plusOne],
];
/** Points per row for n crosses. */
export const Y3_ROW_POINTS: readonly number[] = [0, 2, 6, 12, 20, 30, 42];

// Turquoise: 5 rows of 1..6. Only the first T3_COLORED[row] cells of a row count for bonuses.
export const T3_COLORED: readonly number[] = [6, 5, 3, 2, 1];
export const T3_ROW_BONUS: readonly (Bonus3 | null)[] = [fox, plusOne, qBrown, qTurq, null];
export const T3_COL_BONUS: readonly Bonus3[] = [qBrown, qPink, qYellow, anyNumber, qBlue, reroll];
export const T3_ROW_POINTS: readonly number[] = [0, 1, 3, 6, 10, 15, 21];

// Blue: 13 fields, 7 printed in the middle; 6 to the left (-1 each), 6 to the right (+1 each).
export const B3_SIDE = 6;
/** Points of the outermost written field, by distance from the middle (1..6). */
export const B3_POINTS: readonly number[] = [0, 3, 6, 9, 13, 17, 22];
/** Bonus under each of the 13 fields, left to right. */
export const B3_BONUS: readonly (Bonus3 | null)[] = [
  plusOne, qPink, null, qYellow, anyNumber, null,
  null,
  null, reroll, qBrown, null, qTurq, fox,
];
export const B3_EXTRA_POINTS = 4;
export const B3_EXTRA_LOW = 4;
export const B3_EXTRA_HIGH = 10;

// Brown: 12 printed numbers, crossed strictly left to right (skipping allowed).
export const BR3_NUMBERS: readonly number[] = [1, 5, 3, 4, 2, 6, 4, 5, 2, 1, 6, 3];
/** Bonus between field i and i+1, gained when both are crossed. */
export const BR3_GAP_BONUS: readonly (Bonus3 | null)[] = [anyNumber, qPink, null, reroll, qTurq, null, plusOne, qBlue, null, qYellow, fox];
export const BR3_POINTS: readonly number[] = [0, 2, 5, 9, 14, 20, 27, 35, 44, 54, 65, 77, 90];

// Pink: 12 fields. Field 0 always takes half the die; others: half + bonus, or die × multiplier.
export const P3_MULT: readonly number[] = [0, 1, 2, 2, 1, 2, 2, 1, 3, 2, 2, 3];
export const P3_BONUS: readonly (Bonus3 | null)[] = [null, reroll, qBlue, plusOne, anyNumber, qYellow, qBrown, reroll, fox, qBlue, qTurq, qAny];

export const ACTION_SLOTS3 = 7;
/** Printed numbers on the "any number" action slots (null = free choice). */
export const ANY_NUMBER_SLOTS: readonly (number | null)[] = [3, 4, 5, 6, null, null, null];
/** Bonus gained when the 7th slot of an action row is unlocked. */
export const ROW_END_BONUS: Record<'reroll' | 'anyNumber' | 'plusOne', Bonus3> = { reroll: fox, anyNumber: qPink, plusOne: qBrown };

export const ROUND_BONUS3: readonly (Bonus3 | null)[] = [reroll, plusOne, anyNumber, qAny, null, null];

export const SOLO_RATINGS3: readonly { min: number; label: string }[] = [
  { min: 450, label: 'Clever Cubed!' },
  { min: 420, label: 'Beautiful AND clever!' },
  { min: 390, label: 'Hello Mr. Hawking!' },
  { min: 360, label: 'Reaching for the stars' },
  { min: 330, label: "That's pretty clever!" },
  { min: 300, label: 'You are a prodigy' },
  { min: 270, label: "It's going up" },
  { min: 240, label: 'Not too shabby' },
  { min: 210, label: 'You can still improve' },
  { min: 180, label: 'It was just bad luck' },
  { min: 0, label: "Let's talk about something else" },
];

export function describeBonus3(b: Bonus3): string {
  switch (b.type) {
    case 'reroll':
      return 'Re-roll';
    case 'plusOne':
      return '+1 die';
    case 'anyNumber':
      return 'Any number';
    case 'fox':
      return 'Fox';
    case 'q':
      return b.color === 'any' ? '? (any colour)' : `${b.color} ?`;
    case 'tx':
      return `extra turquoise ${b.value}`;
  }
}
