/**
 * Static description of the "Ganz schön clever" score sheet.
 * Layout, bonuses and score tables follow the original Schmidt Spiele sheet.
 */

export type DieColor = 'white' | 'yellow' | 'green' | 'blue' | 'orange' | 'purple';
export type AreaColor = 'yellow' | 'blue' | 'green' | 'orange' | 'purple';

export const DIE_COLORS: readonly DieColor[] = ['white', 'yellow', 'green', 'blue', 'orange', 'purple'];
export const AREA_COLORS: readonly AreaColor[] = ['yellow', 'blue', 'green', 'orange', 'purple'];

export type Bonus =
  | { type: 'reroll' }
  | { type: 'plusOne' }
  | { type: 'fox' }
  /** Mark a box in the given colour ("any" = the black X of round 4: yellow, blue or green). */
  | { type: 'x'; color: 'yellow' | 'blue' | 'green' | 'any' }
  /** Write a number in the next box of the given area ("any" = the black 6 of round 4). */
  | { type: 'number'; color: 'orange' | 'purple' | 'any'; value: number }
  /** Round 4: choose between a black X and a black 6. */
  | { type: 'roundFour' };

const reroll: Bonus = { type: 'reroll' };
const plusOne: Bonus = { type: 'plusOne' };
const fox: Bonus = { type: 'fox' };
const xYellow: Bonus = { type: 'x', color: 'yellow' };
const xBlue: Bonus = { type: 'x', color: 'blue' };
const xGreen: Bonus = { type: 'x', color: 'green' };
const orange4: Bonus = { type: 'number', color: 'orange', value: 4 };
const orange5: Bonus = { type: 'number', color: 'orange', value: 5 };
const orange6: Bonus = { type: 'number', color: 'orange', value: 6 };
const purple6: Bonus = { type: 'number', color: 'purple', value: 6 };

/** Yellow 4x4 grid, row-major. `null` cells are pre-printed crosses. */
export const YELLOW_GRID: readonly (number | null)[] = [
  3, 6, 5, null,
  2, 1, null, 5,
  1, null, 2, 4,
  null, 3, 4, 6,
];
export const YELLOW_ROW_BONUS: readonly Bonus[] = [xBlue, orange4, xGreen, fox];
export const YELLOW_COLUMN_POINTS: readonly number[] = [10, 14, 16, 20];
export const YELLOW_DIAGONAL_BONUS: Bonus = plusOne;
export const YELLOW_DIAGONAL_CELLS: readonly number[] = [0, 5, 10, 15];

/** Blue 3x4 grid, row-major, values 2..12. Top-left cell is empty. */
export const BLUE_GRID: readonly (number | null)[] = [
  null, 2, 3, 4,
  5, 6, 7, 8,
  9, 10, 11, 12,
];
export const BLUE_ROW_BONUS: readonly Bonus[] = [orange5, xYellow, fox];
export const BLUE_COLUMN_BONUS: readonly Bonus[] = [reroll, xGreen, purple6, plusOne];
/** Points for n blue marks (index = number of marks). */
export const BLUE_POINTS: readonly number[] = [0, 1, 2, 4, 7, 11, 16, 22, 29, 37, 46, 56];

export const GREEN_THRESHOLDS: readonly number[] = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 6];
/** Points for n green marks (index = number of marks). */
export const GREEN_POINTS: readonly number[] = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];
export const GREEN_BONUS: readonly (Bonus | null)[] = [
  null, null, null, plusOne, null, xBlue, fox, null, purple6, reroll, null,
];

export const ORANGE_MULTIPLIER: readonly number[] = [1, 1, 1, 2, 1, 1, 2, 1, 2, 1, 3];
export const ORANGE_BONUS: readonly (Bonus | null)[] = [
  null, null, reroll, null, xYellow, plusOne, null, fox, null, purple6, null,
];

export const PURPLE_BONUS: readonly (Bonus | null)[] = [
  null, null, reroll, xBlue, plusOne, xYellow, fox, reroll, xGreen, orange6, plusOne,
];

export const TRACK_LENGTH = 11;
export const ACTION_SLOTS = 7;

/** Bonus granted to every player at the start of each round (index = round - 1). */
export const ROUND_BONUS: readonly (Bonus | null)[] = [
  reroll,
  plusOne,
  reroll,
  { type: 'roundFour' },
  null,
  null,
];

export const ROUNDS_BY_PLAYER_COUNT: Record<number, number> = { 1: 6, 2: 6, 3: 5, 4: 4 };

export const SOLO_RATINGS: readonly { min: number; label: string }[] = [
  { min: 281, label: "You're so clever!" },
  { min: 260, label: 'Are you Einstein?' },
  { min: 240, label: 'What a genius!' },
  { min: 220, label: 'Impressive!' },
  { min: 200, label: "Hat's off to you!" },
  { min: 180, label: 'Great result!' },
  { min: 160, label: 'That was pretty good.' },
  { min: 140, label: 'Not bad... you could do better.' },
  { min: 0, label: 'Try harder!' },
];

export function soloRating(total: number): string {
  return SOLO_RATINGS.find((r) => total >= r.min)!.label;
}

export function describeBonus(b: Bonus): string {
  switch (b.type) {
    case 'reroll':
      return 'Re-roll';
    case 'plusOne':
      return '+1 die';
    case 'fox':
      return 'Fox';
    case 'x':
      return b.color === 'any' ? 'X (yellow, blue or green)' : `${b.color} X`;
    case 'number':
      return b.color === 'any' ? `${b.value} (orange or purple)` : `${b.color} ${b.value}`;
    case 'roundFour':
      return 'X or 6';
  }
}
