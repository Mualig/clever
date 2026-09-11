import { describe, expect, it } from 'vitest';
import { canReroll, currentPlayer, newGame, passiveCandidates, plusOneCandidates, reduce, RuleError } from './engine';
import { bonusTargets, legalTargets, markBlue, markYellow, newSheet, recordOrange, recordPurple, scoreSheet, targetsForDie, winners } from './rules';
import {
  ACTION_SLOTS,
  BLUE_COLUMN_BONUS,
  BLUE_ROW_BONUS,
  DIE_COLORS,
  GREEN_BONUS,
  ORANGE_BONUS,
  PURPLE_BONUS,
  ROUND_BONUS,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_GRID,
  YELLOW_ROW_BONUS,
  type Bonus,
} from './sheet';
import type { DiceState, GameState } from './types';

const countBonus = (type: Bonus['type']) =>
  [...YELLOW_ROW_BONUS, YELLOW_DIAGONAL_BONUS, ...BLUE_ROW_BONUS, ...BLUE_COLUMN_BONUS, ...GREEN_BONUS, ...ORANGE_BONUS, ...PURPLE_BONUS, ...ROUND_BONUS]
    .filter((b): b is Bonus => b !== null && b.type === type).length;

describe('sheet data', () => {
  it('has each yellow value exactly twice', () => {
    for (let v = 1; v <= 6; v++) expect(YELLOW_GRID.filter((x) => x === v)).toHaveLength(2);
  });
  it('offers exactly as many re-rolls and +1 as there are action slots', () => {
    expect(countBonus('reroll')).toBe(ACTION_SLOTS);
    expect(countBonus('plusOne')).toBe(ACTION_SLOTS);
  });
  it('has five foxes', () => {
    expect(countBonus('fox')).toBe(5);
  });
});

describe('scoring', () => {
  it('scores the purple example from the rules', () => {
    const s = newSheet();
    for (const v of [2, 5, 6, 3]) recordPurple(s, v);
    expect(scoreSheet(s).purple).toBe(16);
    expect(() => recordPurple(s, 3)).toThrow();
  });
  it('multiplies orange boxes', () => {
    const s = newSheet();
    for (const v of [1, 1, 1, 4]) recordOrange(s, v);
    expect(s.orange).toEqual([1, 1, 1, 8]);
  });
  it('scores foxes with the lowest area', () => {
    const s = newSheet();
    // complete yellow column 1 (10 pts) and row 4 (fox)
    for (const cell of [0, 4, 8, 13, 14, 15]) markYellow(s, cell);
    const sc = scoreSheet(s);
    expect(sc.yellow).toBe(10);
    expect(sc.foxes).toBe(1);
    expect(sc.foxPoints).toBe(0); // blue etc. are 0
    for (const v of [2, 3, 4, 5]) markBlue(s, v);
    s.green = 3;
    recordOrange(s, 6);
    recordPurple(s, 6);
    const sc2 = scoreSheet(s);
    expect(sc2).toMatchObject({ yellow: 10, blue: 7, green: 6, orange: 6, purple: 6, foxes: 1, foxPoints: 6, total: 41 });
  });
  it('breaks ties by best single area', () => {
    const a = { yellow: 20, blue: 0, green: 0, orange: 0, purple: 0, foxes: 0, foxPoints: 0, total: 20 };
    const b = { yellow: 10, blue: 10, green: 0, orange: 0, purple: 0, foxes: 0, foxPoints: 0, total: 20 };
    expect(winners([a, b])).toEqual([0]);
    expect(winners([b, b])).toEqual([0, 1]);
  });
});

describe('bonuses on marking', () => {
  it('completing yellow row 1 gives a blue X, the diagonal a +1', () => {
    const s = newSheet();
    expect(markYellow(s, 0)).toEqual([]);
    expect(markYellow(s, 1)).toEqual([]);
    expect(markYellow(s, 2)).toEqual([{ type: 'x', color: 'blue' }]);
    markYellow(s, 5);
    expect(markYellow(s, 10)).toEqual([]);
    expect(markYellow(s, 15)).toEqual([{ type: 'plusOne' }]);
  });
  it('completing blue column 1 gives a re-roll, row 3 a fox', () => {
    const s = newSheet();
    expect(markBlue(s, 5)).toEqual([]);
    expect(markBlue(s, 9)).toEqual([{ type: 'reroll' }]);
    markBlue(s, 10);
    markBlue(s, 11);
    expect(markBlue(s, 12)).toEqual([{ type: 'fox' }]);
  });
});

describe('legal targets', () => {
  const dice = (values: Partial<DiceState['values']>): DiceState => ({
    values: { white: 1, yellow: 1, green: 1, blue: 1, orange: 1, purple: 1, ...values },
    location: Object.fromEntries(DIE_COLORS.map((c) => [c, 'pool'])) as DiceState['location'],
    chosenOrder: [],
  });
  it('green respects thresholds', () => {
    const s = newSheet();
    expect(legalTargets(s, 'green', 1)).toHaveLength(1);
    s.green = 4;
    expect(legalTargets(s, 'green', 4)).toHaveLength(0);
    expect(legalTargets(s, 'green', 5)).toHaveLength(1);
  });
  it('blue combines blue and white', () => {
    const s = newSheet();
    expect(targetsForDie(s, dice({ blue: 3, white: 4 }), 'blue')).toEqual([{ area: 'blue', value: 7 }]);
    const white = targetsForDie(s, dice({ blue: 3, white: 4 }), 'white');
    expect(white).toContainEqual({ area: 'blue', value: 7 });
    expect(white).toContainEqual({ area: 'yellow', cell: 11 });
    expect(white).toContainEqual({ area: 'green' });
  });
  it('round four choice offers yellow, blue, green, orange and purple', () => {
    const t = bonusTargets(newSheet(), { type: 'roundFour' });
    expect(new Set(t.map((x) => x.area))).toEqual(new Set(['yellow', 'blue', 'green', 'orange', 'purple']));
  });
});

const pool = (s: GameState) => DIE_COLORS.filter((c) => s.dice.location[c] === 'pool');
const platter = (s: GameState) => DIE_COLORS.filter((c) => s.dice.location[c] === 'platter');

describe('engine', () => {
  it('sets up rounds and grants the round 1 re-roll', () => {
    const g = newGame(['A', 'B', 'C'], 42);
    expect(g.totalRounds).toBe(5);
    expect(g.round).toBe(1);
    expect(g.players.every((p) => p.sheet.rerollsUnlocked === 1)).toBe(true);
    expect(g.phase).toEqual({ kind: 'active', step: 0 });
    expect(pool(g)).toHaveLength(6);
    expect(canReroll(g)).toBe(true);
  });

  it('moves lower dice to the platter after a pick', () => {
    const g = newGame(['A', 'B'], 7);
    // orange accepts anything: pick the orange die
    const v = g.dice.values.orange;
    const g2 = reduce(g, { type: 'pick', color: 'orange', target: { area: 'orange' } });
    expect(g2.players[0].sheet.orange).toEqual([v]);
    expect(g2.dice.location.orange).toBe('chosen');
    for (const c of DIE_COLORS) {
      if (c === 'orange') continue;
      expect(g2.dice.location[c]).toBe(g.dice.values[c] < v ? 'platter' : 'pool');
    }
    expect(g2.phase).toEqual(pool(g2).length ? { kind: 'active', step: 1 } : { kind: 'activeExtra' });
  });

  it('rejects illegal writes and unavailable dice', () => {
    const g = newGame(['A', 'B'], 7);
    expect(() => reduce(g, { type: 'pick', color: 'orange', target: { area: 'purple' } })).toThrow(RuleError);
    expect(() => reduce(g, { type: 'pick', color: 'orange', target: null })).toThrow(RuleError);
    expect(() => reduce(g, { type: 'endActive' })).toThrow(RuleError);
  });

  it('re-roll consumes an action', () => {
    const g = newGame(['A', 'B'], 7);
    const g2 = reduce(g, { type: 'reroll' });
    expect(g2.players[0].sheet.rerollsUsed).toBe(1);
    expect(canReroll(g2)).toBe(false);
  });

  it('plays a full 2-player game to the end', () => {
    let g = newGame(['A', 'B'], 123);
    let guard = 0;
    while (g.phase.kind !== 'gameOver' && guard++ < 10000) {
      const p = currentPlayer(g);
      if (g.pending.length) {
        const t = bonusTargets(g.players[p].sheet, g.pending[0].bonus)[0];
        g = reduce(g, { type: 'resolve', target: t });
        continue;
      }
      switch (g.phase.kind) {
        case 'active': {
          const color = pool(g)[0];
          const t = targetsForDie(g.players[p].sheet, g.dice, color)[0] ?? null;
          g = reduce(g, { type: 'pick', color, target: t });
          break;
        }
        case 'activeExtra': {
          const extra = plusOneCandidates(g, p);
          if (extra.length) {
            g = reduce(g, { type: 'plusOne', color: extra[0], target: targetsForDie(g.players[p].sheet, g.dice, extra[0])[0] });
          } else g = reduce(g, { type: 'endActive' });
          break;
        }
        case 'passive': {
          if (!g.phase.picked) {
            const cands = passiveCandidates(g, p);
            if (cands.length) g = reduce(g, { type: 'passivePick', color: cands[0], target: targetsForDie(g.players[p].sheet, g.dice, cands[0])[0] });
            else g = reduce(g, { type: 'passiveSkip' });
          } else g = reduce(g, { type: 'passiveDone' });
          break;
        }
      }
    }
    expect(g.phase.kind).toBe('gameOver');
    expect(g.round).toBe(6);
    for (const p of g.players) {
      expect(scoreSheet(p.sheet).total).toBeGreaterThan(0);
      expect(p.sheet.rerollsUsed).toBeLessThanOrEqual(p.sheet.rerollsUnlocked);
      expect(p.sheet.plusOnesUsed).toBeLessThanOrEqual(p.sheet.plusOnesUnlocked);
    }
  });

  it('solo: passive turn puts the three lowest dice on the platter', () => {
    let g = newGame(['Solo'], 99);
    expect(g.totalRounds).toBe(6);
    while (g.phase.kind === 'active') {
      if (g.pending.length) throw new Error('unexpected pending');
      const color = pool(g)[0];
      g = reduce(g, { type: 'pick', color, target: targetsForDie(g.players[0].sheet, g.dice, color)[0] ?? null });
    }
    g = reduce(g, { type: 'endActive' });
    expect(g.phase).toEqual({ kind: 'passive', player: 0, picked: false });
    const plat = platter(g);
    expect(plat).toHaveLength(3);
    const maxPlatter = Math.max(...plat.map((c) => g.dice.values[c]));
    const minOther = Math.min(...DIE_COLORS.filter((c) => !plat.includes(c)).map((c) => g.dice.values[c]));
    expect(maxPlatter).toBeLessThanOrEqual(minOther);
    expect(passiveCandidates(g, 0).every((c) => plat.includes(c))).toBe(true);
  });
});
