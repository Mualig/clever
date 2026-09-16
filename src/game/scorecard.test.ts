import { describe, expect, it } from 'vitest';
import { manualOptions, newGame, newScoreCard, pendingTargets, reduce, RuleError } from './engine';
import type { Sheet4 } from './rules4';
import type { Sheet } from './types';

describe('score-card mode (real dice, boxes marked by hand)', () => {
  it('starts in the manual phase with the first round bonus and rejects turn actions', () => {
    const g = newScoreCard(['A', 'B'], 'clever', 1);
    expect(g.manual).toBe(true);
    expect(g.phase).toEqual({ kind: 'manual' });
    expect((g.players[0].sheet as Sheet).rerollsUnlocked).toBe(1);
    expect(() => reduce(g, { type: 'pick', color: 'yellow', target: null })).toThrow(RuleError);
    expect(() => reduce(g, { type: 'endActive' })).toThrow(RuleError);
    expect(() => reduce(newGame(['A'], 'clever', 1), { type: 'nextRound' })).toThrow(RuleError);
  });

  it('offers every box once per distinct outcome', () => {
    const g = newScoreCard(['A'], 'clever', 1);
    const o = manualOptions(g, 0);
    const byArea = (a: string) => o.filter((x) => (x.target as { area: string }).area === a);
    expect(byArea('yellow')).toHaveLength(12); // 16 cells minus 4 pre-printed
    expect(byArea('blue')).toHaveLength(11); // sums 2..12
    expect(byArea('green')).toHaveLength(1); // the number does not change the result
    expect(byArea('orange')).toHaveLength(6); // one per written number
    expect(byArea('purple')).toHaveLength(6);
    const g4 = newScoreCard(['A'], 'clever4', 1);
    const o4 = manualOptions(g4, 0);
    expect(o4.filter((x) => (x.target as { area: string }).area === 'blue')).toHaveLength(36);
    expect(o4.filter((x) => (x.target as { area: string }).area === 'grey')).toHaveLength(2);
  });

  it('marks boxes on any sheet and chains the bonuses', () => {
    let g = newScoreCard(['A', 'B'], 'clever', 1);
    g = reduce(g, { type: 'mark', player: 1, target: { area: 'orange' }, value: 4, blue: 1 });
    expect((g.players[1].sheet as Sheet).orange).toEqual([4]);
    g = reduce(g, { type: 'mark', player: 1, target: { area: 'blue', value: 9 }, value: 4, blue: 5 });
    expect((g.players[1].sheet as Sheet).blue[9 - 2]).toBe(true);
    expect(() => reduce(g, { type: 'mark', player: 1, target: { area: 'blue', value: 9 }, value: 4, blue: 5 })).toThrow(RuleError);
    expect(() => reduce(g, { type: 'mark', player: 1, target: { area: 'yellow', cell: 0 }, value: 5, blue: 1 })).toThrow(RuleError);
    // the first yellow row (3, 6, 5, pre-printed) completes → blue X to choose
    for (const [cell, value] of [
      [0, 3],
      [1, 6],
      [2, 5],
    ]) g = reduce(g, { type: 'mark', player: 1, target: { area: 'yellow', cell }, value, blue: 1 });
    expect(g.pending).toHaveLength(1);
    expect(g.pending[0].player).toBe(1);
    g = reduce(g, { type: 'resolve', target: pendingTargets(g)[0] });
    expect(g.pending).toHaveLength(0);
  });

  it('advances rounds by hand, granting the round bonuses, and finishes after the last one', () => {
    let g = newScoreCard(['A', 'B'], 'clever', 1);
    g = reduce(g, { type: 'nextRound' });
    expect(g.round).toBe(2);
    expect((g.players[0].sheet as Sheet).plusOnesUnlocked).toBe(1);
    expect((g.players[1].sheet as Sheet).plusOnesUnlocked).toBe(1);
    g = reduce(g, { type: 'nextRound' });
    g = reduce(g, { type: 'nextRound' }); // round 4: X or 6 to choose, for each player
    expect(g.round).toBe(4);
    expect(g.pending).toHaveLength(2);
    expect(() => reduce(g, { type: 'nextRound' })).toThrow(RuleError);
    g = reduce(g, { type: 'resolve', target: pendingTargets(g)[0] });
    g = reduce(g, { type: 'resolve', target: pendingTargets(g)[0] });
    g = reduce(g, { type: 'nextRound' });
    g = reduce(g, { type: 'nextRound' });
    expect(g.round).toBe(6);
    g = reduce(g, { type: 'nextRound' });
    expect(g.phase).toEqual({ kind: 'gameOver' });
  });

  it('records actions spent at the table', () => {
    let g = newScoreCard(['A'], 'clever4', 1);
    g = reduce(g, { type: 'useAction', player: 0, action: 'reroll' });
    expect((g.players[0].sheet as Sheet4).rerollsUsed).toBe(1);
    expect(() => reduce(g, { type: 'useAction', player: 0, action: 'reroll' })).toThrow(RuleError);
    expect(() => reduce(g, { type: 'useAction', player: 0, action: 'polish' })).toThrow(RuleError);
  });
});
