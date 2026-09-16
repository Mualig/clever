import { useState } from 'react';
import { manualOptions, pendingTargets, reduce, RuleError, variantFor, type ManualOption } from '../game/engine';
import type { Action, GameState, ManualAction } from '../game/types';
import { LogView } from './Game';
import { Scoreboard } from './Scoreboard';
import { SheetFor } from './SheetFor';

interface Props {
  game: GameState;
  setGame: (g: GameState) => void;
  canUndo: boolean;
  onUndo: () => void;
  onQuit: () => void;
}

/**
 * Score-card mode: the dice are rolled at the table. Players click the boxes they want; when a
 * box can hold several numbers they are asked which one. Bonuses chain as usual, the next round
 * starts by clicking its number on the sheet.
 */
export function ScoreCard({ game, setGame, canUndo, onUndo, onQuit }: Props) {
  const v = variantFor(game.mode);
  const multi = game.players.length > 1;
  const [viewing, setViewing] = useState(0);
  const [choice, setChoice] = useState<{ target: unknown; options: ManualOption[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches);

  const pending = game.pending[0];
  const player = pending ? pending.player : viewing;
  const sheet = game.players[player].sheet;
  const lastRound = game.round >= game.totalRounds;

  const options = pending ? [] : manualOptions(game, player);
  const targets: unknown[] = pending
    ? pendingTargets(game)
    : options.map((o) => o.target).filter((t, i, all) => all.findIndex((u) => v.sameTarget(u, t)) === i);

  const dispatch = (a: Action) => {
    try {
      setGame(reduce(game, a));
      setChoice(null);
      setError(null);
    } catch (e) {
      setError(e instanceof RuleError ? e.message : String(e));
    }
  };

  const mark = (o: ManualOption) => dispatch({ type: 'mark', player, target: o.target, value: o.value, blue: o.blue });

  const onTarget = (t: unknown) => {
    if (pending) {
      dispatch({ type: 'resolve', target: t });
      return;
    }
    const matching = options.filter((o) => v.sameTarget(o.target, t));
    if (matching.length === 1) mark(matching[0]);
    else if (matching.length > 1) setChoice({ target: t, options: matching });
  };

  // What distinguishes the options of one box: the blue + white sum in the blue area, else the number.
  const isBlue = (t: unknown) => (t as { area?: string }).area === 'blue';
  const optionNumber = (o: ManualOption) => (isBlue(o.target) ? o.value + o.blue : o.value);

  const allActions: { key: ManualAction; label: string; left: number }[] = [
    { key: 'reroll', label: '⟳ Re-roll', left: v.rerollsLeft(sheet) },
    { key: 'plusOne', label: '+1 die', left: v.plusOnesLeft(sheet) },
    { key: 'return', label: 'Return', left: v.returnsLeft(sheet) },
    { key: 'anyNumber', label: 'Any number', left: v.anyNumberChoices(sheet).length },
    { key: 'polish', label: '◉ Polish', left: v.polishLeft(sheet) },
  ];
  const actions = allActions.filter((a) => a.left > 0);

  const instruction = pending
    ? `Bonus: ${v.describeBonus(pending.bonus)}. Choose a highlighted box${pending.optional ? ', or skip it' : ''}.`
    : choice
      ? `${v.describeTarget(choice.target)}: which number?`
      : lastRound
        ? 'Click the boxes you mark. This is the last round: finish the game when everyone is done.'
        : `Click the boxes you mark. When round ${game.round + 1} starts, click its number on the sheet to get the bonus.`;

  return (
    <div className={`game manual mode-${game.mode} ${pending ? 'pending-choice' : ''}`}>
      <header className="topbar">
        <div>
          <strong>Round {game.round}</strong> / {game.totalRounds}
          <span className="muted"> · {v.title} · score card</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn small" disabled={!canUndo} onClick={onUndo} title="Roll back the last action">
            Undo
          </button>
          <button type="button" className="btn small" onClick={() => setShowLog((x) => !x)}>
            Log
          </button>
          <button
            type="button"
            className="btn small"
            onClick={() => {
              if (confirm('Abandon this game?')) onQuit();
            }}
          >
            Quit
          </button>
        </div>
      </header>

      <div className="main">
        <div className="col-left">
          <section className={`turn-panel role-${pending ? 'bonus' : 'manual'}`}>
            <div className="turn-title">
              <span className="who">{game.players[player].name}</span>
              <span className="role">{pending ? 'Bonus' : 'Score card'}</span>
            </div>
            <p className="instruction">{instruction}</p>
            {error && <p className="error">{error}</p>}

            {choice && (
              <div className="any-number">
                {[...choice.options]
                  .sort((a, b) => optionNumber(a) - optionNumber(b))
                  .map((o, i) => (
                    <button key={i} type="button" className="chip" onClick={() => mark(o)}>
                      {optionNumber(o)}
                    </button>
                  ))}
                <button type="button" className="btn small" onClick={() => setChoice(null)}>
                  Cancel
                </button>
              </div>
            )}

            <div className="controls">
              {pending?.optional && (
                <button type="button" className="btn" onClick={() => dispatch({ type: 'skipBonus' })}>
                  Skip this bonus
                </button>
              )}
              {!pending &&
                actions.map((a) => (
                  <button key={a.key} type="button" className="btn" onClick={() => dispatch({ type: 'useAction', player, action: a.key })} title={`Record one ${a.label} action as spent`}>
                    {a.label} used ({a.left} left)
                  </button>
                ))}
              {!pending && lastRound && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    if (confirm('Finish the game and show the final scores?')) dispatch({ type: 'nextRound' });
                  }}
                >
                  Finish game
                </button>
              )}
            </div>
          </section>

          {multi && <Scoreboard game={game} />}
          {showLog && <LogView game={game} />}
        </div>

        <div className="col-right">
          {multi && (
            <nav className="tabs">
              {game.players.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className={`tab ${player === i ? 'on' : ''} ${pending?.player === i ? 'turn' : ''}`}
                  disabled={!!pending}
                  onClick={() => {
                    setChoice(null);
                    setViewing(i);
                  }}
                >
                  {p.name}
                </button>
              ))}
            </nav>
          )}
          <SheetFor game={game} player={player} targets={targets} onTarget={onTarget} onNextRound={pending || lastRound ? undefined : () => dispatch({ type: 'nextRound' })} />
        </div>
      </div>
    </div>
  );
}
