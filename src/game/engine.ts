import { nextRandom, randomSeed } from './rng';
import {
  applyAutoBonus,
  applyBonusAt,
  applyTarget,
  bonusTargets,
  dieValueFor,
  isChoiceBonus,
  newSheet,
  plusOnesLeft,
  rerollsLeft,
  sameTarget,
  targetsForDie,
} from './rules';
import { DIE_COLORS, ROUNDS_BY_PLAYER_COUNT, ROUND_BONUS, describeBonus, type Bonus, type DieColor } from './sheet';
import type { Action, DiceState, GameState, Sheet, Target } from './types';

export class RuleError extends Error {}

function fail(msg: string): never {
  throw new RuleError(msg);
}

// ---------------------------------------------------------------------------
// Queries (used by the UI and by the reducer)
// ---------------------------------------------------------------------------

/** Index of the player who has to act now, or -1 when the game is over. */
export function currentPlayer(s: GameState): number {
  if (s.pending.length > 0) return s.pending[0].player;
  switch (s.phase.kind) {
    case 'active':
    case 'activeExtra':
      return s.activePlayer;
    case 'passive':
      return s.phase.player;
    case 'gameOver':
      return -1;
  }
}

export function sheetOf(s: GameState, player: number): Sheet {
  return s.players[player].sheet;
}

export function diceAt(s: GameState, location: DiceState['location'][DieColor]): DieColor[] {
  return DIE_COLORS.filter((c) => s.dice.location[c] === location);
}

/** Dice a passive player may take: usable platter dice, else usable dice of the active player. */
export function passiveCandidates(s: GameState, player: number): DieColor[] {
  const sheet = sheetOf(s, player);
  const usable = (colors: DieColor[]) => colors.filter((c) => targetsForDie(sheet, s.dice, c).length > 0);
  const platter = usable(diceAt(s, 'platter'));
  if (platter.length > 0 || s.solo) return platter;
  return usable(diceAt(s, 'chosen'));
}

/** Whether `player` may currently spend a +1 action. */
export function canUsePlusOne(s: GameState, player: number): boolean {
  if (s.pending.length > 0) return false;
  const p = s.phase;
  const inWindow = (p.kind === 'activeExtra' && player === s.activePlayer) || (p.kind === 'passive' && p.player === player && p.picked);
  return inWindow && plusOnesLeft(sheetOf(s, player)) > 0;
}

/** Dice `player` may take with a +1 action right now. */
export function plusOneCandidates(s: GameState, player: number): DieColor[] {
  if (!canUsePlusOne(s, player)) return [];
  const sheet = sheetOf(s, player);
  return DIE_COLORS.filter((c) => !s.extraUsed[player].includes(c) && targetsForDie(sheet, s.dice, c).length > 0);
}

export function canReroll(s: GameState): boolean {
  return s.pending.length === 0 && s.phase.kind === 'active' && rerollsLeft(sheetOf(s, s.activePlayer)) > 0 && diceAt(s, 'pool').length > 0;
}

// ---------------------------------------------------------------------------
// Internal helpers (mutate a freshly cloned state)
// ---------------------------------------------------------------------------

function log(s: GameState, player: number, text: string) {
  s.log.push({ round: s.round, player, text });
}

function rollDice(s: GameState, colors: DieColor[]) {
  for (const c of colors) {
    const r = nextRandom(s.rng);
    s.rng = r.seed;
    s.dice.values[c] = 1 + Math.floor(r.value * 6);
  }
}

function random(s: GameState): number {
  const r = nextRandom(s.rng);
  s.rng = r.seed;
  return r.value;
}

/**
 * Hands `bonuses` to `player`. Automatic bonuses are applied at once (chaining as needed);
 * bonuses that need a decision are queued as pending choices.
 */
function grant(s: GameState, player: number, bonuses: Bonus[], atFront = false) {
  const queue = [...bonuses];
  const pending: GameState['pending'] = [];
  while (queue.length > 0) {
    const b = queue.shift()!;
    const sheet = sheetOf(s, player);
    if (isChoiceBonus(b)) {
      const targets = bonusTargets(sheet, b);
      if (targets.length === 0) {
        log(s, player, `Bonus ${describeBonus(b)} lost (no free box)`);
      } else if (targets.length === 1) {
        log(s, player, `Bonus ${describeBonus(b)} applied`);
        queue.unshift(...applyBonusAt(sheet, b, targets[0]));
      } else {
        pending.push({ player, bonus: b });
      }
    } else {
      log(s, player, `Bonus ${describeBonus(b)}`);
      queue.unshift(...applyAutoBonus(sheet, b));
    }
  }
  if (atFront) s.pending.unshift(...pending);
  else s.pending.push(...pending);
  normalizePending(s);
}

/** Drops pending choices that became impossible and auto-applies those with a single option. */
function normalizePending(s: GameState) {
  while (s.pending.length > 0) {
    const head = s.pending[0];
    const sheet = sheetOf(s, head.player);
    const targets = bonusTargets(sheet, head.bonus);
    if (targets.length > 1) return;
    s.pending.shift();
    if (targets.length === 0) {
      log(s, head.player, `Bonus ${describeBonus(head.bonus)} lost (no free box)`);
    } else {
      log(s, head.player, `Bonus ${describeBonus(head.bonus)} applied`);
      grant(s, head.player, applyBonusAt(sheet, head.bonus, targets[0]), true);
    }
  }
}

function startActiveTurn(s: GameState) {
  for (const c of DIE_COLORS) s.dice.location[c] = 'pool';
  s.dice.chosenOrder = [];
  s.extraUsed = s.players.map(() => []);
  rollDice(s, [...DIE_COLORS]);
  s.phase = { kind: 'active', step: 0 };
}

function startRound(s: GameState) {
  s.round += 1;
  s.turnInRound = 0;
  const bonus = ROUND_BONUS[s.round - 1];
  if (bonus) {
    for (let p = 0; p < s.players.length; p++) grant(s, p, [bonus]);
  }
  startActiveTurn(s);
}

function startSoloPassiveTurn(s: GameState) {
  rollDice(s, [...DIE_COLORS]);
  const order = [...DIE_COLORS]
    .map((c) => ({ c, v: s.dice.values[c], tie: random(s) }))
    .sort((a, b) => a.v - b.v || a.tie - b.tie)
    .map((x) => x.c);
  s.dice.chosenOrder = [];
  order.forEach((c, i) => {
    s.dice.location[c] = i < 3 ? 'platter' : 'chosen';
    if (i >= 3) s.dice.chosenOrder.push(c);
  });
  s.extraUsed = s.players.map(() => []);
  s.phase = { kind: 'passive', player: 0, picked: false };
}

function endTurn(s: GameState) {
  s.turnInRound += 1;
  if (s.solo || s.turnInRound >= s.players.length) {
    if (s.round >= s.totalRounds) {
      s.phase = { kind: 'gameOver' };
      return;
    }
    if (!s.solo) s.activePlayer = (s.activePlayer + 1) % s.players.length;
    startRound(s);
  } else {
    s.activePlayer = (s.activePlayer + 1) % s.players.length;
    startActiveTurn(s);
  }
}

function writeDie(s: GameState, player: number, color: DieColor, target: Target) {
  const sheet = sheetOf(s, player);
  const legal = targetsForDie(sheet, s.dice, color);
  if (!legal.some((t) => sameTarget(t, target))) fail(`the ${color} die cannot be written there`);
  const value = dieValueFor(s.dice, color, target.area);
  log(s, player, `${color} ${value} → ${target.area}`);
  grant(s, player, applyTarget(sheet, target, value));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function newGame(names: string[], seed: number = randomSeed()): GameState {
  if (names.length < 1 || names.length > 4) fail('1 to 4 players');
  const values = Object.fromEntries(DIE_COLORS.map((c) => [c, 1])) as DiceState['values'];
  const location = Object.fromEntries(DIE_COLORS.map((c) => [c, 'pool'])) as DiceState['location'];
  const s: GameState = {
    players: names.map((name) => ({ name, sheet: newSheet() })),
    solo: names.length === 1,
    totalRounds: ROUNDS_BY_PLAYER_COUNT[names.length],
    round: 0,
    activePlayer: 0,
    turnInRound: 0,
    dice: { values, location, chosenOrder: [] },
    phase: { kind: 'active', step: 0 },
    pending: [],
    extraUsed: names.map(() => []),
    rng: seed >>> 0,
    log: [],
  };
  startRound(s);
  return s;
}

/** Applies an action and returns the new state. Throws RuleError on illegal actions. */
export function reduce(prev: GameState, action: Action): GameState {
  const s = structuredClone(prev);
  if (s.phase.kind === 'gameOver') fail('game is over');

  if (action.type === 'resolve') {
    const head = s.pending[0];
    if (!head) fail('nothing to resolve');
    const sheet = sheetOf(s, head.player);
    if (!bonusTargets(sheet, head.bonus).some((t) => sameTarget(t, action.target))) fail('invalid bonus target');
    s.pending.shift();
    log(s, head.player, `Bonus ${describeBonus(head.bonus)} → ${action.target.area}`);
    grant(s, head.player, applyBonusAt(sheet, head.bonus, action.target), true);
    return s;
  }
  if (s.pending.length > 0) fail('a bonus must be resolved first');

  switch (action.type) {
    case 'reroll': {
      if (!canReroll(s)) fail('cannot re-roll now');
      sheetOf(s, s.activePlayer).rerollsUsed += 1;
      rollDice(s, diceAt(s, 'pool'));
      log(s, s.activePlayer, 'Re-roll');
      return s;
    }
    case 'pick': {
      if (s.phase.kind !== 'active') fail('not the active picking phase');
      if (s.dice.location[action.color] !== 'pool') fail('die not available');
      const sheet = sheetOf(s, s.activePlayer);
      if (action.target) {
        writeDie(s, s.activePlayer, action.color, action.target);
      } else {
        if (targetsForDie(sheet, s.dice, action.color).length > 0) fail('this die can be used and must be written');
        log(s, s.activePlayer, `${action.color} ${s.dice.values[action.color]} taken without marking`);
      }
      const chosenValue = s.dice.values[action.color];
      s.dice.location[action.color] = 'chosen';
      s.dice.chosenOrder.push(action.color);
      for (const c of diceAt(s, 'pool')) {
        if (s.dice.values[c] < chosenValue) s.dice.location[c] = 'platter';
      }
      const step = s.phase.step + 1;
      const pool = diceAt(s, 'pool');
      if (step >= 3 || pool.length === 0) {
        for (const c of pool) s.dice.location[c] = 'platter';
        s.phase = { kind: 'activeExtra' };
      } else {
        rollDice(s, pool);
        s.phase = { kind: 'active', step };
      }
      return s;
    }
    case 'plusOne': {
      const player = currentPlayer(s);
      if (!plusOneCandidates(s, player).includes(action.color)) fail('cannot use +1 with this die now');
      writeDie(s, player, action.color, action.target);
      sheetOf(s, player).plusOnesUsed += 1;
      s.extraUsed[player].push(action.color);
      return s;
    }
    case 'endActive': {
      if (s.phase.kind !== 'activeExtra') fail('not the end of the active turn');
      if (s.solo) startSoloPassiveTurn(s);
      else s.phase = { kind: 'passive', player: (s.activePlayer + 1) % s.players.length, picked: false };
      return s;
    }
    case 'passivePick': {
      if (s.phase.kind !== 'passive' || s.phase.picked) fail('not a passive pick');
      const player = s.phase.player;
      if (!passiveCandidates(s, player).includes(action.color)) fail('die not available to you');
      writeDie(s, player, action.color, action.target);
      s.phase = { ...s.phase, picked: true };
      return s;
    }
    case 'passiveSkip': {
      if (s.phase.kind !== 'passive' || s.phase.picked) fail('not a passive pick');
      log(s, s.phase.player, 'took no die');
      s.phase = { ...s.phase, picked: true };
      return s;
    }
    case 'passiveDone': {
      if (s.phase.kind !== 'passive' || !s.phase.picked) fail('pick or skip first');
      if (s.solo) {
        endTurn(s);
        return s;
      }
      const next = (s.phase.player + 1) % s.players.length;
      if (next === s.activePlayer) endTurn(s);
      else s.phase = { kind: 'passive', player: next, picked: false };
      return s;
    }
  }
}
