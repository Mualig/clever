/**
 * Static description of the "Clever 4Ever" score sheet (Ganz schön clever 4, 2022).
 * Dice: white (wild), yellow, green, blue, grey, pink. Internally the engine keeps
 * the base game's colour ids: orange = grey, purple = pink.
 * Layout transcribed from the official German rulebook and the Schmidt web version.
 */

export type Area4 = 'yellow' | 'blue' | 'grey' | 'green' | 'pink';

export type Bonus4 =
  | { type: 'reroll' }
  | { type: 'plusOne' }
  /** "Silber polieren": change a silver-platter die by ±1 per action. */
  | { type: 'polish' }
  | { type: 'fox' }
  /** "?"-bonus: choose a number 1–6 and write it in the area as if rolled ("any" = black ?). */
  | { type: 'q'; color: Area4 | 'any' };

const reroll: Bonus4 = { type: 'reroll' };
const plusOne: Bonus4 = { type: 'plusOne' };
const polish: Bonus4 = { type: 'polish' };
const fox: Bonus4 = { type: 'fox' };
const qYellow: Bonus4 = { type: 'q', color: 'yellow' };
const qBlue: Bonus4 = { type: 'q', color: 'blue' };
const qGrey: Bonus4 = { type: 'q', color: 'grey' };
const qGreen: Bonus4 = { type: 'q', color: 'green' };
const qPink: Bonus4 = { type: 'q', color: 'pink' };
const qAny: Bonus4 = { type: 'q', color: 'any' };

// Yellow: 3 rows of 5 numbers, each row filled left to right. Row 0 must ascend (nothing after a 6),
// row 1 counts negative, row 2 counts positive. Bonuses sit on the cells of rows 0 and 1.
export const Y4_COLS = 5;
export const Y4_BONUS: readonly (readonly (Bonus4 | null)[])[] = [
  [null, polish, qGrey, qGreen, fox],
  [reroll, qPink, qBlue, plusOne, qYellow],
  [null, null, null, null, null],
];
/** Points for each completely filled column (all three rows). */
export const Y4_COL_POINTS: readonly number[] = [10, 10, 15, 15, 20];

// Blue: 6×6 grid, row = blue die, column = white die. Row bonus at exactly 2 crosses in the row;
// the top-left → bottom-right diagonal gives a re-roll at 2 crosses. Columns with ≥ 2 crosses score;
// the top-right → bottom-left diagonal with ≥ 2 crosses scores B4_ANTI_POINTS.
export const B4_ROW_BONUS: readonly Bonus4[] = [qGreen, qPink, qYellow, plusOne, qGrey, fox];
export const B4_DIAG_BONUS: Bonus4 = reroll;
export const B4_COL_POINTS: readonly number[] = [7, 8, 9, 10, 11, 12];
export const B4_ANTI_POINTS = 6;

// Grey: 4 rows × 16 columns of white (W), light grey (L) and dark grey (D) cells. Each group of
// orthogonally connected cells of one shade is a part; a grey die crosses a whole part whose size
// is at most the die number. The first part must be one of the two red-framed parts at the left
// (the single dark cell and the light L-shape); later parts must touch an existing cross.
export const G4_ROWS = 4;
export const G4_COLS = 16;
export type Shade = 'W' | 'L' | 'D';
export const G4_SHADES: readonly string[] = [
  'DWWLLLLWWLLDLLDD',
  'LWWDDDLWWWLDLWDD',
  'LLWLLDWDDLLWLWWD',
  'LDDLDDWDDLWWLWLD',
];
export const G4_SHADE_NAME: Record<Shade, string> = { W: 'white', L: 'light grey', D: 'dark grey' };
/** Bonus printed on a grey cell, by "row,col". */
export const G4_CELL_BONUS: Readonly<Record<string, Bonus4>> = {
  '0,0': polish,
  '0,5': qGreen,
  '0,12': polish,
  '1,7': reroll,
  '1,15': qGreen,
  '2,3': qPink,
  '2,5': polish,
  '2,9': polish,
  '2,13': qBlue,
  '3,0': reroll,
  '3,7': plusOne,
  '3,11': qYellow,
  '3,14': polish,
};
/** Points for each completely crossed column. */
export const G4_COL_POINTS: readonly number[] = [1, 2, 3, 4, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11];

export interface GreyPart {
  index: number;
  shade: Shade;
  /** Cells as [row, col]. */
  cells: readonly (readonly [number, number])[];
  start: boolean;
}

function computeParts(): GreyPart[] {
  const id: number[][] = G4_SHADES.map((r) => r.split('').map(() => -1));
  const parts: GreyPart[] = [];
  for (let r = 0; r < G4_ROWS; r++) {
    for (let c = 0; c < G4_COLS; c++) {
      if (id[r][c] >= 0) continue;
      const shade = G4_SHADES[r][c] as Shade;
      const cells: [number, number][] = [];
      const stack: [number, number][] = [[r, c]];
      id[r][c] = parts.length;
      while (stack.length) {
        const [y, x] = stack.pop()!;
        cells.push([y, x]);
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < G4_ROWS && nx >= 0 && nx < G4_COLS && id[ny][nx] < 0 && G4_SHADES[ny][nx] === shade) {
            id[ny][nx] = parts.length;
            stack.push([ny, nx]);
          }
        }
      }
      cells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      parts.push({ index: parts.length, shade, cells, start: c === 0 && (r === 0 || r === 1) });
    }
  }
  return parts;
}

export const G4_PARTS: readonly GreyPart[] = computeParts();
/** Part index of each cell, row-major. */
export const G4_PART_OF: readonly number[] = (() => {
  const out = new Array<number>(G4_ROWS * G4_COLS).fill(-1);
  for (const p of G4_PARTS) for (const [r, c] of p.cells) out[r * G4_COLS + c] = p.index;
  return out;
})();

// Green: 11 fields split into an upper and a lower triangle; each "row" of triangles is filled left
// to right. Writing in a lower triangle gives the bonus under the field. A field with both
// triangles filled scores their sum, doubled from the 4th field on.
export const GR4_FIELDS = 11;
export const GR4_BONUS: readonly Bonus4[] = [reroll, qBlue, polish, qYellow, qGrey, plusOne, qPink, qBlue, qYellow, fox, plusOne];
export const GR4_DOUBLE_FROM = 3;

// Pink: 12 fields filled left to right. Points above the last written field; even numbers are
// circled for extra points; a 3 immediately writes another 3; a 5 or 6 triggers the bonus below.
export const P4_POINTS: readonly number[] = [2, 4, 6, 9, 12, 15, 19, 23, 27, 32, 37, 42];
export const P4_BONUS: readonly (Bonus4 | null)[] = [polish, null, qGreen, plusOne, reroll, null, qGrey, fox, null, qBlue, null, qYellow];
/** Extra end-game points for a circled number (index = number). */
export const P4_CIRCLE_POINTS: readonly number[] = [0, 0, 2, 0, 4, 0, 3];

export const REROLL_SLOTS4 = 7;
export const POLISH_SLOTS4 = 9;
export const PLUS_ONE_SLOTS4 = 7;
/** Bonus gained when the last slot of an action row is unlocked (only the re-roll row has one). */
export const ROW_END_BONUS4: Record<'reroll' | 'polish' | 'plusOne', Bonus4 | null> = { reroll: qPink, polish: null, plusOne: null };

export const ROUND_BONUS4: readonly (Bonus4 | null)[] = [reroll, plusOne, polish, qAny, null, null];

export const SOLO_RATINGS4: readonly { min: number; label: string }[] = [
  { min: 450, label: 'Clever 4ever!' },
  { min: 420, label: 'Clever once again!' },
  { min: 390, label: 'Hey, Einstein!' },
  { min: 360, label: 'Your friends will envy you.' },
  { min: 330, label: "That's pretty clever!" },
  { min: 300, label: 'Prodigy in training' },
  { min: 270, label: "It's going up" },
  { min: 240, label: "Don't get so upset!" },
  { min: 210, label: 'There is still room to improve' },
  { min: 180, label: 'It was just bad luck' },
  { min: 0, label: "Let's talk about something else" },
];

export function describeBonus4(b: Bonus4): string {
  switch (b.type) {
    case 'reroll':
      return 'Re-roll';
    case 'plusOne':
      return '+1 die';
    case 'polish':
      return 'Polish silver';
    case 'fox':
      return 'Fox';
    case 'q':
      return b.color === 'any' ? '? (any colour)' : `${b.color} ?`;
  }
}
