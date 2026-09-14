import type { DieColor } from './sheet';
import {
  ACTION_SLOTS3,
  ANY_NUMBER_SLOTS,
  B3_BONUS,
  B3_EXTRA_HIGH,
  B3_EXTRA_LOW,
  B3_EXTRA_POINTS,
  B3_POINTS,
  B3_SIDE,
  BR3_GAP_BONUS,
  BR3_NUMBERS,
  BR3_POINTS,
  P3_BONUS,
  P3_MULT,
  ROW_END_BONUS,
  T3_COL_BONUS,
  T3_COLORED,
  T3_ROW_BONUS,
  T3_ROW_POINTS,
  Y3_GAP_BONUS,
  Y3_GREY,
  Y3_ROW_POINTS,
  type Area3,
  type Bonus3,
} from './sheet3';
import type { AnyNumberChoice, PlacementContext, Scores } from './variant';

export interface Sheet3 {
  yellow: boolean[][];
  turquoise: boolean[][];
  /** Values written left of the 7, from the middle outwards. */
  blueLeft: number[];
  /** Values written right of the 7, from the middle outwards. */
  blueRight: number[];
  brown: boolean[];
  pink: number[];
  /** Whether the bonus (half value) option was taken for each pink field. */
  pinkBonus: boolean[];
  rerollsUnlocked: number;
  rerollsUsed: number;
  plusOnesUnlocked: number;
  plusOnesUsed: number;
  anyUnlocked: number;
  anyUsed: boolean[];
}

export type Target3 =
  | { area: 'yellow'; row: number; col: number }
  | { area: 'turquoise'; row: number; col: number }
  | { area: 'blue'; side: 'left' | 'right'; value: number }
  | { area: 'brown'; index: number }
  /** `value` is the die number used (1..6); `mode` decides between half+bonus and multiplied points. */
  | { area: 'pink'; mode: 'bonus' | 'points'; value: number };

export function newSheet3(): Sheet3 {
  return {
    yellow: Y3_GREY.map((r) => r.map(() => false)),
    turquoise: T3_COLORED.map(() => new Array(6).fill(false)),
    blueLeft: [],
    blueRight: [],
    brown: new Array(BR3_NUMBERS.length).fill(false),
    pink: [],
    pinkBonus: [],
    rerollsUnlocked: 0,
    rerollsUsed: 0,
    plusOnesUnlocked: 0,
    plusOnesUsed: 0,
    anyUnlocked: 0,
    anyUsed: new Array(ACTION_SLOTS3).fill(false),
  };
}

export function areaOfDie3(color: DieColor): Area3 | null {
  switch (color) {
    case 'yellow':
      return 'yellow';
    case 'green':
      return 'turquoise';
    case 'blue':
      return 'blue';
    case 'orange':
      return 'brown';
    case 'purple':
      return 'pink';
    case 'white':
      return null;
  }
}

export const AREAS3: readonly Area3[] = ['yellow', 'turquoise', 'blue', 'brown', 'pink'];

export function sameTarget3(a: Target3, b: Target3): boolean {
  if (a.area !== b.area) return false;
  switch (a.area) {
    case 'yellow':
    case 'turquoise':
      return a.row === (b as typeof a).row && a.col === (b as typeof a).col;
    case 'blue':
      return a.side === (b as typeof a).side && a.value === (b as typeof a).value;
    case 'brown':
      return a.index === (b as typeof a).index;
    case 'pink':
      return a.mode === (b as typeof a).mode && a.value === (b as typeof a).value;
  }
}

export function describeTarget3(t: Target3): string {
  switch (t.area) {
    case 'yellow':
      return `yellow row ${['I', 'II', 'III'][t.row]} ${t.col + 1}`;
    case 'turquoise':
      return `turquoise row ${t.row + 1} ${t.col + 1}`;
    case 'blue':
      return `blue ${t.side} ${t.value}`;
    case 'brown':
      return `brown ${BR3_NUMBERS[t.index]} (box ${t.index + 1})`;
    case 'pink':
      return t.mode === 'bonus' ? `pink ½ of ${t.value} + bonus` : `pink ${t.value} × multiplier`;
  }
}

// ---------------------------------------------------------------------------
// Legal targets
// ---------------------------------------------------------------------------

export function yellowTargets(s: Sheet3, value: number, ctx: PlacementContext | null): Target3[] {
  const col = value - 1;
  const rows = ctx === null || (ctx.role === 'active' && ctx.field === null) ? [0, 1, 2] : ctx.role === 'active' ? [ctx.field!] : [0, 1, 2];
  return rows
    .filter((row) => !s.yellow[row][col] && (ctx === null || ctx.role === 'active' || Y3_GREY[row][col]))
    .map((row) => ({ area: 'yellow' as const, row, col }));
}

export function turquoiseTargets(s: Sheet3, value: number): Target3[] {
  const col = value - 1;
  return [0, 1, 2, 3, 4].filter((row) => !s.turquoise[row][col]).map((row) => ({ area: 'turquoise' as const, row, col }));
}

function blueSideAllows(written: number[], dir: 1 | -1, value: number): boolean {
  if (written.length >= B3_SIDE) return false;
  const prev = written.length ? written[written.length - 1] : 7;
  return value === prev + dir || (value === 7 && prev !== 7);
}

/** `value` is the blue + white sum (2..12). */
export function blueTargets(s: Sheet3, value: number): Target3[] {
  const t: Target3[] = [];
  if (blueSideAllows(s.blueLeft, -1, value)) t.push({ area: 'blue', side: 'left', value });
  if (blueSideAllows(s.blueRight, 1, value)) t.push({ area: 'blue', side: 'right', value });
  return t;
}

export function brownLast(s: Sheet3): number {
  return s.brown.lastIndexOf(true);
}

export function brownTargets(s: Sheet3, value: number | null): Target3[] {
  const last = brownLast(s);
  return BR3_NUMBERS.flatMap((n, index) => (index > last && (value === null || n === value) ? [{ area: 'brown' as const, index }] : []));
}

export function pinkTargets(s: Sheet3, value: number): Target3[] {
  const i = s.pink.length;
  if (i >= P3_MULT.length) return [];
  const t: Target3[] = [{ area: 'pink', mode: 'bonus', value }];
  if (i > 0) t.push({ area: 'pink', mode: 'points', value });
  return t;
}

/** Targets for writing die number `value` (blue uses `blueSum`) into `area`. */
export function areaTargets(s: Sheet3, area: Area3, value: number, blueSum: number, ctx: PlacementContext | null): Target3[] {
  switch (area) {
    case 'yellow':
      return yellowTargets(s, value, ctx);
    case 'turquoise':
      return turquoiseTargets(s, value);
    case 'blue':
      return blueTargets(s, blueSum);
    case 'brown':
      return brownTargets(s, value);
    case 'pink':
      return pinkTargets(s, value);
  }
}

// ---------------------------------------------------------------------------
// Writing. Each function mutates the sheet and returns triggered bonuses.
// ---------------------------------------------------------------------------

export function crossYellow(s: Sheet3, row: number, col: number): Bonus3[] {
  if (s.yellow[row][col]) throw new Error('yellow cell taken');
  s.yellow[row][col] = true;
  const out: Bonus3[] = [];
  for (const g of [row - 1, row]) {
    if (g >= 0 && g < 2 && s.yellow[g][col] && s.yellow[g + 1][col]) out.push(Y3_GAP_BONUS[g][col]);
  }
  return out;
}

export function turquoiseRowDone(s: Sheet3, row: number): boolean {
  for (let c = 0; c < T3_COLORED[row]; c++) if (!s.turquoise[row][c]) return false;
  return true;
}

export function turquoiseColDone(s: Sheet3, col: number): boolean {
  for (let r = 0; r < 5; r++) if (col < T3_COLORED[r] && !s.turquoise[r][col]) return false;
  return true;
}

export function crossTurquoise(s: Sheet3, row: number, col: number): Bonus3[] {
  if (s.turquoise[row][col]) throw new Error('turquoise cell taken');
  s.turquoise[row][col] = true;
  const out: Bonus3[] = [];
  if (col < T3_COLORED[row]) {
    const rb = T3_ROW_BONUS[row];
    if (rb && turquoiseRowDone(s, row)) out.push(rb);
    if (turquoiseColDone(s, col)) out.push(T3_COL_BONUS[col]);
  }
  return out;
}

export function writeBlue(s: Sheet3, side: 'left' | 'right', value: number): Bonus3[] {
  const written = side === 'left' ? s.blueLeft : s.blueRight;
  if (!blueSideAllows(written, side === 'left' ? -1 : 1, value)) throw new Error(`blue ${value} not allowed on the ${side}`);
  written.push(value);
  const index = side === 'left' ? B3_SIDE - written.length : B3_SIDE + written.length;
  const b = B3_BONUS[index];
  return b ? [b] : [];
}

export function crossBrown(s: Sheet3, index: number): Bonus3[] {
  if (index <= brownLast(s)) throw new Error('brown fields must be crossed left to right');
  s.brown[index] = true;
  const out: Bonus3[] = [];
  for (const g of [index - 1, index]) {
    if (g >= 0 && g < BR3_GAP_BONUS.length && s.brown[g] && s.brown[g + 1]) {
      const b = BR3_GAP_BONUS[g];
      if (b) out.push(b);
    }
  }
  return out;
}

export function writePink(s: Sheet3, mode: 'bonus' | 'points', value: number): Bonus3[] {
  const i = s.pink.length;
  if (i >= P3_MULT.length) throw new Error('pink row full');
  if (mode === 'points' && i === 0) throw new Error('the first pink field always takes half the die');
  if (mode === 'bonus') {
    s.pink.push(Math.ceil(value / 2));
    s.pinkBonus.push(true);
    const b = P3_BONUS[i];
    return b ? [b] : [];
  }
  s.pink.push(value * P3_MULT[i]);
  s.pinkBonus.push(false);
  return [];
}

export function applyTarget3(s: Sheet3, t: Target3): Bonus3[] {
  switch (t.area) {
    case 'yellow':
      return crossYellow(s, t.row, t.col);
    case 'turquoise':
      return crossTurquoise(s, t.row, t.col);
    case 'blue':
      return writeBlue(s, t.side, t.value);
    case 'brown':
      return crossBrown(s, t.index);
    case 'pink':
      return writePink(s, t.mode, t.value);
  }
}

// ---------------------------------------------------------------------------
// Bonuses and actions
// ---------------------------------------------------------------------------

export function isChoice3(b: Bonus3): boolean {
  return b.type === 'q' || b.type === 'tx';
}

export function isOptional3(b: Bonus3): boolean {
  return b.type === 'tx';
}

function dedupe(targets: Target3[]): Target3[] {
  const out: Target3[] = [];
  for (const t of targets) if (!out.some((o) => sameTarget3(o, t))) out.push(t);
  return out;
}

/** Boxes a "?"-bonus (or extra turquoise cross) may be applied to. */
export function bonusTargets3(s: Sheet3, b: Bonus3, white: number): Target3[] {
  if (b.type === 'tx') return turquoiseTargets(s, b.value);
  if (b.type !== 'q') return [];
  const forArea = (area: Area3): Target3[] => {
    switch (area) {
      case 'yellow':
        return [1, 2, 3, 4, 5, 6].flatMap((n) => yellowTargets(s, n, null));
      case 'turquoise':
        return [1, 2, 3, 4, 5, 6].flatMap((n) => turquoiseTargets(s, n));
      case 'blue':
        return dedupe([1, 2, 3, 4, 5, 6].flatMap((n) => blueTargets(s, n + white)));
      case 'brown':
        return brownTargets(s, null);
      case 'pink': {
        // Several numbers can lead to the same written value; offer each outcome once.
        const seen = new Set<string>();
        const i = s.pink.length;
        return [1, 2, 3, 4, 5, 6]
          .flatMap((n) => pinkTargets(s, n))
          .filter((t) => {
            const p = t as { mode: 'bonus' | 'points'; value: number };
            const key = `${p.mode}:${p.mode === 'bonus' ? Math.ceil(p.value / 2) : p.value * P3_MULT[i]}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
      }
    }
  };
  return b.color === 'any' ? AREAS3.flatMap(forArea) : forArea(b.color);
}

function unlockRow(s: Sheet3, key: 'reroll' | 'anyNumber' | 'plusOne'): Bonus3[] {
  const field = key === 'reroll' ? 'rerollsUnlocked' : key === 'plusOne' ? 'plusOnesUnlocked' : 'anyUnlocked';
  if (s[field] >= ACTION_SLOTS3) return [];
  s[field] += 1;
  return s[field] === ACTION_SLOTS3 ? [ROW_END_BONUS[key]] : [];
}

export function applyAuto3(s: Sheet3, b: Bonus3): Bonus3[] {
  switch (b.type) {
    case 'reroll':
    case 'anyNumber':
    case 'plusOne':
      return unlockRow(s, b.type);
    case 'fox':
      return [];
    case 'q':
    case 'tx':
      throw new Error('choice bonus');
  }
}

export function anyNumberChoices3(s: Sheet3): AnyNumberChoice[] {
  const out: AnyNumberChoice[] = [];
  for (let i = 0; i < s.anyUnlocked; i++) if (!s.anyUsed[i]) out.push({ slot: i, value: ANY_NUMBER_SLOTS[i] });
  return out;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function yellowScore3(s: Sheet3): number {
  return s.yellow.reduce((sum, row) => sum + Y3_ROW_POINTS[row.filter(Boolean).length], 0);
}

export function turquoiseScore3(s: Sheet3): number {
  return s.turquoise.reduce((sum, row) => sum + T3_ROW_POINTS[row.filter(Boolean).length], 0);
}

export function blueScore3(s: Sheet3): number {
  const extra = [...s.blueLeft, ...s.blueRight].filter((v) => v <= B3_EXTRA_LOW || v >= B3_EXTRA_HIGH).length * B3_EXTRA_POINTS;
  return B3_POINTS[s.blueLeft.length] + B3_POINTS[s.blueRight.length] + extra;
}

export function brownScore3(s: Sheet3): number {
  return BR3_POINTS[s.brown.filter(Boolean).length];
}

export function pinkScore3(s: Sheet3): number {
  return s.pink.reduce((a, b) => a + b, 0);
}

export function foxCount3(s: Sheet3): number {
  let n = 0;
  if (s.yellow[0][5] && s.yellow[1][5]) n++;
  if (turquoiseRowDone(s, 0)) n++;
  if (s.blueRight.length === B3_SIDE) n++;
  if (s.brown[10] && s.brown[11]) n++;
  if (s.pink.length > 8 && s.pinkBonus[8]) n++;
  if (s.rerollsUnlocked >= ACTION_SLOTS3) n++;
  return n;
}

export function score3(s: Sheet3): Scores {
  const areas = [
    { key: 'yellow', points: yellowScore3(s) },
    { key: 'turquoise', points: turquoiseScore3(s) },
    { key: 'blue', points: blueScore3(s) },
    { key: 'brown', points: brownScore3(s) },
    { key: 'pink', points: pinkScore3(s) },
  ];
  const foxes = foxCount3(s);
  const foxPoints = foxes * Math.min(...areas.map((a) => a.points));
  return { areas, foxes, foxPoints, total: areas.reduce((t, a) => t + a.points, 0) + foxPoints };
}
