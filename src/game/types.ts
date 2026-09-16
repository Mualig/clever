import type { AreaColor, Bonus, DieColor } from './sheet';
import type { GameMode } from './variant';

export interface Sheet {
  /** 16 cells row-major; pre-printed crosses start as true. */
  yellow: boolean[];
  /** 11 entries, index = value - 2 (values 2..12). */
  blue: boolean[];
  /** Number of green boxes marked (0..11). */
  green: number;
  /** Recorded orange values (already multiplied). */
  orange: number[];
  /** Recorded purple die values. */
  purple: number[];
  rerollsUnlocked: number;
  rerollsUsed: number;
  plusOnesUnlocked: number;
  plusOnesUsed: number;
}

export interface PlayerState {
  name: string;
  /** Sheet of the game's variant (`Sheet` for the base game, `Sheet3` for Clever hoch Drei). */
  sheet: unknown;
}

export type DieLocation = 'pool' | 'chosen' | 'platter';

export interface DiceState {
  values: Record<DieColor, number>;
  location: Record<DieColor, DieLocation>;
  /** Order in which dice were placed on the active player's die fields. */
  chosenOrder: DieColor[];
  /** Die-field index (0..2) a chosen die sits on. */
  field: Record<DieColor, number | null>;
}

/**
 * Pretend a die shows `value`. Paid either with "any number" action `slot` (Clever hoch Drei)
 * or with one polish action per step of difference (Clever 4Ever, `polish: true`).
 */
export interface Pretend {
  /** "Any number" action slot paying for the change. */
  slot?: number;
  /** Pay with polish actions instead (die must be on the silver platter). */
  polish?: boolean;
  /** Die whose number changes; defaults to the chosen die (blue and white may polish each other). */
  color?: DieColor;
  value: number;
}

export type Target =
  | { area: 'yellow'; cell: number }
  | { area: 'blue'; value: number }
  | { area: 'green' }
  | { area: 'orange' }
  | { area: 'purple' };

export interface PendingChoice {
  player: number;
  bonus: unknown;
  optional: boolean;
}

export type Phase =
  /** Active player has rolled and must pick a die (or re-roll). `step` = die field 0..2. */
  | { kind: 'active'; step: number }
  /** Active player may return platter dice before roll `step + 1` is thrown (Doppelt so clever). */
  | { kind: 'beforeRoll'; step: number }
  /** Active player finished picking and may use +1 actions before ending the turn. */
  | { kind: 'activeExtra' }
  /** A passive player picks from the silver platter, then may use +1 actions. */
  | { kind: 'passive'; player: number; picked: boolean }
  | { kind: 'gameOver' };

export interface LogEntry {
  round: number;
  player: number;
  text: string;
}

export interface GameState {
  mode: GameMode;
  players: PlayerState[];
  solo: boolean;
  totalRounds: number;
  round: number;
  /** Index of the active player of the current turn. */
  activePlayer: number;
  /** How many players have already been active this round. */
  turnInRound: number;
  dice: DiceState;
  phase: Phase;
  pending: PendingChoice[];
  /** Per player: dice already used with a +1 action in the current turn. */
  extraUsed: DieColor[][];
  rng: number;
  log: LogEntry[];
}

export type Action =
  | { type: 'reroll' }
  | { type: 'pick'; color: DieColor; target: unknown | null; as?: Pretend }
  /** Forfeit the current roll without placing a die (Clever hoch Drei). */
  | { type: 'pass' }
  /** Return action: bring a silver-platter die back into the next roll. */
  | { type: 'returnDie'; color: DieColor }
  /** Throw the next roll (leaves the `beforeRoll` phase). */
  | { type: 'roll' }
  | { type: 'resolve'; target: unknown }
  | { type: 'skipBonus' }
  | { type: 'plusOne'; color: DieColor; target: unknown; as?: Pretend }
  | { type: 'endActive' }
  | { type: 'passivePick'; color: DieColor; target: unknown; as?: Pretend }
  | { type: 'passiveSkip' }
  | { type: 'passiveDone' };

export interface AreaScores {
  yellow: number;
  blue: number;
  green: number;
  orange: number;
  purple: number;
  foxes: number;
  foxPoints: number;
  total: number;
}

export type { AreaColor, DieColor, Bonus };
