import { describe, expect, it } from 'vitest';
import { currentPlayer, newGame, passiveCandidates, pendingTargets, plusOneCandidates, reduce, RuleError, targetsFor } from './engine';
import {
  applyAuto4,
  blueTargets,
  bonusTargets4,
  crossBlue,
  crossGrey,
  greenFieldPoints,
  greyTargets,
  newSheet4,
  score4,
  writeGreen,
  writePink,
  writeYellow,
  yellowTargets,
  type Sheet4,
  type Target4,
} from './rules4';
import {
  B4_DIAG_BONUS,
  B4_ROW_BONUS,
  G4_CELL_BONUS,
  G4_COLS,
  G4_PARTS,
  G4_ROWS,
  G4_SHADES,
  GR4_BONUS,
  P4_BONUS,
  ROUND_BONUS4,
  ROW_END_BONUS4,
  Y4_BONUS,
  type Bonus4,
} from './sheet4';
import { DIE_COLORS } from './sheet';
import type { GameState } from './types';

const allBonuses = (): Bonus4[] =>
  [...Y4_BONUS.flat(), ...B4_ROW_BONUS, B4_DIAG_BONUS, ...Object.values(G4_CELL_BONUS), ...GR4_BONUS, ...P4_BONUS, ...ROUND_BONUS4, ROW_END_BONUS4.reroll].filter(
    (b): b is Bonus4 => b !== null,
  );
const count = (type: Bonus4['type']) => allBonuses().filter((b) => b.type === type).length;

describe('Clever 4Ever sheet data', () => {
  it('offers exactly as many unlocks as there are action slots', () => {
    expect(count('reroll')).toBe(7);
    expect(count('plusOne')).toBe(7);
    expect(count('polish')).toBe(9);
  });
  it('has four printed foxes plus three for the grey shades', () => {
    expect(count('fox')).toBe(4);
  });
  it('splits the grey area into 17 parts of at most 6 cells with two start parts', () => {
    expect(G4_PARTS).toHaveLength(17);
    expect(Math.max(...G4_PARTS.map((p) => p.cells.length))).toBe(6);
    expect(G4_PARTS.reduce((n, p) => n + p.cells.length, 0)).toBe(G4_ROWS * G4_COLS);
    const starts = G4_PARTS.filter((p) => p.start);
    expect(starts.map((p) => [p.shade, p.cells.length])).toEqual([
      ['D', 1],
      ['L', 4],
    ]);
    expect(G4_SHADES.every((r) => r.length === G4_COLS)).toBe(true);
  });
});

describe('yellow', () => {
  it('keeps the top row ascending and stops it after a 6', () => {
    const s = newSheet4();
    expect(yellowTargets(s, 4)).toHaveLength(3);
    expect(writeYellow(s, 0, 4)).toEqual([]);
    expect(yellowTargets(s, 4).map((t) => (t as { row: number }).row)).toEqual([1, 2]);
    expect(writeYellow(s, 0, 6)).toEqual([{ type: 'polish' }]);
    expect(yellowTargets(s, 6).map((t) => (t as { row: number }).row)).toEqual([1, 2]);
    expect(() => writeYellow(s, 0, 1)).toThrow();
  });
  it('scores plus minus columns, as in the rulebook example', () => {
    const s = newSheet4();
    for (const v of [2, 3, 5]) writeYellow(s, 0, v);
    for (const v of [1, 1, 5]) writeYellow(s, 1, v);
    for (const v of [6, 6, 5, 4]) writeYellow(s, 2, v);
    expect(score4(s).areas[0].points).toBe(21 - 7 + 10 + 10 + 15);
  });
  it('gives the middle-row bonuses and the top-row fox', () => {
    const s = newSheet4();
    expect(writeYellow(s, 1, 6)).toEqual([{ type: 'reroll' }]);
    expect(writeYellow(s, 1, 6)).toEqual([{ type: 'q', color: 'pink' }]);
    for (const v of [1, 2, 3, 4]) writeYellow(s, 0, v);
    expect(writeYellow(s, 0, 5)).toEqual([{ type: 'fox' }]);
    expect(writeYellow(s, 2, 1)).toEqual([]);
  });
});

describe('blue', () => {
  it('crosses the blue/white coordinate and rewards the second cross of a row or the diagonal', () => {
    const s = newSheet4();
    expect(blueTargets(s, 4, 2)).toEqual([{ area: 'blue', row: 3, col: 1 }]);
    expect(crossBlue(s, 0, 0)).toEqual([]);
    expect(crossBlue(s, 1, 1)).toEqual([{ type: 'reroll' }]);
    expect(crossBlue(s, 1, 3)).toEqual([{ type: 'q', color: 'pink' }]);
    expect(crossBlue(s, 1, 5)).toEqual([]);
    expect(blueTargets(s, 2, 6)).toEqual([]);
    expect(crossBlue(s, 2, 2)).toEqual([]); // third diagonal cross: no further bonus
  });
  it('scores columns with two crosses and the other diagonal', () => {
    const s = newSheet4();
    crossBlue(s, 0, 1);
    crossBlue(s, 3, 1);
    crossBlue(s, 2, 4);
    crossBlue(s, 5, 4);
    expect(score4(s).areas[1].points).toBe(8 + 11);
    crossBlue(s, 0, 5);
    crossBlue(s, 5, 0);
    expect(score4(s).areas[1].points).toBe(8 + 11 + 6);
  });
});

describe('grey', () => {
  it('starts with a red-framed part small enough for the die, then grows by adjacency', () => {
    const s = newSheet4();
    expect(greyTargets(s, 2)).toEqual([{ area: 'grey', part: 0 }]);
    expect(greyTargets(s, 4).map((t) => (t as { part: number }).part)).toEqual([0, 8]);
    expect(crossGrey(s, 0)).toEqual([{ type: 'polish' }]);
    expect(greyTargets(s, 6).map((t) => (t as { part: number }).part)).toEqual([1, 8]);
    expect(greyTargets(s, 3)).toEqual([]);
    expect(() => crossGrey(s, 0)).toThrow();
    expect(() => crossGrey(s, 15)).toThrow();
    expect(crossGrey(s, 8)).toEqual([{ type: 'reroll' }]);
    expect(score4(s).areas[2].points).toBe(1);
    expect(greyTargets(s, 2).map((t) => (t as { part: number }).part)).toEqual([15]);
  });
  it('gives the fox of a shade once every cell of that shade is crossed', () => {
    const s = newSheet4();
    for (let r = 0; r < G4_ROWS; r++) for (let c = 0; c < G4_COLS; c++) if (G4_SHADES[r][c] === 'D') s.grey[r * G4_COLS + c] = true;
    for (const [r, c] of G4_PARTS[15].cells) s.grey[r * G4_COLS + c] = false;
    s.grey[3 * G4_COLS] = true; // (3,0) crossed makes part 15 reachable
    expect(crossGrey(s, 15)).toEqual([{ type: 'fox' }]);
  });
});

describe('green', () => {
  it('fills two rows left to right, bonuses below, doubled sums from the fourth field', () => {
    const s = newSheet4();
    expect(writeGreen(s, 'top', 4)).toEqual([]);
    expect(writeGreen(s, 'bottom', 4)).toEqual([{ type: 'reroll' }]);
    expect(greenFieldPoints(s, 0)).toBe(8);
    expect(writeGreen(s, 'bottom', 2)).toEqual([{ type: 'q', color: 'blue' }]);
    expect(greenFieldPoints(s, 1)).toBeNull();
    for (const v of [6, 5, 4]) writeGreen(s, 'top', v);
    for (const v of [5, 3]) writeGreen(s, 'bottom', v);
    expect(greenFieldPoints(s, 3)).toBe((4 + 3) * 2);
    expect(score4(s).areas[3].points).toBe(8 + 8 + 10 + 14);
  });
});

describe('pink', () => {
  it('doubles a 3, circles even numbers and needs a 5 or 6 for the bonus below', () => {
    const s = newSheet4();
    expect(writePink(s, 3)).toEqual([]);
    expect(s.pink).toEqual([3, 3]);
    expect(writePink(s, 2)).toEqual([]);
    expect(writePink(s, 4)).toEqual([]); // field 4 has +1 below, but a 4 does not trigger it
    expect(writePink(s, 6)).toEqual([{ type: 'reroll' }]);
    expect(writePink(s, 1)).toEqual([]);
    expect(score4(s).areas[4].points).toBe(15 + 2 + 4 + 3);
  });
  it('a 3 in the last field does not overflow', () => {
    const s = newSheet4();
    for (let i = 0; i < 11; i++) writePink(s, 1);
    writePink(s, 3);
    expect(s.pink).toHaveLength(12);
  });
});

describe('? bonuses', () => {
  it('offers any number in the area, any free blue cell, and every colour for the black ?', () => {
    const s = newSheet4();
    expect(bonusTargets4(s, { type: 'q', color: 'pink' })).toHaveLength(6);
    expect(bonusTargets4(s, { type: 'q', color: 'blue' })).toHaveLength(36);
    expect(bonusTargets4(s, { type: 'q', color: 'grey' })).toHaveLength(2);
    expect(bonusTargets4(s, { type: 'q', color: 'yellow' })).toHaveLength(18);
    expect(bonusTargets4(s, { type: 'q', color: 'green' })).toHaveLength(12);
    expect(bonusTargets4(s, { type: 'q', color: 'any' })).toHaveLength(6 + 36 + 2 + 18 + 12);
  });
});

describe('actions', () => {
  it('unlocks slots left to right; only the re-roll row has an end bonus', () => {
    const s = newSheet4();
    for (let i = 0; i < 6; i++) expect(applyAuto4(s, { type: 'reroll' })).toEqual([]);
    expect(applyAuto4(s, { type: 'reroll' })).toEqual([{ type: 'q', color: 'pink' }]);
    expect(applyAuto4(s, { type: 'reroll' })).toEqual([]);
    for (let i = 0; i < 9; i++) expect(applyAuto4(s, { type: 'polish' })).toEqual([]);
    expect(s.polishUnlocked).toBe(9);
    expect(applyAuto4(s, { type: 'fox' })).toEqual([]);
    expect(s.foxes).toBe(1);
  });
});

const pool = (s: GameState) => DIE_COLORS.filter((c) => s.dice.location[c] === 'pool');
const sheetOf = (g: GameState, p: number) => g.players[p].sheet as Sheet4;

/** A 2-player game frozen at the first passive pick with every die on the silver platter. */
function passiveGame(seed = 7): GameState {
  const g = newGame(['A', 'B'], 'clever4', seed);
  g.phase = { kind: 'passive', player: 1, picked: false };
  for (const c of DIE_COLORS) g.dice.location[c] = 'platter';
  return g;
}

describe('engine with Clever 4Ever', () => {
  it('starts with a re-roll and unlocks polish in round 3', () => {
    const g = newGame(['A', 'B'], 'clever4', 11);
    expect(sheetOf(g, 0).rerollsUnlocked).toBe(1);
    expect(() => reduce(g, { type: 'pick', color: 'orange', target: null })).toThrow(RuleError);
  });

  it('polishes a platter die by paying one action per step', () => {
    let g = passiveGame();
    g.dice.values.purple = 3;
    sheetOf(g, 1).polishUnlocked = 2;
    expect(targetsFor(g, 1, 'purple', { polish: true, value: 5 })).toEqual([{ area: 'pink', value: 5 }]);
    expect(() => reduce(g, { type: 'passivePick', color: 'purple', target: { area: 'pink', value: 6 }, as: { polish: true, value: 6 } })).toThrow(RuleError);
    expect(() => reduce(g, { type: 'passivePick', color: 'purple', target: { area: 'pink', value: 3 }, as: { polish: true, value: 3 } })).toThrow(RuleError);
    g = reduce(g, { type: 'passivePick', color: 'purple', target: { area: 'pink', value: 5 }, as: { polish: true, value: 5 } });
    expect(sheetOf(g, 1).pink).toEqual([5]);
    expect(sheetOf(g, 1).polishUsed).toBe(2);
    expect(sheetOf(g, 1).polishUnlocked).toBe(3); // the 5 triggered the polish bonus under field 1
    expect(g.dice.values.purple).toBe(3); // the die itself keeps its number
  });

  it('the active player cannot polish a rolled die, but may polish the white partner of the blue die', () => {
    let g = newGame(['A', 'B'], 'clever4', 11);
    sheetOf(g, 0).polishUnlocked = 3;
    g.dice.values.blue = 4;
    g.dice.values.white = 2;
    expect(() => reduce(g, { type: 'pick', color: 'blue', target: { area: 'blue', row: 4, col: 1 }, as: { polish: true, value: 5 } })).toThrow(RuleError);
    g.dice.location.white = 'platter';
    expect(targetsFor(g, 0, 'blue', { polish: true, color: 'white', value: 3 })).toEqual([{ area: 'blue', row: 3, col: 2 }]);
    g = reduce(g, { type: 'pick', color: 'blue', target: { area: 'blue', row: 3, col: 2 }, as: { polish: true, color: 'white', value: 3 } });
    expect(sheetOf(g, 0).blue[3][2]).toBe(true);
    expect(sheetOf(g, 0).polishUsed).toBe(1);
  });

  it('a platter die that only fits after polishing counts as usable for the passive player', () => {
    const g = passiveGame();
    g.dice.values.blue = 3;
    g.dice.values.white = 2;
    sheetOf(g, 1).blue[2][1] = true;
    expect(passiveCandidates(g, 1)).not.toContain('blue');
    sheetOf(g, 1).polishUnlocked = 1;
    expect(passiveCandidates(g, 1)).toContain('blue');
  });

  it('+1 dice from the platter may be polished too', () => {
    let g = newGame(['A', 'B'], 'clever4', 11);
    g.phase = { kind: 'activeExtra' };
    for (const c of DIE_COLORS) g.dice.location[c] = 'platter';
    g.dice.values.yellow = 2;
    sheetOf(g, 0).plusOnesUnlocked = 1;
    sheetOf(g, 0).polishUnlocked = 1;
    expect(plusOneCandidates(g, 0)).toContain('yellow');
    g = reduce(g, { type: 'plusOne', color: 'yellow', target: { area: 'yellow', row: 2, value: 3 }, as: { polish: true, value: 3 } });
    expect(sheetOf(g, 0).yellow[2]).toEqual([3]);
    expect(sheetOf(g, 0).plusOnesUsed).toBe(1);
    expect(sheetOf(g, 0).polishUsed).toBe(1);
  });

  it('plays a full 2-player game to the end', () => {
    let g = newGame(['A', 'B'], 'clever4', 321);
    let guard = 0;
    while (g.phase.kind !== 'gameOver' && guard++ < 10000) {
      const p = currentPlayer(g);
      if (g.pending.length) {
        g = reduce(g, { type: 'resolve', target: pendingTargets(g)[0] });
        continue;
      }
      switch (g.phase.kind) {
        case 'active': {
          const color = pool(g)[0];
          const t = targetsFor(g, p, color)[0] as Target4 | undefined;
          g = t ? reduce(g, { type: 'pick', color, target: t }) : reduce(g, { type: 'pass' });
          break;
        }
        case 'activeExtra': {
          const extra = plusOneCandidates(g, p).filter((c) => targetsFor(g, p, c).length > 0);
          if (extra.length) g = reduce(g, { type: 'plusOne', color: extra[0], target: targetsFor(g, p, extra[0])[0] });
          else g = reduce(g, { type: 'endActive' });
          break;
        }
        case 'passive': {
          if (!g.phase.picked) {
            const cands = passiveCandidates(g, p).filter((c) => targetsFor(g, p, c).length > 0);
            if (cands.length) g = reduce(g, { type: 'passivePick', color: cands[0], target: targetsFor(g, p, cands[0])[0] });
            else g = reduce(g, { type: 'passiveSkip' });
          } else g = reduce(g, { type: 'passiveDone' });
          break;
        }
      }
    }
    expect(g.phase.kind).toBe('gameOver');
    for (const p of g.players) expect(score4(p.sheet as Sheet4).total).toBeGreaterThan(0);
  });

  it('solo game runs to the end', () => {
    let g = newGame(['Solo'], 'clever4', 8);
    let guard = 0;
    while (g.phase.kind !== 'gameOver' && guard++ < 5000) {
      if (g.pending.length) {
        g = reduce(g, { type: 'resolve', target: pendingTargets(g)[0] });
        continue;
      }
      if (g.phase.kind === 'active') {
        const color = pool(g)[0];
        const t = targetsFor(g, 0, color)[0];
        g = t ? reduce(g, { type: 'pick', color, target: t }) : reduce(g, { type: 'pass' });
      } else if (g.phase.kind === 'activeExtra') g = reduce(g, { type: 'endActive' });
      else if (g.phase.kind === 'passive') {
        if (!g.phase.picked) {
          const cands = passiveCandidates(g, 0).filter((c) => targetsFor(g, 0, c).length > 0);
          g = cands.length ? reduce(g, { type: 'passivePick', color: cands[0], target: targetsFor(g, 0, cands[0])[0] }) : reduce(g, { type: 'passiveSkip' });
        } else g = reduce(g, { type: 'passiveDone' });
      }
    }
    expect(g.phase.kind).toBe('gameOver');
    expect(g.round).toBe(6);
  });
});
