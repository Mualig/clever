import {
  ACTION_SLOTS,
  AREA_COLORS,
  BLUE_COLUMN_BONUS,
  BLUE_GRID,
  BLUE_POINTS,
  BLUE_ROW_BONUS,
  GREEN_BONUS,
  GREEN_POINTS,
  GREEN_THRESHOLDS,
  ORANGE_BONUS,
  ORANGE_MULTIPLIER,
  PURPLE_BONUS,
  TRACK_LENGTH,
  YELLOW_COLUMN_POINTS,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_DIAGONAL_CELLS,
  YELLOW_GRID,
  YELLOW_ROW_BONUS,
  type AreaColor,
  type Bonus,
  type DieColor,
} from './sheet';
import type { AreaScores, DiceState, Sheet, Target } from './types';

export function newSheet(): Sheet {
  return {
    yellow: YELLOW_GRID.map((v) => v === null),
    blue: new Array(11).fill(false),
    green: 0,
    orange: [],
    purple: [],
    rerollsUnlocked: 0,
    rerollsUsed: 0,
    plusOnesUnlocked: 0,
    plusOnesUsed: 0,
  };
}

export function rerollsLeft(s: Sheet): number {
  return s.rerollsUnlocked - s.rerollsUsed;
}

export function plusOnesLeft(s: Sheet): number {
  return s.plusOnesUnlocked - s.plusOnesUsed;
}

/** Areas a die of the given colour may be written into. */
export function areasForDie(color: DieColor): AreaColor[] {
  return color === 'white' ? [...AREA_COLORS] : [color];
}

/** The value a die contributes when written into an area (blue always sums blue + white). */
export function dieValueFor(dice: DiceState, color: DieColor, area: AreaColor): number {
  if (area === 'blue') return dice.values.blue + dice.values.white;
  return dice.values[color];
}

/** All boxes where `value` can be written in `area`. */
export function legalTargets(sheet: Sheet, area: AreaColor, value: number): Target[] {
  switch (area) {
    case 'yellow':
      return YELLOW_GRID.flatMap((v, cell) => (v === value && !sheet.yellow[cell] ? [{ area, cell }] : []));
    case 'blue':
      return value >= 2 && value <= 12 && !sheet.blue[value - 2] ? [{ area, value }] : [];
    case 'green':
      return sheet.green < TRACK_LENGTH && value >= GREEN_THRESHOLDS[sheet.green] ? [{ area }] : [];
    case 'orange':
      return sheet.orange.length < TRACK_LENGTH ? [{ area }] : [];
    case 'purple': {
      if (sheet.purple.length >= TRACK_LENGTH) return [];
      const last = sheet.purple[sheet.purple.length - 1];
      return last === undefined || last === 6 || value > last ? [{ area }] : [];
    }
  }
}

/** All boxes on `sheet` where the die `color` can currently be written. */
export function targetsForDie(sheet: Sheet, dice: DiceState, color: DieColor): Target[] {
  return areasForDie(color).flatMap((area) => legalTargets(sheet, area, dieValueFor(dice, color, area)));
}

export function sameTarget(a: Target, b: Target): boolean {
  if (a.area !== b.area) return false;
  if (a.area === 'yellow' && b.area === 'yellow') return a.cell === b.cell;
  if (a.area === 'blue' && b.area === 'blue') return a.value === b.value;
  return true;
}

/** Whether a bonus needs a decision from the player, or can be applied automatically. */
export function isChoiceBonus(b: Bonus): boolean {
  return b.type === 'roundFour' || (b.type === 'x' && b.color !== 'green') || (b.type === 'number' && b.color === 'any');
}

/** Boxes a choice bonus may be applied to. */
export function bonusTargets(sheet: Sheet, b: Bonus): Target[] {
  const anyYellow = () => YELLOW_GRID.flatMap((v, cell) => (v !== null && !sheet.yellow[cell] ? [{ area: 'yellow' as const, cell }] : []));
  const anyBlue = () => sheet.blue.flatMap((m, i) => (m ? [] : [{ area: 'blue' as const, value: i + 2 }]));
  const nextGreen = (): Target[] => (sheet.green < TRACK_LENGTH ? [{ area: 'green' }] : []);
  const nextOrange = (): Target[] => (sheet.orange.length < TRACK_LENGTH ? [{ area: 'orange' }] : []);
  const nextPurple = (): Target[] => (sheet.purple.length < TRACK_LENGTH ? [{ area: 'purple' }] : []);
  switch (b.type) {
    case 'x':
      if (b.color === 'yellow') return anyYellow();
      if (b.color === 'blue') return anyBlue();
      if (b.color === 'green') return nextGreen();
      return [...anyYellow(), ...anyBlue(), ...nextGreen()];
    case 'number':
      if (b.color === 'orange') return nextOrange();
      if (b.color === 'purple') return nextPurple();
      return [...nextOrange(), ...nextPurple()];
    case 'roundFour':
      return [...anyYellow(), ...anyBlue(), ...nextGreen(), ...nextOrange(), ...nextPurple()];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Marking. Each function mutates the sheet and returns the bonuses it triggered.
// ---------------------------------------------------------------------------

function yellowRowComplete(s: Sheet, row: number): boolean {
  return [0, 1, 2, 3].every((c) => s.yellow[row * 4 + c]);
}

function yellowColumnComplete(s: Sheet, col: number): boolean {
  return [0, 1, 2, 3].every((r) => s.yellow[r * 4 + col]);
}

export function markYellow(s: Sheet, cell: number): Bonus[] {
  if (s.yellow[cell] || YELLOW_GRID[cell] === null) throw new Error(`yellow cell ${cell} not free`);
  s.yellow[cell] = true;
  const bonuses: Bonus[] = [];
  const row = Math.floor(cell / 4);
  if (yellowRowComplete(s, row)) bonuses.push(YELLOW_ROW_BONUS[row]);
  if (YELLOW_DIAGONAL_CELLS.includes(cell) && YELLOW_DIAGONAL_CELLS.every((c) => s.yellow[c])) {
    bonuses.push(YELLOW_DIAGONAL_BONUS);
  }
  return bonuses;
}

function blueMarked(s: Sheet, idx: number): boolean {
  const v = BLUE_GRID[idx];
  return v === null || s.blue[v - 2];
}

export function markBlue(s: Sheet, value: number): Bonus[] {
  if (value < 2 || value > 12 || s.blue[value - 2]) throw new Error(`blue ${value} not free`);
  s.blue[value - 2] = true;
  const idx = BLUE_GRID.indexOf(value);
  const row = Math.floor(idx / 4);
  const col = idx % 4;
  const bonuses: Bonus[] = [];
  if ([0, 1, 2, 3].every((c) => blueMarked(s, row * 4 + c))) bonuses.push(BLUE_ROW_BONUS[row]);
  if ([0, 1, 2].every((r) => blueMarked(s, r * 4 + col))) bonuses.push(BLUE_COLUMN_BONUS[col]);
  return bonuses;
}

/** Marks the next green box. Threshold is checked by the caller (X bonuses ignore it). */
export function markGreen(s: Sheet): Bonus[] {
  if (s.green >= TRACK_LENGTH) throw new Error('green track full');
  const idx = s.green++;
  const b = GREEN_BONUS[idx];
  return b ? [b] : [];
}

export function recordOrange(s: Sheet, dieValue: number): Bonus[] {
  if (s.orange.length >= TRACK_LENGTH) throw new Error('orange track full');
  const idx = s.orange.length;
  s.orange.push(dieValue * ORANGE_MULTIPLIER[idx]);
  const b = ORANGE_BONUS[idx];
  return b ? [b] : [];
}

export function recordPurple(s: Sheet, dieValue: number): Bonus[] {
  if (s.purple.length >= TRACK_LENGTH) throw new Error('purple track full');
  const last = s.purple[s.purple.length - 1];
  if (last !== undefined && last !== 6 && dieValue <= last) throw new Error(`purple ${dieValue} must exceed ${last}`);
  const idx = s.purple.length;
  s.purple.push(dieValue);
  const b = PURPLE_BONUS[idx];
  return b ? [b] : [];
}

/** Writes `value` at `target`. Returns triggered bonuses. */
export function applyTarget(s: Sheet, target: Target, value: number): Bonus[] {
  switch (target.area) {
    case 'yellow':
      return markYellow(s, target.cell);
    case 'blue':
      return markBlue(s, target.value);
    case 'green':
      return markGreen(s);
    case 'orange':
      return recordOrange(s, value);
    case 'purple':
      return recordPurple(s, value);
  }
}

/** Applies a bonus that needs no decision. Returns chained bonuses. */
export function applyAutoBonus(s: Sheet, b: Bonus): Bonus[] {
  switch (b.type) {
    case 'reroll':
      s.rerollsUnlocked = Math.min(ACTION_SLOTS, s.rerollsUnlocked + 1);
      return [];
    case 'plusOne':
      s.plusOnesUnlocked = Math.min(ACTION_SLOTS, s.plusOnesUnlocked + 1);
      return [];
    case 'fox':
      return []; // foxes are derived from the sheet at scoring time
    case 'x':
      if (b.color !== 'green') throw new Error('choice bonus');
      return s.green < TRACK_LENGTH ? markGreen(s) : [];
    case 'number':
      if (b.color === 'orange') return s.orange.length < TRACK_LENGTH ? recordOrange(s, b.value) : [];
      if (b.color === 'purple') return s.purple.length < TRACK_LENGTH ? recordPurple(s, b.value) : [];
      throw new Error('choice bonus');
    case 'roundFour':
      throw new Error('choice bonus');
  }
}

/** Applies a choice bonus at the chosen target. Returns chained bonuses. */
export function applyBonusAt(s: Sheet, b: Bonus, target: Target): Bonus[] {
  const value = b.type === 'number' ? b.value : 6;
  return applyTarget(s, target, value);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function foxCount(s: Sheet): number {
  let n = 0;
  if (yellowRowComplete(s, 3)) n++;
  if ([9, 10, 11, 12].every((v) => s.blue[v - 2])) n++;
  if (s.green >= 7) n++;
  if (s.orange.length >= 8) n++;
  if (s.purple.length >= 7) n++;
  return n;
}

export function yellowColumnsComplete(s: Sheet): boolean[] {
  return [0, 1, 2, 3].map((c) => yellowColumnComplete(s, c));
}

export function blueCount(s: Sheet): number {
  return s.blue.filter(Boolean).length;
}

export function scoreSheet(s: Sheet): AreaScores {
  const yellow = yellowColumnsComplete(s).reduce((sum, done, c) => sum + (done ? YELLOW_COLUMN_POINTS[c] : 0), 0);
  const blue = BLUE_POINTS[blueCount(s)];
  const green = GREEN_POINTS[s.green];
  const orange = s.orange.reduce((a, b) => a + b, 0);
  const purple = s.purple.reduce((a, b) => a + b, 0);
  const foxes = foxCount(s);
  const foxPoints = foxes * Math.min(yellow, blue, green, orange, purple);
  return { yellow, blue, green, orange, purple, foxes, foxPoints, total: yellow + blue + green + orange + purple + foxPoints };
}

/** Indices of the winning players (several on a full tie). */
export function winners(scores: AreaScores[]): number[] {
  const best = Math.max(...scores.map((s) => s.total));
  let tied = scores.map((s, i) => (s.total === best ? i : -1)).filter((i) => i >= 0);
  if (tied.length > 1) {
    const bestArea = (s: AreaScores) => Math.max(s.yellow, s.blue, s.green, s.orange, s.purple);
    const top = Math.max(...tied.map((i) => bestArea(scores[i])));
    tied = tied.filter((i) => bestArea(scores[i]) === top);
  }
  return tied;
}
