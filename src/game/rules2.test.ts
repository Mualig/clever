import { describe, expect, it } from 'vitest';
import { canReturn, currentPlayer, diceAt, newGame, passiveCandidates, pendingTargets, plusOneCandidates, reduce, RuleError, targetsFor } from './engine';
import {
  blueTargets,
  bonusTargets2,
  greenPair,
  markSilver,
  markYellow,
  newSheet2,
  score2,
  silverTargets,
  writeBlue,
  writeGreen,
  writePink,
  yellowTargets,
  type Sheet2,
  type Target2,
} from './rules2';
import { B2_BONUS, G2_BONUS, P2_BONUS, ROUND_BONUS2, SILVER_COL_BONUS, Y2_CELLS, Y2_COL_BONUS, Y2_ROW_BONUS, type Bonus2 } from './sheet2';
import type { GameState } from './types';

const allBonuses = (): Bonus2[] => [...SILVER_COL_BONUS, ...Y2_ROW_BONUS, ...Y2_COL_BONUS, ...B2_BONUS, ...G2_BONUS, ...P2_BONUS, ...ROUND_BONUS2].filter((b): b is Bonus2 => b !== null);
const count = (type: Bonus2['type']) => allBonuses().filter((b) => b.type === type).length;
const cellOf = (value: number, nth = 0) => Y2_CELLS.findIndex((c, i) => c.value === value && Y2_CELLS.slice(0, i).filter((d) => d.value === value).length === nth);

describe('Doppelt so clever sheet data', () => {
  it('offers exactly six unlocks of each action', () => {
    expect(count('reroll')).toBe(6);
    expect(count('return')).toBe(6);
    expect(count('plusOne')).toBe(6);
  });
  it('has five foxes on the sheet plus one at the end of the re-roll row', () => {
    expect(count('fox')).toBe(5);
  });
  it('prints every number once or twice in the yellow area', () => {
    const per = [1, 2, 3, 4, 5, 6].map((n) => Y2_CELLS.filter((c) => c.value === n).length);
    expect(per).toEqual([1, 2, 2, 2, 2, 1]);
  });
});

describe('silver', () => {
  it('marks a number in any row and rewards completed columns', () => {
    const s = newSheet2();
    expect(silverTargets(s, 3)).toHaveLength(4);
    expect(markSilver(s, 0, 2)).toEqual([]);
    expect(silverTargets(s, 3)).toHaveLength(3);
    expect(markSilver(s, 1, 2)).toEqual([]);
    expect(markSilver(s, 2, 2)).toEqual([]);
    expect(markSilver(s, 3, 2)).toEqual([{ type: 'fox' }]);
    expect(score2(s).areas[0].points).toBe(4 * 2);
    expect(score2(s).foxes).toBe(1);
  });
  it('scores rows by the number of marks', () => {
    const s = newSheet2();
    for (let c = 0; c < 6; c++) markSilver(s, 0, c);
    expect(score2(s).areas[0].points).toBe(22);
  });
});

describe('yellow', () => {
  it('circles first, crosses second, and only crosses score', () => {
    const s = newSheet2();
    const c1 = cellOf(1);
    expect(yellowTargets(s, 1)).toEqual([{ area: 'yellow', cell: c1 }]);
    expect(markYellow(s, c1)).toEqual([]);
    expect(s.yellow[c1]).toBe(1);
    expect(score2(s).areas[1].points).toBe(0);
    expect(yellowTargets(s, 1)).toEqual([{ area: 'yellow', cell: c1 }]);
    expect(markYellow(s, c1)).toEqual([]);
    expect(score2(s).areas[1].points).toBe(3);
    expect(yellowTargets(s, 1)).toEqual([]);
    expect(() => markYellow(s, c1)).toThrow();
  });
  it('gives line bonuses as soon as every number of the line is circled', () => {
    const s = newSheet2();
    // Row 1 holds 1 and 2 (return); column 0 holds 1 and the second 2 (re-roll).
    markYellow(s, cellOf(1));
    expect(markYellow(s, cellOf(2, 0))).toEqual([{ type: 'return' }]);
    expect(markYellow(s, cellOf(2, 1))).toEqual([{ type: 'reroll' }]);
    // Crossing afterwards gives nothing more.
    expect(markYellow(s, cellOf(1))).toEqual([]);
  });
});

describe('blue', () => {
  it('requires each number to be at most the previous one and gives the printed bonuses', () => {
    const s = newSheet2();
    expect(blueTargets(s, 12)).toHaveLength(1);
    expect(writeBlue(s, 9)).toEqual([]);
    expect(blueTargets(s, 10)).toEqual([]);
    expect(writeBlue(s, 9)).toEqual([{ type: 'return' }]);
    expect(writeBlue(s, 7)).toEqual([{ type: 'q', color: 'yellow' }]);
    expect(() => writeBlue(s, 8)).toThrow();
    expect(score2(s).areas[2].points).toBe(6);
  });
});

describe('green', () => {
  it('writes die × multiplier and scores every pair as first minus second', () => {
    const s = newSheet2();
    expect(writeGreen(s, 5)).toEqual([]);
    expect(s.green).toEqual([10]);
    expect(greenPair(s, 0)).toBeNull();
    expect(score2(s).areas[3].points).toBe(0);
    expect(writeGreen(s, 1)).toEqual([{ type: 'reroll' }]);
    expect(greenPair(s, 0)).toBe(8);
    writeGreen(s, 1);
    writeGreen(s, 6);
    expect(greenPair(s, 1)).toBe(-4);
    expect(score2(s).areas[3].points).toBe(4);
  });
});

describe('pink', () => {
  it('accepts any number but only pays the bonus from the printed minimum', () => {
    const s = newSheet2();
    expect(writePink(s, 1)).toEqual([]);
    expect(writePink(s, 1)).toEqual([]);
    expect(writePink(s, 1)).toEqual([]); // ≥2 needed for the re-roll
    expect(writePink(s, 3)).toEqual([{ type: 'return' }]);
    expect(score2(s).areas[4].points).toBe(6);
  });
  it('counts the fox only when the eighth number is at least 2', () => {
    const s = newSheet2();
    for (let i = 0; i < 7; i++) writePink(s, 1);
    writePink(s, 1);
    expect(score2(s).foxes).toBe(0);
    const t = newSheet2();
    for (let i = 0; i < 7; i++) writePink(t, 1);
    expect(writePink(t, 2)).toEqual([{ type: 'fox' }]);
    expect(score2(t).foxes).toBe(1);
  });
});

describe('? bonuses', () => {
  it('offer every free box of the area, and all areas for the black ?', () => {
    const s = newSheet2();
    expect(bonusTargets2(s, { type: 'q', color: 'silver' })).toHaveLength(24);
    expect(bonusTargets2(s, { type: 'q', color: 'yellow' })).toHaveLength(10);
    expect(bonusTargets2(s, { type: 'q', color: 'blue' })).toHaveLength(11);
    expect(bonusTargets2(s, { type: 'q', color: 'green' })).toHaveLength(6);
    expect(bonusTargets2(s, { type: 'q', color: 'pink' })).toHaveLength(6);
    expect(bonusTargets2(s, { type: 'q', color: 'any' })).toHaveLength(24 + 10 + 11 + 6 + 6);
  });
});

function setDice(g: GameState, values: Partial<Record<keyof GameState['dice']['values'], number>>): GameState {
  const s = structuredClone(g);
  Object.assign(s.dice.values, values);
  return s;
}

describe('engine: silver die sweeps dice that may be marked too', () => {
  it('offers optional extra silver marks for the lower dice', () => {
    let g = newGame(['A', 'B'], 'clever2', 5);
    g = setDice(g, { orange: 4, white: 2, blue: 1, yellow: 5, green: 6, purple: 4 });
    const t = targetsFor(g, 0, 'orange') as Target2[];
    expect(t).toHaveLength(4);
    g = reduce(g, { type: 'pick', color: 'orange', target: t[0] });
    expect(g.pending.map((p) => p.bonus)).toEqual([
      { type: 'sx', value: 2, row: null },
      { type: 'sx', value: 1, row: 1 },
    ]);
    expect(g.pending.every((p) => p.optional)).toBe(true);
    // The wild white 2 may go in any of the four rows.
    expect(pendingTargets(g)).toHaveLength(4);
    g = reduce(g, { type: 'skipBonus' });
    // The blue 1 may only go in the blue row.
    const extra = pendingTargets(g) as Target2[];
    expect(extra).toEqual([{ area: 'silver', row: 1, col: 0 }]);
    g = reduce(g, { type: 'resolve', target: extra[0] });
    const sheet = g.players[0].sheet as Sheet2;
    expect(sheet.silver[0][3]).toBe(true);
    expect(sheet.silver[1][0]).toBe(true);
    expect(sheet.silver.flat().filter(Boolean)).toHaveLength(2);
  });
  it('lets a silver die swept by the white die be marked in any row', () => {
    let g = newGame(['A', 'B'], 'clever2', 5);
    g = setDice(g, { white: 5, orange: 3, yellow: 6, green: 6, blue: 6, purple: 6 });
    g = reduce(g, { type: 'pick', color: 'white', target: { area: 'silver', row: 0, col: 4 } });
    expect(g.pending.map((p) => p.bonus)).toEqual([{ type: 'sx', value: 3, row: null }]);
    expect(pendingTargets(g)).toHaveLength(4);
  });
  it('gives passive players no extra marks', () => {
    let g = newGame(['A', 'B'], 'clever2', 5);
    g = setDice(g, { orange: 1, white: 6, blue: 6, yellow: 6, green: 6, purple: 6 });
    g = reduce(g, { type: 'pick', color: 'white', target: { area: 'pink', value: 6 } });
    g = reduce(g, { type: 'pass' });
    g = reduce(g, { type: 'pass' });
    g = reduce(g, { type: 'endActive' });
    expect(currentPlayer(g)).toBe(1);
    expect(diceAt(g, 'platter')).toContain('orange');
    g = reduce(g, { type: 'passivePick', color: 'orange', target: (targetsFor(g, 1, 'orange') as Target2[])[0] });
    expect(g.pending).toEqual([]);
  });
});

describe('engine: return action', () => {
  it('lets the active player take a platter die back before the next roll', () => {
    let g = newGame(['A', 'B'], 'clever2', 11);
    (g.players[0].sheet as Sheet2).returnsUnlocked = 1;
    g = setDice(g, { yellow: 6, white: 1, blue: 1, orange: 1, green: 1, purple: 1 });
    g = reduce(g, { type: 'pick', color: 'yellow', target: { area: 'yellow', cell: cellOf(6) } });
    expect(g.phase).toEqual({ kind: 'beforeRoll', step: 1 });
    expect(diceAt(g, 'platter')).toHaveLength(5);
    expect(canReturn(g)).toBe(true);
    expect(() => reduce(g, { type: 'returnDie', color: 'yellow' })).toThrow(RuleError);
    g = reduce(g, { type: 'returnDie', color: 'blue' });
    expect(g.phase).toEqual({ kind: 'active', step: 1 });
    expect(diceAt(g, 'pool')).toEqual(['blue']);
    expect((g.players[0].sheet as Sheet2).returnsUsed).toBe(1);
    expect(g.log.at(-1)!.text).toMatch(/Return/);
  });
  it('can be declined by rolling, and is not offered without platter dice', () => {
    let g = newGame(['A', 'B'], 'clever2', 11);
    (g.players[0].sheet as Sheet2).returnsUnlocked = 2;
    g = setDice(g, { yellow: 1, white: 3, blue: 3, orange: 3, green: 3, purple: 3 });
    g = reduce(g, { type: 'pick', color: 'yellow', target: { area: 'yellow', cell: cellOf(1) } });
    expect(g.phase).toEqual({ kind: 'active', step: 1 });
    g = setDice(g, { white: 6, blue: 1, orange: 1, green: 1, purple: 1 });
    g = reduce(g, { type: 'pick', color: 'white', target: { area: 'pink', value: 6 } });
    expect(g.phase).toEqual({ kind: 'beforeRoll', step: 2 });
    g = reduce(g, { type: 'roll' });
    expect(g.phase).toEqual({ kind: 'activeExtra' });
  });
});

function lcg(seed: number) {
  let x = seed >>> 0;
  return (n: number) => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return Math.floor((x / 2 ** 32) * n);
  };
}

function playRandom(g: GameState, rnd: (n: number) => number): GameState {
  let steps = 0;
  let returns = 0;
  while (g.phase.kind !== 'gameOver' && steps++ < 4000) {
    const p = currentPlayer(g);
    if (g.pending.length > 0) {
      const t = pendingTargets(g);
      g = g.pending[0].optional && rnd(3) === 0 ? reduce(g, { type: 'skipBonus' }) : reduce(g, { type: 'resolve', target: t[rnd(t.length)] });
      continue;
    }
    switch (g.phase.kind) {
      case 'active': {
        const usable = diceAt(g, 'pool').filter((c) => targetsFor(g, p, c).length > 0);
        if (usable.length === 0) {
          g = reduce(g, { type: 'pass' });
          break;
        }
        const c = usable[rnd(usable.length)];
        const t = targetsFor(g, p, c);
        g = reduce(g, { type: 'pick', color: c, target: t[rnd(t.length)] });
        break;
      }
      case 'beforeRoll': {
        const platter = diceAt(g, 'platter');
        if (rnd(2) === 0) {
          returns++;
          g = reduce(g, { type: 'returnDie', color: platter[rnd(platter.length)] });
        } else g = reduce(g, { type: 'roll' });
        break;
      }
      case 'activeExtra': {
        const c = plusOneCandidates(g, p);
        if (c.length > 0 && rnd(2) === 0) g = reduce(g, { type: 'plusOne', color: c[0], target: targetsFor(g, p, c[0])[0] });
        else g = reduce(g, { type: 'endActive' });
        break;
      }
      case 'passive': {
        if (!g.phase.picked) {
          const c = passiveCandidates(g, p);
          g = c.length > 0 ? reduce(g, { type: 'passivePick', color: c[0], target: targetsFor(g, p, c[0])[0] }) : reduce(g, { type: 'passiveSkip' });
        } else {
          const c = plusOneCandidates(g, p);
          g = c.length > 0 && rnd(2) === 0 ? reduce(g, { type: 'plusOne', color: c[0], target: targetsFor(g, p, c[0])[0] }) : reduce(g, { type: 'passiveDone' });
        }
        break;
      }
    }
  }
  expect(g.phase.kind).toBe('gameOver');
  expect(returns).toBeGreaterThan(0);
  return g;
}

describe('full games', () => {
  it('plays a two-player game to the end', () => {
    const g = playRandom(newGame(['A', 'B'], 'clever2', 42), lcg(42));
    expect(g.round).toBe(6);
    for (const p of g.players) {
      const s = score2(p.sheet as Sheet2);
      expect(Number.isFinite(s.total)).toBe(true);
      expect(s.areas.map((a) => a.key)).toEqual(['silver', 'yellow', 'blue', 'green', 'pink']);
    }
  });
  it('plays a solo game with alternating roles', () => {
    const g = playRandom(newGame(['Solo'], 'clever2', 7), lcg(7));
    expect(g.solo).toBe(true);
    expect(g.round).toBe(6);
  });
});
