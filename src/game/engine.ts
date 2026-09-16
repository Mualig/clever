import { clever1 } from './clever1';
import { clever2 } from './clever2';
import { clever3 } from './clever3';
import { clever4 } from './clever4';
import { nextRandom, randomSeed } from './rng';
import { DIE_COLORS, ROUNDS_BY_PLAYER_COUNT, type DieColor } from './sheet';
import type { Action, DiceState, GameState, Pretend } from './types';
import type { DieValues, GameMode, PlacementContext, Variant } from './variant';

export class RuleError extends Error {}

function fail(msg: string): never {
  throw new RuleError(msg);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyVariant = Variant<any, any, any>;

export function variantFor(mode: GameMode): AnyVariant {
  switch (mode) {
    case 'clever4':
      return clever4;
    case 'clever3':
      return clever3;
    case 'clever2':
      return clever2;
    default:
      return clever1;
  }
}

// ---------------------------------------------------------------------------
// Queries (used by the UI and by the reducer)
// ---------------------------------------------------------------------------

/** Index of the player who has to act now, or -1 when the game is over. */
export function currentPlayer(s: GameState): number {
  if (s.pending.length > 0) return s.pending[0].player;
  switch (s.phase.kind) {
    case 'active':
    case 'beforeRoll':
    case 'activeExtra':
      return s.activePlayer;
    case 'passive':
      return s.phase.player;
    case 'gameOver':
      return -1;
  }
}

export function sheetOf(s: GameState, player: number): unknown {
  return s.players[player].sheet;
}

export function diceAt(s: GameState, location: DiceState['location'][DieColor]): DieColor[] {
  return DIE_COLORS.filter((c) => s.dice.location[c] === location);
}

/** Real / pretended values of a chosen die, plus the blue + white sum. */
export function valuesFor(s: GameState, color: DieColor, as?: Pretend): DieValues {
  const real = s.dice.values;
  const effective = { ...real };
  if (as) effective[as.color ?? color] = as.value;
  return { value: effective[color], blue: effective.blue + effective.white, real, effective };
}

/**
 * Dice whose number may be polished when writing die `color`: the die itself when it lies on
 * the silver platter, and its blue/white partner when that one lies on the platter.
 */
export function polishable(s: GameState, color: DieColor): DieColor[] {
  const out: DieColor[] = [];
  if (s.dice.location[color] === 'platter') out.push(color);
  const partner = color === 'blue' ? 'white' : color === 'white' ? 'blue' : null;
  if (partner && s.dice.location[partner] === 'platter') out.push(partner);
  return out;
}

/** Every way `player` could change a die's number with an action when writing die `color` now. */
export function pretendOptions(s: GameState, player: number, color: DieColor): Pretend[] {
  const v = variantFor(s.mode);
  const sheet = sheetOf(s, player);
  const out: Pretend[] = [];
  for (const c of v.anyNumberChoices(sheet)) {
    for (const n of c.value === null ? [1, 2, 3, 4, 5, 6] : [c.value]) out.push({ slot: c.slot, value: n });
  }
  const left = v.polishLeft(sheet);
  if (left > 0) {
    for (const d of polishable(s, color)) {
      const real = s.dice.values[d];
      for (let n = Math.max(1, real - left); n <= Math.min(6, real + left); n++) if (n !== real) out.push({ polish: true, color: d, value: n });
    }
  }
  return out;
}

/** Where the die counts as coming from (die fields or silver platter). */
export function contextFor(s: GameState, color: DieColor): PlacementContext {
  const loc = s.dice.location[color];
  const at = (l: DiceState['location'][DieColor]) => DIE_COLORS.filter((c) => c !== color && s.dice.location[c] === l);
  const others = (l: DiceState['location'][DieColor]) => at(l).map((c) => s.dice.values[c]);
  if (loc === 'platter') return { role: 'passive', field: null, companions: others('platter'), swept: [] };
  if (loc === 'chosen') return { role: 'active', field: s.dice.field[color], companions: others('chosen'), swept: [] };
  const swept =
    s.phase.kind === 'active'
      ? at('pool')
          .filter((c) => s.dice.values[c] < s.dice.values[color])
          .map((c) => ({ color: c, value: s.dice.values[c] }))
      : [];
  return { role: 'active', field: s.phase.kind === 'active' ? s.phase.step : null, companions: others('chosen'), swept };
}

/** All boxes on `player`'s sheet where die `color` can be written now. */
export function targetsFor(s: GameState, player: number, color: DieColor, as?: Pretend): unknown[] {
  return variantFor(s.mode).targets(sheetOf(s, player), color, valuesFor(s, color, as), contextFor(s, color));
}

/** Targets of the pending bonus choice at the head of the queue. */
export function pendingTargets(s: GameState): unknown[] {
  const head = s.pending[0];
  if (!head) return [];
  return variantFor(s.mode).bonusTargets(sheetOf(s, head.player), head.bonus, s.dice.values);
}

/** Dice that can be written somewhere, as rolled or after changing their number with an action. */
function usable(s: GameState, player: number, colors: DieColor[]): DieColor[] {
  return colors.filter((c) => targetsFor(s, player, c).length > 0 || pretendOptions(s, player, c).some((p) => targetsFor(s, player, c, p).length > 0));
}

/** Dice a passive player may take: usable platter dice, else usable dice of the active player. */
export function passiveCandidates(s: GameState, player: number): DieColor[] {
  const platter = usable(s, player, diceAt(s, 'platter'));
  if (platter.length > 0 || s.solo) return platter;
  return usable(s, player, diceAt(s, 'chosen'));
}

/** Whether `player` may currently spend a +1 action. */
export function canUsePlusOne(s: GameState, player: number): boolean {
  if (s.pending.length > 0) return false;
  const p = s.phase;
  const inWindow = (p.kind === 'activeExtra' && player === s.activePlayer) || (p.kind === 'passive' && p.player === player && p.picked);
  return inWindow && variantFor(s.mode).plusOnesLeft(sheetOf(s, player)) > 0;
}

/** Dice `player` may take with a +1 action right now. */
export function plusOneCandidates(s: GameState, player: number): DieColor[] {
  if (!canUsePlusOne(s, player)) return [];
  return usable(
    s,
    player,
    DIE_COLORS.filter((c) => !s.extraUsed[player].includes(c)),
  );
}

export function canReroll(s: GameState): boolean {
  return s.pending.length === 0 && s.phase.kind === 'active' && variantFor(s.mode).rerollsLeft(sheetOf(s, s.activePlayer)) > 0 && diceAt(s, 'pool').length > 0;
}

/** Whether the active player may return a platter die into the next roll now. */
export function canReturn(s: GameState): boolean {
  return s.pending.length === 0 && s.phase.kind === 'beforeRoll' && variantFor(s.mode).returnsLeft(sheetOf(s, s.activePlayer)) > 0 && diceAt(s, 'platter').length > 0;
}

export function canPass(s: GameState): boolean {
  return s.pending.length === 0 && s.phase.kind === 'active' && variantFor(s.mode).unusableRoll === 'forfeit';
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
function grant(s: GameState, player: number, bonuses: unknown[], atFront = false) {
  const v = variantFor(s.mode);
  const queue = [...bonuses];
  const pending: GameState['pending'] = [];
  while (queue.length > 0) {
    const b = queue.shift()!;
    const sheet = sheetOf(s, player);
    if (v.isChoice(b)) {
      const optional = v.isOptional(b);
      const targets = v.bonusTargets(sheet, b, s.dice.values);
      if (targets.length === 0) {
        if (!optional) log(s, player, `Bonus ${v.describeBonus(b)} lost (no free box)`);
      } else if (targets.length === 1 && !optional) {
        log(s, player, `Bonus ${v.describeBonus(b)} applied`);
        queue.unshift(...v.applyBonusAt(sheet, b, targets[0]));
      } else {
        pending.push({ player, bonus: b, optional });
      }
    } else {
      log(s, player, `Bonus ${v.describeBonus(b)}`);
      queue.unshift(...v.applyAuto(sheet, b));
    }
  }
  if (atFront) s.pending.unshift(...pending);
  else s.pending.push(...pending);
  normalizePending(s);
}

/** Drops pending choices that became impossible and auto-applies those with a single option. */
function normalizePending(s: GameState) {
  const v = variantFor(s.mode);
  while (s.pending.length > 0) {
    const head = s.pending[0];
    const sheet = sheetOf(s, head.player);
    const targets = v.bonusTargets(sheet, head.bonus, s.dice.values);
    if (targets.length > 1 || (targets.length === 1 && head.optional)) return;
    s.pending.shift();
    if (targets.length === 0) {
      if (!head.optional) log(s, head.player, `Bonus ${v.describeBonus(head.bonus)} lost (no free box)`);
    } else {
      log(s, head.player, `Bonus ${v.describeBonus(head.bonus)} applied`);
      grant(s, head.player, v.applyBonusAt(sheet, head.bonus, targets[0]), true);
    }
  }
}

function startActiveTurn(s: GameState) {
  for (const c of DIE_COLORS) {
    s.dice.location[c] = 'pool';
    s.dice.field[c] = null;
  }
  s.dice.chosenOrder = [];
  s.extraUsed = s.players.map(() => []);
  rollDice(s, [...DIE_COLORS]);
  s.phase = { kind: 'active', step: 0 };
}

function startRound(s: GameState) {
  s.round += 1;
  s.turnInRound = 0;
  const bonus = variantFor(s.mode).roundBonus(s.round);
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
    s.dice.field[c] = i < 3 ? null : i - 3;
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

/** Validates a pretended number; returns the polish actions it costs (0 for "any number"). */
function checkPretend(s: GameState, player: number, color: DieColor, as: Pretend | undefined): number {
  if (!as) return 0;
  const v = variantFor(s.mode);
  if (as.value < 1 || as.value > 6 || !Number.isInteger(as.value)) fail('number must be 1 to 6');
  if (as.polish) {
    const die = as.color ?? color;
    if (!polishable(s, color).includes(die)) fail(`the ${v.dieLabel[die]} die is not on the silver platter`);
    const steps = Math.abs(as.value - s.dice.values[die]);
    if (steps === 0) fail('polishing must change the number');
    if (steps > v.polishLeft(sheetOf(s, player))) fail('not enough polish actions');
    return steps;
  }
  if (as.color && as.color !== color) fail('an "any number" action applies to the chosen die');
  const choice = v.anyNumberChoices(sheetOf(s, player)).find((c) => c.slot === as.slot);
  if (!choice) fail('that "any number" action is not available');
  if (choice.value !== null && choice.value !== as.value) fail(`that action can only be used as a ${choice.value}`);
  return 0;
}

function writeDie(s: GameState, player: number, color: DieColor, target: unknown, as?: Pretend) {
  const v = variantFor(s.mode);
  const steps = checkPretend(s, player, color, as);
  const sheet = sheetOf(s, player);
  const legal = targetsFor(s, player, color, as);
  if (!legal.some((t) => v.sameTarget(t, target))) fail(`the ${v.dieLabel[color]} die cannot be written there`);
  const values = valuesFor(s, color, as);
  if (as?.polish) {
    const die = as.color ?? color;
    v.usePolish(sheet, steps);
    log(s, player, `Polish: ${v.dieLabel[die]} ${values.real[die]} counts as ${as.value} (${steps} action${steps > 1 ? 's' : ''})`);
  } else if (as) {
    v.useAnyNumber(sheet, as.slot!);
    log(s, player, `${v.dieLabel[color]} ${values.real[color]} used as ${as.value}`);
  }
  log(s, player, `${v.dieLabel[color]} ${values.value} → ${v.describeTarget(target)}`);
  grant(s, player, v.apply(sheet, target, values, contextFor(s, color)));
}

function finishRoll(s: GameState, step: number) {
  if (step < 3 && variantFor(s.mode).returnsLeft(sheetOf(s, s.activePlayer)) > 0 && diceAt(s, 'platter').length > 0) {
    s.phase = { kind: 'beforeRoll', step };
    return;
  }
  throwRoll(s, step);
}

function throwRoll(s: GameState, step: number) {
  const pool = diceAt(s, 'pool');
  if (step >= 3 || pool.length === 0) {
    for (const c of pool) s.dice.location[c] = 'platter';
    s.phase = { kind: 'activeExtra' };
  } else {
    rollDice(s, pool);
    s.phase = { kind: 'active', step };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function newGame(names: string[], mode: GameMode = 'clever', seed: number = randomSeed()): GameState {
  if (names.length < 1 || names.length > 4) fail('1 to 4 players');
  const v = variantFor(mode);
  const values = Object.fromEntries(DIE_COLORS.map((c) => [c, 1])) as DiceState['values'];
  const location = Object.fromEntries(DIE_COLORS.map((c) => [c, 'pool'])) as DiceState['location'];
  const field = Object.fromEntries(DIE_COLORS.map((c) => [c, null])) as DiceState['field'];
  const s: GameState = {
    mode,
    players: names.map((name) => ({ name, sheet: v.newSheet() })),
    solo: names.length === 1,
    totalRounds: ROUNDS_BY_PLAYER_COUNT[names.length],
    round: 0,
    activePlayer: 0,
    turnInRound: 0,
    dice: { values, location, chosenOrder: [], field },
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
  const v = variantFor(s.mode);
  if (s.phase.kind === 'gameOver') fail('game is over');

  if (action.type === 'resolve') {
    const head = s.pending[0];
    if (!head) fail('nothing to resolve');
    const sheet = sheetOf(s, head.player);
    if (!v.bonusTargets(sheet, head.bonus, s.dice.values).some((t) => v.sameTarget(t, action.target))) fail('invalid bonus target');
    s.pending.shift();
    log(s, head.player, `Bonus ${v.describeBonus(head.bonus)} → ${v.describeTarget(action.target)}`);
    grant(s, head.player, v.applyBonusAt(sheet, head.bonus, action.target), true);
    return s;
  }
  if (action.type === 'skipBonus') {
    const head = s.pending[0];
    if (!head) fail('nothing to skip');
    if (!head.optional) fail('this bonus must be used');
    s.pending.shift();
    log(s, head.player, `${v.describeBonus(head.bonus)} skipped`);
    normalizePending(s);
    return s;
  }
  if (s.pending.length > 0) fail('a bonus must be resolved first');

  switch (action.type) {
    case 'reroll': {
      if (!canReroll(s)) fail('cannot re-roll now');
      v.useReroll(sheetOf(s, s.activePlayer));
      rollDice(s, diceAt(s, 'pool'));
      log(s, s.activePlayer, 'Re-roll');
      return s;
    }
    case 'returnDie': {
      if (!canReturn(s)) fail('cannot return a die now');
      if (s.phase.kind !== 'beforeRoll') fail('not before a roll');
      if (s.dice.location[action.color] !== 'platter') fail('that die is not on the silver platter');
      v.useReturn(sheetOf(s, s.activePlayer));
      s.dice.location[action.color] = 'pool';
      log(s, s.activePlayer, `Return: ${v.dieLabel[action.color]} die back into the roll`);
      if (!canReturn(s)) throwRoll(s, s.phase.step);
      return s;
    }
    case 'roll': {
      if (s.phase.kind !== 'beforeRoll') fail('nothing to roll now');
      throwRoll(s, s.phase.step);
      return s;
    }
    case 'pass': {
      if (!canPass(s)) fail('cannot pass this roll');
      if (s.phase.kind !== 'active') fail('not the active picking phase');
      log(s, s.activePlayer, `roll ${s.phase.step + 1} forfeited`);
      finishRoll(s, s.phase.step + 1);
      return s;
    }
    case 'pick': {
      if (s.phase.kind !== 'active') fail('not the active picking phase');
      if (s.dice.location[action.color] !== 'pool') fail('die not available');
      if (action.target !== null) {
        writeDie(s, s.activePlayer, action.color, action.target, action.as);
      } else {
        if (v.unusableRoll !== 'takeDie') fail('choose a box or pass the roll');
        if (targetsFor(s, s.activePlayer, action.color).length > 0) fail('this die can be used and must be written');
        log(s, s.activePlayer, `${v.dieLabel[action.color]} ${s.dice.values[action.color]} taken without marking`);
      }
      const chosenValue = s.dice.values[action.color];
      s.dice.location[action.color] = 'chosen';
      s.dice.field[action.color] = s.phase.step;
      s.dice.chosenOrder.push(action.color);
      for (const c of diceAt(s, 'pool')) {
        if (s.dice.values[c] < chosenValue) s.dice.location[c] = 'platter';
      }
      finishRoll(s, s.phase.step + 1);
      return s;
    }
    case 'plusOne': {
      const player = currentPlayer(s);
      if (!plusOneCandidates(s, player).includes(action.color)) fail('cannot use +1 with this die now');
      writeDie(s, player, action.color, action.target, action.as);
      v.usePlusOne(sheetOf(s, player));
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
      writeDie(s, player, action.color, action.target, action.as);
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
