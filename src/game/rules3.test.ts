import { describe, expect, it } from 'vitest';
import { currentPlayer, newGame, passiveCandidates, pendingTargets, plusOneCandidates, reduce, RuleError, targetsFor } from './engine';
import {
  anyNumberChoices3,
  applyAuto3,
  blueTargets,
  bonusTargets3,
  brownTargets,
  crossBrown,
  crossTurquoise,
  crossYellow,
  newSheet3,
  pinkTargets,
  score3,
  writeBlue,
  writePink,
  yellowTargets,
  type Sheet3,
  type Target3,
} from './rules3';
import { ANY_NUMBER_SLOTS, B3_BONUS, BR3_GAP_BONUS, P3_BONUS, ROUND_BONUS3, T3_COL_BONUS, T3_ROW_BONUS, Y3_GAP_BONUS, type Bonus3 } from './sheet3';
import { DIE_COLORS } from './sheet';
import type { GameState } from './types';

const allBonuses = (): Bonus3[] =>
  [...Y3_GAP_BONUS.flat(), ...T3_ROW_BONUS, ...T3_COL_BONUS, ...B3_BONUS, ...BR3_GAP_BONUS, ...P3_BONUS, ...ROUND_BONUS3].filter((b): b is Bonus3 => b !== null);
const count = (type: Bonus3['type']) => allBonuses().filter((b) => b.type === type).length;

describe('Clever hoch Drei sheet data', () => {
  it('offers exactly seven unlocks of each action', () => {
    expect(count('reroll')).toBe(7);
    expect(count('anyNumber')).toBe(7);
    expect(count('plusOne')).toBe(7);
  });
  it('has five foxes on the sheet plus one at the end of the re-roll row', () => {
    expect(count('fox')).toBe(5);
  });
});

describe('yellow', () => {
  it('active dice are bound to the row of their die field, passive dice to grey cells', () => {
    const s = newSheet3();
    expect(yellowTargets(s, 3, { role: 'active', field: 1, companions: [] })).toEqual([{ area: 'yellow', row: 1, col: 2 }]);
    expect(yellowTargets(s, 3, { role: 'passive', field: null, companions: [] })).toEqual([{ area: 'yellow', row: 1, col: 2 }]);
    expect(yellowTargets(s, 1, { role: 'passive', field: null, companions: [] })).toEqual([{ area: 'yellow', row: 2, col: 0 }]);
    expect(yellowTargets(s, 1, null)).toHaveLength(3);
  });
  it('gives the bonus between two crossed cells', () => {
    const s = newSheet3();
    expect(crossYellow(s, 0, 5)).toEqual([]);
    expect(crossYellow(s, 1, 5)).toEqual([{ type: 'fox' }]);
    expect(crossYellow(s, 2, 5)).toEqual([{ type: 'plusOne' }]);
    expect(score3(s).areas[0].points).toBe(2 * 3);
    expect(score3(s).foxes).toBe(1);
  });
});

describe('turquoise', () => {
  it('rewards completed coloured rows and columns only', () => {
    const s = newSheet3();
    // row 5 has one coloured cell; column 1 needs all five rows
    expect(crossTurquoise(s, 4, 0)).toEqual([]);
    expect(crossTurquoise(s, 4, 1)).toEqual([]); // white cell, no bonus
    for (const r of [0, 1, 2]) crossTurquoise(s, r, 0);
    expect(crossTurquoise(s, 3, 0)).toEqual([{ type: 'q', color: 'brown' }]);
    // column 6: only row 1 is coloured
    expect(crossTurquoise(s, 0, 5)).toEqual([{ type: 'reroll' }]);
    expect(score3(s).areas[1].points).toBe(3 + 1 + 1 + 1 + 3);
  });
});

describe('blue', () => {
  it('walks outwards by one, with 7 as a reset', () => {
    const s = newSheet3();
    expect(blueTargets(s, 7)).toEqual([]);
    expect(blueTargets(s, 6)).toEqual([{ area: 'blue', side: 'left', value: 6 }]);
    expect(blueTargets(s, 8)).toEqual([{ area: 'blue', side: 'right', value: 8 }]);
    expect(writeBlue(s, 'left', 6)).toEqual([]);
    expect(writeBlue(s, 'left', 7)).toEqual([{ type: 'anyNumber' }]);
    expect(blueTargets(s, 7)).toEqual([]);
    expect(blueTargets(s, 6)).toEqual([{ area: 'blue', side: 'left', value: 6 }]);
    writeBlue(s, 'left', 6);
    for (const v of [8, 9, 10, 11]) writeBlue(s, 'right', v);
    expect(score3(s).areas[2].points).toBe(9 + 13 + 4 + 4);
  });
  it('the blue ? bonus adds the white die', () => {
    const s = newSheet3();
    const t = bonusTargets3(s, { type: 'q', color: 'blue' }, 2);
    expect(t).toEqual([
      { area: 'blue', side: 'left', value: 6 },
      { area: 'blue', side: 'right', value: 8 },
    ]);
  });
});

describe('brown', () => {
  it('only allows crossing to the right of the last cross', () => {
    const s = newSheet3();
    expect(brownTargets(s, 4).map((t) => (t as { index: number }).index)).toEqual([3, 6]);
    expect(crossBrown(s, 6)).toEqual([]);
    expect(brownTargets(s, 4)).toEqual([]);
    expect(crossBrown(s, 7)).toEqual([{ type: 'plusOne' }]);
    expect(() => crossBrown(s, 2)).toThrow();
    expect(score3(s).areas[3].points).toBe(5);
  });
});

describe('pink', () => {
  it('halves for the bonus or multiplies for points', () => {
    const s = newSheet3();
    expect(pinkTargets(s, 5)).toEqual([{ area: 'pink', mode: 'bonus', value: 5 }]);
    expect(writePink(s, 'bonus', 5)).toEqual([]);
    expect(pinkTargets(s, 4)).toHaveLength(2);
    expect(writePink(s, 'bonus', 4)).toEqual([{ type: 'reroll' }]);
    expect(writePink(s, 'points', 4)).toEqual([]);
    expect(s.pink).toEqual([3, 2, 8]);
  });
});

describe('? bonuses', () => {
  it('pink ? offers each distinct outcome once', () => {
    const s = newSheet3();
    expect(bonusTargets3(s, { type: 'q', color: 'pink' }, 1)).toEqual([
      { area: 'pink', mode: 'bonus', value: 1 },
      { area: 'pink', mode: 'bonus', value: 3 },
      { area: 'pink', mode: 'bonus', value: 5 },
    ]);
    writePink(s, 'bonus', 6);
    expect(bonusTargets3(s, { type: 'q', color: 'pink' }, 1)).toHaveLength(3 + 6);
  });
});

describe('actions', () => {
  it('unlocking the seventh slot gives the row bonus; any-number slots keep their number', () => {
    const s = newSheet3();
    for (let i = 0; i < 6; i++) expect(applyAuto3(s, { type: 'reroll' })).toEqual([]);
    expect(applyAuto3(s, { type: 'reroll' })).toEqual([{ type: 'fox' }]);
    expect(applyAuto3(s, { type: 'reroll' })).toEqual([]);
    applyAuto3(s, { type: 'anyNumber' });
    expect(anyNumberChoices3(s)).toEqual([{ slot: 0, value: ANY_NUMBER_SLOTS[0] }]);
  });
});

const pool = (s: GameState) => DIE_COLORS.filter((c) => s.dice.location[c] === 'pool');

describe('engine with Clever hoch Drei', () => {
  it('starts with a re-roll and forfeits rolls with pass', () => {
    const g = newGame(['A', 'B'], 'clever3', 11);
    expect((g.players[0].sheet as Sheet3).rerollsUnlocked).toBe(1);
    expect(() => reduce(g, { type: 'pick', color: 'orange', target: null })).toThrow(RuleError);
    const g2 = reduce(g, { type: 'pass' });
    expect(g2.phase).toEqual({ kind: 'active', step: 1 });
    expect(pool(g2)).toHaveLength(6);
  });

  it('uses an any-number action to write a different number', () => {
    let g = newGame(['A', 'B'], 'clever3', 11);
    (g.players[0].sheet as Sheet3).anyUnlocked = 1; // slot 0 = "3"
    const brown = g.dice.values.orange;
    const t = targetsFor(g, 0, 'orange', { slot: 0, value: 3 }) as Target3[];
    expect(t).toContainEqual({ area: 'brown', index: 2 });
    expect(() => reduce(g, { type: 'pick', color: 'orange', target: { area: 'brown', index: 2 }, as: { slot: 0, value: 4 } })).toThrow(RuleError);
    g = reduce(g, { type: 'pick', color: 'orange', target: { area: 'brown', index: 2 }, as: { slot: 0, value: 3 } });
    expect((g.players[0].sheet as Sheet3).brown[2]).toBe(true);
    expect((g.players[0].sheet as Sheet3).anyUsed[0]).toBe(true);
    // the real value still decides what goes to the platter
    for (const c of DIE_COLORS) if (c !== 'orange') expect(g.dice.location[c]).toBe(g.dice.values[c] < brown ? 'platter' : 'pool');
  });

  it('matching dice on the die fields allow extra turquoise crosses, which may be skipped', () => {
    let g = newGame(['A', 'B'], 'clever3', 5);
    // force a situation: yellow die and turquoise (green) die both show 4 in the pool
    g.dice.values.yellow = 4;
    g.dice.values.green = 4;
    g = reduce(g, { type: 'pick', color: 'yellow', target: { area: 'yellow', row: 0, col: 3 } });
    expect(g.dice.location.green).toBe('pool');
    g.dice.values.green = 4; // the pool was re-rolled; force the match again
    g = reduce(g, { type: 'pick', color: 'green', target: { area: 'turquoise', row: 0, col: 3 } });
    expect(g.pending).toHaveLength(1);
    expect(g.pending[0].optional).toBe(true);
    expect(pendingTargets(g)).toHaveLength(4);
    const g2 = reduce(g, { type: 'skipBonus' });
    expect(g2.pending).toHaveLength(0);
    const g3 = reduce(g, { type: 'resolve', target: { area: 'turquoise', row: 1, col: 3 } });
    expect((g3.players[0].sheet as Sheet3).turquoise[1][3]).toBe(true);
  });

  it('plays a full 2-player game to the end', () => {
    let g = newGame(['A', 'B'], 'clever3', 321);
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
          const t = targetsFor(g, p, color)[0];
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
    for (const p of g.players) expect(score3(p.sheet as Sheet3).total).toBeGreaterThan(0);
  });

  it('solo game runs to the end', () => {
    let g = newGame(['Solo'], 'clever3', 8);
    let guard = 0;
    while (g.phase.kind !== 'gameOver' && guard++ < 5000) {
      if (g.pending.length) {
        g = g.pending[0].optional ? reduce(g, { type: 'skipBonus' }) : reduce(g, { type: 'resolve', target: pendingTargets(g)[0] });
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
