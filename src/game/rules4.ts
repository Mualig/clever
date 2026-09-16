import type { DieColor } from './sheet';
import {
  B4_ANTI_POINTS,
  B4_COL_POINTS,
  B4_DIAG_BONUS,
  B4_ROW_BONUS,
  G4_CELL_BONUS,
  G4_COLS,
  G4_PARTS,
  G4_ROWS,
  G4_COL_POINTS,
  G4_SHADES,
  GR4_BONUS,
  GR4_DOUBLE_FROM,
  GR4_FIELDS,
  P4_BONUS,
  P4_CIRCLE_POINTS,
  P4_POINTS,
  PLUS_ONE_SLOTS4,
  POLISH_SLOTS4,
  REROLL_SLOTS4,
  ROW_END_BONUS4,
  Y4_BONUS,
  Y4_COL_POINTS,
  Y4_COLS,
  type Area4,
  type Bonus4,
  type Shade,
} from './sheet4';
import type { Scores } from './variant';

export interface Sheet4 {
  /** 3 rows of written numbers, left to right (row 0 ascending, row 1 negative, row 2 positive). */
  yellow: number[][];
  /** 6×6 crosses: blue[blueDie - 1][whiteDie - 1]. */
  blue: boolean[][];
  /** 4×16 crosses, row-major. */
  grey: boolean[];
  /** Numbers in the upper triangles, left to right. */
  greenTop: number[];
  /** Numbers in the lower triangles, left to right. */
  greenBottom: number[];
  pink: number[];
  foxes: number;
  rerollsUnlocked: number;
  rerollsUsed: number;
  plusOnesUnlocked: number;
  plusOnesUsed: number;
  polishUnlocked: number;
  polishUsed: number;
}

export type GreenRow = 'top' | 'bottom';

export type Target4 =
  /** Write `value` in the next free cell of yellow row `row`. */
  | { area: 'yellow'; row: number; value: number }
  /** Cross the cell at blue row / white column (0-based). */
  | { area: 'blue'; row: number; col: number }
  /** Cross every cell of grey part `part`. */
  | { area: 'grey'; part: number }
  /** Write `value` in the next free triangle of the given green row. */
  | { area: 'green'; row: GreenRow; value: number }
  /** Write `value` in the next free pink field. */
  | { area: 'pink'; value: number };

export function newSheet4(): Sheet4 {
  return {
    yellow: [[], [], []],
    blue: Array.from({ length: 6 }, () => new Array(6).fill(false)),
    grey: new Array(G4_ROWS * G4_COLS).fill(false),
    greenTop: [],
    greenBottom: [],
    pink: [],
    foxes: 0,
    rerollsUnlocked: 0,
    rerollsUsed: 0,
    plusOnesUnlocked: 0,
    plusOnesUsed: 0,
    polishUnlocked: 0,
    polishUsed: 0,
  };
}

export function areaOfDie4(color: DieColor): Area4 | null {
  switch (color) {
    case 'yellow':
      return 'yellow';
    case 'blue':
      return 'blue';
    case 'orange':
      return 'grey';
    case 'green':
      return 'green';
    case 'purple':
      return 'pink';
    case 'white':
      return null;
  }
}

export const AREAS4: readonly Area4[] = ['yellow', 'blue', 'grey', 'green', 'pink'];

export function sameTarget4(a: Target4, b: Target4): boolean {
  if (a.area !== b.area) return false;
  switch (a.area) {
    case 'yellow':
      return a.row === (b as typeof a).row && a.value === (b as typeof a).value;
    case 'blue':
      return a.row === (b as typeof a).row && a.col === (b as typeof a).col;
    case 'grey':
      return a.part === (b as typeof a).part;
    case 'green':
      return a.row === (b as typeof a).row && a.value === (b as typeof a).value;
    case 'pink':
      return a.value === (b as typeof a).value;
  }
}

export const YELLOW_ROW_NAMES = ['top', 'minus', 'plus'];

export function describeTarget4(t: Target4): string {
  switch (t.area) {
    case 'yellow':
      return `yellow ${YELLOW_ROW_NAMES[t.row]} row: ${t.value}`;
    case 'blue':
      return `blue ${t.row + 1}/${t.col + 1}`;
    case 'grey': {
      const p = G4_PARTS[t.part];
      return `grey ${p.shade === 'W' ? 'white' : p.shade === 'L' ? 'light' : 'dark'} part of ${p.cells.length} (column ${p.cells[0][1] + 1})`;
    }
    case 'green':
      return `green ${t.row} row: ${t.value}`;
    case 'pink':
      return `pink ${t.value}`;
  }
}

// ---------------------------------------------------------------------------
// Legal targets
// ---------------------------------------------------------------------------

export function yellowRowAllows(s: Sheet4, row: number, value: number): boolean {
  const written = s.yellow[row];
  if (written.length >= Y4_COLS) return false;
  if (row !== 0 || written.length === 0) return true;
  return value > written[written.length - 1];
}

export function yellowTargets(s: Sheet4, value: number): Target4[] {
  return [0, 1, 2].filter((row) => yellowRowAllows(s, row, value)).map((row) => ({ area: 'yellow' as const, row, value }));
}

/** `blue` and `white` are die numbers 1..6. */
export function blueTargets(s: Sheet4, blue: number, white: number): Target4[] {
  const row = blue - 1;
  const col = white - 1;
  return s.blue[row][col] ? [] : [{ area: 'blue', row, col }];
}

export function blueFreeCells(s: Sheet4): Target4[] {
  const out: Target4[] = [];
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) if (!s.blue[row][col]) out.push({ area: 'blue', row, col });
  return out;
}

export function greyCrossed(s: Sheet4, row: number, col: number): boolean {
  return s.grey[row * G4_COLS + col];
}

export function greyPartCrossed(s: Sheet4, part: number): boolean {
  const [r, c] = G4_PARTS[part].cells[0];
  return greyCrossed(s, r, c);
}

function greyPartReachable(s: Sheet4, part: number): boolean {
  const p = G4_PARTS[part];
  if (greyPartCrossed(s, part)) return false;
  if (!s.grey.some(Boolean)) return p.start;
  return p.cells.some(([r, c]) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      return nr >= 0 && nr < G4_ROWS && nc >= 0 && nc < G4_COLS && greyCrossed(s, nr, nc);
    }),
  );
}

/** Parts of at most `value` cells that may be crossed now. */
export function greyTargets(s: Sheet4, value: number): Target4[] {
  return G4_PARTS.filter((p) => p.cells.length <= value && greyPartReachable(s, p.index)).map((p) => ({ area: 'grey' as const, part: p.index }));
}

export function greenTargets(s: Sheet4, value: number): Target4[] {
  const out: Target4[] = [];
  if (s.greenTop.length < GR4_FIELDS) out.push({ area: 'green', row: 'top', value });
  if (s.greenBottom.length < GR4_FIELDS) out.push({ area: 'green', row: 'bottom', value });
  return out;
}

export function pinkTargets(s: Sheet4, value: number): Target4[] {
  return s.pink.length < P4_POINTS.length ? [{ area: 'pink', value }] : [];
}

// ---------------------------------------------------------------------------
// Writing. Each function mutates the sheet and returns triggered bonuses.
// ---------------------------------------------------------------------------

export function writeYellow(s: Sheet4, row: number, value: number): Bonus4[] {
  if (!yellowRowAllows(s, row, value)) throw new Error(`yellow ${value} not allowed in row ${row + 1}`);
  s.yellow[row].push(value);
  const b = Y4_BONUS[row][s.yellow[row].length - 1];
  return b ? [b] : [];
}

export function blueRowCount(s: Sheet4, row: number): number {
  return s.blue[row].filter(Boolean).length;
}

export function blueColCount(s: Sheet4, col: number): number {
  return s.blue.filter((r) => r[col]).length;
}

/** Crosses on the top-left → bottom-right diagonal. */
export function blueDiagCount(s: Sheet4): number {
  return [0, 1, 2, 3, 4, 5].filter((i) => s.blue[i][i]).length;
}

/** Crosses on the top-right → bottom-left diagonal. */
export function blueAntiCount(s: Sheet4): number {
  return [0, 1, 2, 3, 4, 5].filter((i) => s.blue[i][5 - i]).length;
}

export function crossBlue(s: Sheet4, row: number, col: number): Bonus4[] {
  if (s.blue[row][col]) throw new Error('blue cell taken');
  s.blue[row][col] = true;
  const out: Bonus4[] = [];
  if (blueRowCount(s, row) === 2) out.push(B4_ROW_BONUS[row]);
  if (row === col && blueDiagCount(s) === 2) out.push(B4_DIAG_BONUS);
  return out;
}

export function greyShadeDone(s: Sheet4, shade: Shade): boolean {
  for (let r = 0; r < G4_ROWS; r++) for (let c = 0; c < G4_COLS; c++) if (G4_SHADES[r][c] === shade && !greyCrossed(s, r, c)) return false;
  return true;
}

export function crossGrey(s: Sheet4, part: number): Bonus4[] {
  if (!greyPartReachable(s, part)) throw new Error('that grey part cannot be crossed now');
  const p = G4_PARTS[part];
  const out: Bonus4[] = [];
  for (const [r, c] of p.cells) {
    s.grey[r * G4_COLS + c] = true;
    const b = G4_CELL_BONUS[`${r},${c}`];
    if (b) out.push(b);
  }
  if (greyShadeDone(s, p.shade)) out.push({ type: 'fox' });
  return out;
}

export function writeGreen(s: Sheet4, row: GreenRow, value: number): Bonus4[] {
  const written = row === 'top' ? s.greenTop : s.greenBottom;
  if (written.length >= GR4_FIELDS) throw new Error('green row full');
  written.push(value);
  return row === 'bottom' ? [GR4_BONUS[written.length - 1]] : [];
}

export function writePink(s: Sheet4, value: number): Bonus4[] {
  const i = s.pink.length;
  if (i >= P4_POINTS.length) throw new Error('pink row full');
  s.pink.push(value);
  const out: Bonus4[] = [];
  // A 3 immediately writes another 3 in the next field (that one has no effect of its own).
  if (value === 3 && s.pink.length < P4_POINTS.length) s.pink.push(3);
  if (value >= 5) {
    const b = P4_BONUS[i];
    if (b) out.push(b);
  }
  return out;
}

export function applyTarget4(s: Sheet4, t: Target4): Bonus4[] {
  switch (t.area) {
    case 'yellow':
      return writeYellow(s, t.row, t.value);
    case 'blue':
      return crossBlue(s, t.row, t.col);
    case 'grey':
      return crossGrey(s, t.part);
    case 'green':
      return writeGreen(s, t.row, t.value);
    case 'pink':
      return writePink(s, t.value);
  }
}

// ---------------------------------------------------------------------------
// Bonuses and actions
// ---------------------------------------------------------------------------

export function isChoice4(b: Bonus4): boolean {
  return b.type === 'q';
}

export function isOptional4(): boolean {
  return false;
}

/** Boxes a "?"-bonus may be applied to (any number 1–6; blue: any free cell). */
export function bonusTargets4(s: Sheet4, b: Bonus4): Target4[] {
  if (b.type !== 'q') return [];
  const numbers = [1, 2, 3, 4, 5, 6];
  const forArea = (area: Area4): Target4[] => {
    switch (area) {
      case 'yellow':
        return numbers.flatMap((n) => yellowTargets(s, n));
      case 'blue':
        return blueFreeCells(s);
      case 'grey':
        return greyTargets(s, 6);
      case 'green':
        return numbers.flatMap((n) => greenTargets(s, n));
      case 'pink':
        return numbers.flatMap((n) => pinkTargets(s, n));
    }
  };
  return b.color === 'any' ? AREAS4.flatMap(forArea) : forArea(b.color);
}

const SLOTS = { reroll: REROLL_SLOTS4, polish: POLISH_SLOTS4, plusOne: PLUS_ONE_SLOTS4 } as const;

function unlockRow(s: Sheet4, key: 'reroll' | 'polish' | 'plusOne'): Bonus4[] {
  const field = key === 'reroll' ? 'rerollsUnlocked' : key === 'plusOne' ? 'plusOnesUnlocked' : 'polishUnlocked';
  if (s[field] >= SLOTS[key]) return [];
  s[field] += 1;
  const end = ROW_END_BONUS4[key];
  return s[field] === SLOTS[key] && end ? [end] : [];
}

export function applyAuto4(s: Sheet4, b: Bonus4): Bonus4[] {
  switch (b.type) {
    case 'reroll':
    case 'polish':
    case 'plusOne':
      return unlockRow(s, b.type);
    case 'fox':
      s.foxes += 1;
      return [];
    case 'q':
      throw new Error('choice bonus');
  }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function yellowColumnsDone(s: Sheet4): number {
  return Math.min(...s.yellow.map((r) => r.length));
}

export function yellowColumnPoints(s: Sheet4): number {
  return sum(Y4_COL_POINTS.slice(0, yellowColumnsDone(s)));
}

export function yellowScore4(s: Sheet4): number {
  return sum(s.yellow[2]) - sum(s.yellow[1]) + yellowColumnPoints(s);
}

export function blueScore4(s: Sheet4): number {
  let pts = 0;
  for (let col = 0; col < 6; col++) if (blueColCount(s, col) >= 2) pts += B4_COL_POINTS[col];
  if (blueAntiCount(s) >= 2) pts += B4_ANTI_POINTS;
  return pts;
}

export function greyColumnDone(s: Sheet4, col: number): boolean {
  for (let r = 0; r < G4_ROWS; r++) if (!greyCrossed(s, r, col)) return false;
  return true;
}

export function greyScore4(s: Sheet4): number {
  let pts = 0;
  for (let c = 0; c < G4_COLS; c++) if (greyColumnDone(s, c)) pts += G4_COL_POINTS[c];
  return pts;
}

/** Points of green field `i`, or null while a triangle is still empty. */
export function greenFieldPoints(s: Sheet4, i: number): number | null {
  if (i >= s.greenTop.length || i >= s.greenBottom.length) return null;
  return (s.greenTop[i] + s.greenBottom[i]) * (i >= GR4_DOUBLE_FROM ? 2 : 1);
}

export function greenScore4(s: Sheet4): number {
  let pts = 0;
  for (let i = 0; i < GR4_FIELDS; i++) pts += greenFieldPoints(s, i) ?? 0;
  return pts;
}

export function pinkCirclePoints(s: Sheet4): number {
  return sum(s.pink.map((v) => P4_CIRCLE_POINTS[v]));
}

export function pinkScore4(s: Sheet4): number {
  return (s.pink.length ? P4_POINTS[s.pink.length - 1] : 0) + pinkCirclePoints(s);
}

export function score4(s: Sheet4): Scores {
  const areas = [
    { key: 'yellow', points: yellowScore4(s) },
    { key: 'blue', points: blueScore4(s) },
    { key: 'grey', points: greyScore4(s) },
    { key: 'green', points: greenScore4(s) },
    { key: 'pink', points: pinkScore4(s) },
  ];
  const foxPoints = s.foxes * Math.min(...areas.map((a) => a.points));
  return { areas, foxes: s.foxes, foxPoints, total: areas.reduce((t, a) => t + a.points, 0) + foxPoints };
}
