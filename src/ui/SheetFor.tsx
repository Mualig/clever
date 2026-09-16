import type { Sheet2, Target2 } from '../game/rules2';
import type { Sheet3, Target3 } from '../game/rules3';
import type { Sheet4, Target4 } from '../game/rules4';
import type { GameState, Sheet, Target } from '../game/types';
import { SheetView } from './SheetView';
import { SheetView2 } from './SheetView2';
import { SheetView3 } from './SheetView3';
import { SheetView4 } from './SheetView4';

/** The sheet of `player`, drawn with the view of the game's variant. */
export function SheetFor({
  game,
  player,
  targets = [],
  onTarget,
  onNextRound,
}: {
  game: GameState;
  player: number;
  targets?: unknown[];
  onTarget?: (t: unknown) => void;
  onNextRound?: () => void;
}) {
  const s = game.players[player].sheet;
  const common = { round: game.round, totalRounds: game.totalRounds, onTarget, onNextRound };
  switch (game.mode) {
    case 'clever2':
      return <SheetView2 sheet={s as Sheet2} targets={targets as Target2[]} {...common} />;
    case 'clever3':
      return <SheetView3 sheet={s as Sheet3} targets={targets as Target3[]} {...common} />;
    case 'clever4':
      return <SheetView4 sheet={s as Sheet4} targets={targets as Target4[]} {...common} />;
    default:
      return <SheetView sheet={s as Sheet} targets={targets as Target[]} {...common} />;
  }
}
