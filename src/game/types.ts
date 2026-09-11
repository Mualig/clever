import type { AreaColor, Bonus, DieColor } from './sheet';

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
  sheet: Sheet;
}

export type DieLocation = 'pool' | 'chosen' | 'platter';

export interface DiceState {
  values: Record<DieColor, number>;
  location: Record<DieColor, DieLocation>;
  /** Order in which dice were placed on the active player's die fields. */
  chosenOrder: DieColor[];
}

export type Target =
  | { area: 'yellow'; cell: number }
  | { area: 'blue'; value: number }
  | { area: 'green' }
  | { area: 'orange' }
  | { area: 'purple' };

export interface PendingChoice {
  player: number;
  bonus: Bonus;
}

export type Phase =
  /** Active player has rolled and must pick a die (or re-roll). `step` = die field 0..2. */
  | { kind: 'active'; step: number }
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
  | { type: 'pick'; color: DieColor; target: Target | null }
  | { type: 'resolve'; target: Target }
  | { type: 'plusOne'; color: DieColor; target: Target }
  | { type: 'endActive' }
  | { type: 'passivePick'; color: DieColor; target: Target }
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
