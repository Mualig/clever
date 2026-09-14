import type { DieColor } from './sheet';
import {
  ACTION_SLOTS2,
  B2_BONUS,
  B2_POINTS,
  G2_BONUS,
  G2_MULT,
  P2_BONUS,
  P2_MIN,
  ROW_END_BONUS2,
  SILVER_COL_BONUS,
  SILVER_ROW_POINTS,
  SILVER_ROWS,
  TRACK_LENGTH2,
  Y2_CELLS,
  Y2_COL_BONUS,
  Y2_POINTS,
  Y2_ROW_BONUS,
  type Area2,
  type Bonus2,
} from './sheet2';
import type { Scores } from './variant';

export interface Sheet2 {
  /** 4 rows (yellow, blue, green, pink) × 6 numbers. */
  silver: boolean[][];
  /** Per yellow cell (see Y2_CELLS): 0 = empty, 1 = circled, 2 = crossed. */
  yellow: number[];
  /** Written blue sums, left to right. */
  blue: number[];
  /** Written green values (already multiplied), left to right. */
  green: number[];
  /** Written pink numbers, left to right. */
  pink: number[];
  rerollsUnlocked: number;
  rerollsUsed: number;
  plusOnesUnlocked: number;
  plusOnesUsed: number;
  returnsUnlocked: number;
  returnsUsed: number;
}

export type Target2 =
  | { area: 'silver'; row: number; col: number }
  | { area: 'yellow'; cell: number }
  /** Blue + white sum (2..12). */
  | { area: 'blue'; value: number }
  /** Die number (1..6); the multiplied result is written. */
  | { area: 'green'; value: number }
  | { area: 'pink'; value: number };

export function newSheet2(): Sheet2 {
  return {
    silver: SILVER_ROWS.map(() => new Array(6).fill(false)),
    yellow: Y2_CELLS.map(() => 0),
    blue: [],
    green: [],
    pink: [],
    rerollsUnlocked: 0,
    rerollsUsed: 0,
    plusOnesUnlocked: 0,
    plusOnesUsed: 0,
    returnsUnlocked: 0,
    returnsUsed: 0,
  };
}

export function areaOfDie2(color: DieColor): Area2 | null {
  switch (color) {
    case 'yellow':
      return 'yellow';
    case 'green':
      return 'green';
    case 'blue':
      return 'blue';
    case 'orange':
      return 'silver';
    case 'purple':
      return 'pink';
    case 'white':
      return null;
  }
}

export const AREAS2: readonly Area2[] = ['silver', 'yellow', 'blue', 'green', 'pink'];

export function sameTarget2(a: Target2, b: Target2): boolean {
  if (a.area !== b.area) return false;
  switch (a.area) {
    case 'silver':
      return a.row === (b as typeof a).row && a.col === (b as typeof a).col;
    case 'yellow':
      return a.cell === (b as typeof a).cell;
    case 'blue':
    case 'green':
    case 'pink':
      return a.value === (b as typeof a).value;
  }
}

export function describeTarget2(t: Target2): string {
  switch (t.area) {
    case 'silver':
      return `silver ${t.col + 1} (${SILVER_ROWS[t.row]} row)`;
    case 'yellow':
      return `yellow ${Y2_CELLS[t.cell].value}`;
    case 'blue':
      return `blue ${t.value}`;
    case 'green':
      return `green ${t.value}`;
    case 'pink':
      return `pink ${t.value}`;
  }
}

// ---------------------------------------------------------------------------
// Legal targets
// ---------------------------------------------------------------------------

export function silverTargets(s: Sheet2, value: number): Target2[] {
  const col = value - 1;
  return SILVER_ROWS.flatMap((_, row) => (s.silver[row][col] ? [] : [{ area: 'silver' as const, row, col }]));
}

export function yellowTargets(s: Sheet2, value: number): Target2[] {
  return Y2_CELLS.flatMap((c, cell) => (c.value === value && s.yellow[cell] < 2 ? [{ area: 'yellow' as const, cell }] : []));
}

/** `value` is the blue + white sum (2..12). */
export function blueTargets(s: Sheet2, value: number): Target2[] {
  if (s.blue.length >= TRACK_LENGTH2) return [];
  if (s.blue.length > 0 && value > s.blue[s.blue.length - 1]) return [];
  return [{ area: 'blue', value }];
}

export function greenTargets(s: Sheet2, value: number): Target2[] {
  return s.green.length < TRACK_LENGTH2 ? [{ area: 'green', value }] : [];
}

export function pinkTargets(s: Sheet2, value: number): Target2[] {
  return s.pink.length < TRACK_LENGTH2 ? [{ area: 'pink', value }] : [];
}

/** Targets for writing die number `value` (blue uses `blueSum`) into `area`. */
export function areaTargets(s: Sheet2, area: Area2, value: number, blueSum: number): Target2[] {
  switch (area) {
    case 'silver':
      return silverTargets(s, value);
    case 'yellow':
      return yellowTargets(s, value);
    case 'blue':
      return blueTargets(s, blueSum);
    case 'green':
      return greenTargets(s, value);
    case 'pink':
      return pinkTargets(s, value);
  }
}

// ---------------------------------------------------------------------------
// Writing. Each function mutates the sheet and returns triggered bonuses.
// ---------------------------------------------------------------------------

export function silverColDone(s: Sheet2, col: number): boolean {
  return s.silver.every((row) => row[col]);
}

export function markSilver(s: Sheet2, row: number, col: number): Bonus2[] {
  if (s.silver[row][col]) throw new Error('silver number already marked');
  s.silver[row][col] = true;
  return silverColDone(s, col) ? [SILVER_COL_BONUS[col]] : [];
}

/** Whether every cell of yellow row `row` is at least circled. */
export function yellowRowDone(s: Sheet2, row: number): boolean {
  return Y2_CELLS.every((c, i) => c.row !== row || s.yellow[i] >= 1);
}

export function yellowColDone(s: Sheet2, col: number): boolean {
  return Y2_CELLS.every((c, i) => c.col !== col || s.yellow[i] >= 1);
}

export function markYellow(s: Sheet2, cell: number): Bonus2[] {
  if (s.yellow[cell] >= 2) throw new Error('yellow number already crossed');
  s.yellow[cell] += 1;
  if (s.yellow[cell] !== 1) return [];
  const { row, col } = Y2_CELLS[cell];
  const out: Bonus2[] = [];
  if (yellowRowDone(s, row)) out.push(Y2_ROW_BONUS[row]);
  if (yellowColDone(s, col)) out.push(Y2_COL_BONUS[col]);
  return out;
}

export function writeBlue(s: Sheet2, value: number): Bonus2[] {
  if (blueTargets(s, value).length === 0) throw new Error(`blue ${value} not allowed`);
  s.blue.push(value);
  const b = B2_BONUS[s.blue.length - 1];
  return b ? [b] : [];
}

export function writeGreen(s: Sheet2, value: number): Bonus2[] {
  const i = s.green.length;
  if (i >= TRACK_LENGTH2) throw new Error('green row full');
  s.green.push(value * G2_MULT[i]);
  const b = G2_BONUS[i];
  return b ? [b] : [];
}

export function pinkBonusEarned(s: Sheet2, i: number): boolean {
  const min = P2_MIN[i];
  return i < s.pink.length && !!P2_BONUS[i] && (min === null || s.pink[i] >= min);
}

export function writePink(s: Sheet2, value: number): Bonus2[] {
  const i = s.pink.length;
  if (i >= TRACK_LENGTH2) throw new Error('pink row full');
  s.pink.push(value);
  return pinkBonusEarned(s, i) ? [P2_BONUS[i]!] : [];
}

export function applyTarget2(s: Sheet2, t: Target2): Bonus2[] {
  switch (t.area) {
    case 'silver':
      return markSilver(s, t.row, t.col);
    case 'yellow':
      return markYellow(s, t.cell);
    case 'blue':
      return writeBlue(s, t.value);
    case 'green':
      return writeGreen(s, t.value);
    case 'pink':
      return writePink(s, t.value);
  }
}

// ---------------------------------------------------------------------------
// Bonuses and actions
// ---------------------------------------------------------------------------

export function isChoice2(b: Bonus2): boolean {
  return b.type === 'q' || b.type === 'sx';
}

export function isOptional2(b: Bonus2): boolean {
  return b.type === 'sx';
}

const NUMBERS = [1, 2, 3, 4, 5, 6];

/** Boxes a "?"-bonus (or extra silver mark) may be applied to. */
export function bonusTargets2(s: Sheet2, b: Bonus2): Target2[] {
  if (b.type === 'sx') return silverTargets(s, b.value);
  if (b.type !== 'q') return [];
  const forArea = (area: Area2): Target2[] => {
    switch (area) {
      case 'silver':
        return NUMBERS.flatMap((n) => silverTargets(s, n));
      case 'yellow':
        return NUMBERS.flatMap((n) => yellowTargets(s, n));
      case 'blue':
        return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap((n) => blueTargets(s, n));
      case 'green':
        return NUMBERS.flatMap((n) => greenTargets(s, n));
      case 'pink':
        return NUMBERS.flatMap((n) => pinkTargets(s, n));
    }
  };
  return b.color === 'any' ? AREAS2.flatMap(forArea) : forArea(b.color);
}

function unlockRow(s: Sheet2, key: 'reroll' | 'return' | 'plusOne'): Bonus2[] {
  const field = key === 'reroll' ? 'rerollsUnlocked' : key === 'plusOne' ? 'plusOnesUnlocked' : 'returnsUnlocked';
  if (s[field] >= ACTION_SLOTS2) return [];
  s[field] += 1;
  return s[field] === ACTION_SLOTS2 ? [ROW_END_BONUS2[key]] : [];
}

export function applyAuto2(s: Sheet2, b: Bonus2): Bonus2[] {
  switch (b.type) {
    case 'reroll':
    case 'return':
    case 'plusOne':
      return unlockRow(s, b.type);
    case 'fox':
      return [];
    case 'q':
    case 'sx':
      throw new Error('choice bonus');
  }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function silverScore2(s: Sheet2): number {
  return s.silver.reduce((sum, row) => sum + SILVER_ROW_POINTS[row.filter(Boolean).length], 0);
}

export function yellowCrossed(s: Sheet2): number {
  return s.yellow.filter((v) => v === 2).length;
}

export function yellowScore2(s: Sheet2): number {
  return Y2_POINTS[yellowCrossed(s)];
}

export function blueScore2(s: Sheet2): number {
  return B2_POINTS[s.blue.length];
}

/** Result of green pair `k` (0..5), or null while its second space is empty. */
export function greenPair(s: Sheet2, k: number): number | null {
  return s.green.length > 2 * k + 1 ? s.green[2 * k] - s.green[2 * k + 1] : null;
}

export function greenScore2(s: Sheet2): number {
  let sum = 0;
  for (let k = 0; k < TRACK_LENGTH2 / 2; k++) sum += greenPair(s, k) ?? 0;
  return sum;
}

export function pinkScore2(s: Sheet2): number {
  return s.pink.reduce((a, b) => a + b, 0);
}

export function foxCount2(s: Sheet2): number {
  let n = 0;
  if (silverColDone(s, SILVER_COL_BONUS.findIndex((b) => b.type === 'fox'))) n++;
  if (yellowColDone(s, Y2_COL_BONUS.findIndex((b) => b.type === 'fox'))) n++;
  if (s.blue.length > B2_BONUS.findIndex((b) => b?.type === 'fox')) n++;
  if (s.green.length > G2_BONUS.findIndex((b) => b?.type === 'fox')) n++;
  if (pinkBonusEarned(s, P2_BONUS.findIndex((b) => b?.type === 'fox'))) n++;
  if (s.rerollsUnlocked >= ACTION_SLOTS2) n++;
  return n;
}

export function score2(s: Sheet2): Scores {
  const areas = [
    { key: 'silver', points: silverScore2(s) },
    { key: 'yellow', points: yellowScore2(s) },
    { key: 'blue', points: blueScore2(s) },
    { key: 'green', points: greenScore2(s) },
    { key: 'pink', points: pinkScore2(s) },
  ];
  const foxes = foxCount2(s);
  const foxPoints = foxes * Math.min(...areas.map((a) => a.points));
  return { areas, foxes, foxPoints, total: areas.reduce((t, a) => t + a.points, 0) + foxPoints };
}
