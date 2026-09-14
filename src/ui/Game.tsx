import { useEffect, useState } from 'react';
import { canPass, canReroll, currentPlayer, diceAt, passiveCandidates, pendingTargets, plusOneCandidates, reduce, RuleError, targetsFor, variantFor } from '../game/engine';
import type { Sheet3, Target3 } from '../game/rules3';
import type { DieColor } from '../game/sheet';
import type { Action, GameState, Pretend, Sheet, Target } from '../game/types';
import { DiceTray } from './DiceTray';
import { Scoreboard } from './Scoreboard';
import { SheetView } from './SheetView';
import { SheetView3 } from './SheetView3';

type Mode = 'bonus' | 'pick' | 'passivePick' | 'extra' | 'over';

interface Props {
  game: GameState;
  setGame: (g: GameState) => void;
  canUndo: boolean;
  onUndo: () => void;
  onQuit: () => void;
}

function LogView({ game }: { game: GameState }) {
  return (
    <div className="log">
      {game.log
        .slice(-40)
        .reverse()
        .map((e, i) => (
          <div key={i}>
            <span className="muted">
              R{e.round} {game.players[e.player].name}:
            </span>{' '}
            {e.text}
          </div>
        ))}
    </div>
  );
}

export function Game({ game, setGame, canUndo, onUndo, onQuit }: Props) {
  const v = variantFor(game.mode);
  const player = currentPlayer(game);
  const [selected, setSelected] = useState<DieColor | null>(null);
  const [as, setAs] = useState<Pretend | null>(null);
  const [freeSlot, setFreeSlot] = useState<number | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [ack, setAck] = useState<number>(player);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches);

  const multi = game.players.length > 1;
  const phase = game.phase;
  const pending = game.pending[0];
  const mode: Mode = pending
    ? 'bonus'
    : phase.kind === 'active'
      ? 'pick'
      : phase.kind === 'activeExtra'
        ? 'extra'
        : phase.kind === 'passive'
          ? phase.picked
            ? 'extra'
            : 'passivePick'
          : 'over';

  const sheet = game.players[player]?.sheet;
  const selectable: DieColor[] =
    mode === 'pick' ? diceAt(game, 'pool') : mode === 'passivePick' ? passiveCandidates(game, player) : mode === 'extra' ? plusOneCandidates(game, player) : [];

  // Keep the selection valid, and preselect when there is no real choice of die.
  useEffect(() => {
    if (selected && !selectable.includes(selected)) {
      setSelected(null);
      setAs(null);
      setFreeSlot(null);
    }
    if (!selected && selectable.length === 1 && (mode === 'pick' || mode === 'passivePick')) setSelected(selectable[0]);
  }, [selected, selectable.join(','), mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!multi) setAck(player);
  }, [player, multi]);

  const anyChoices = selected && mode !== 'bonus' ? v.anyNumberChoices(sheet) : [];
  const targets: unknown[] = mode === 'bonus' ? pendingTargets(game) : selected ? targetsFor(game, player, selected, as ?? undefined) : [];

  const dispatch = (a: Action) => {
    try {
      setGame(reduce(game, a));
      setSelected(null);
      setAs(null);
      setFreeSlot(null);
      setError(null);
    } catch (e) {
      setError(e instanceof RuleError ? e.message : String(e));
    }
  };

  const onTarget = (t: unknown) => {
    if (mode === 'bonus') dispatch({ type: 'resolve', target: t });
    else if (!selected) return;
    else if (mode === 'pick') dispatch({ type: 'pick', color: selected, target: t, as: as ?? undefined });
    else if (mode === 'passivePick') dispatch({ type: 'passivePick', color: selected, target: t, as: as ?? undefined });
    else if (mode === 'extra') dispatch({ type: 'plusOne', color: selected, target: t, as: as ?? undefined });
  };

  const selectDie = (c: DieColor) => {
    setSelected(selected === c ? null : c);
    setAs(null);
    setFreeSlot(null);
  };

  const renderSheet = (p: number, own: boolean) => {
    const s = game.players[p].sheet;
    if (game.mode === 'clever3') {
      return (
        <SheetView3
          sheet={s as Sheet3}
          round={game.round}
          totalRounds={game.totalRounds}
          targets={own ? (targets as Target3[]) : []}
          onTarget={own ? onTarget : undefined}
        />
      );
    }
    return (
      <SheetView sheet={s as Sheet} round={game.round} totalRounds={game.totalRounds} targets={own ? (targets as Target[]) : []} onTarget={own ? onTarget : undefined} />
    );
  };

  if (phase.kind === 'gameOver') {
    return (
      <div className={`game mode-${game.mode}`}>
        <header className="topbar">
          <h1>Game over</h1>
          <div className="topbar-actions">
            <button type="button" className="btn" disabled={!canUndo} onClick={onUndo}>
              Undo
            </button>
            <button type="button" className="btn" onClick={onQuit}>
              New game
            </button>
          </div>
        </header>
        <Scoreboard game={game} final />
        <div className="main final">
          <div className="col-left">
            <LogView game={game} />
          </div>
          <div className="col-right sheets-final">
            {game.players.map((p, i) => (
              <div key={i}>
                <h3>{p.name}</h3>
                {renderSheet(i, false)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const name = game.players[player].name;
  const activeName = game.players[game.activePlayer].name;
  const role = mode === 'bonus' ? 'Bonus' : phase.kind === 'passive' ? (game.solo ? 'Passive turn' : 'Passive') : 'Active';

  let instruction: string;
  let hint: string | null = null;
  if (mode === 'bonus' && pending) {
    instruction = `Bonus: ${v.describeBonus(pending.bonus)}. Choose a highlighted box${pending.optional ? ', or skip it' : ''}.`;
  } else if (mode === 'pick' && phase.kind === 'active') {
    instruction = `Roll ${phase.step + 1} of 3: choose a die, then a highlighted box.`;
    if (selected && targets.length === 0) {
      hint =
        v.unusableRoll === 'takeDie'
          ? 'This die fits nowhere on your sheet. You can still take it to keep it off the platter.'
          : 'This die fits nowhere on your sheet. Pick another die, use an "any number" action, or forfeit the roll.';
    }
  } else if (mode === 'passivePick') {
    const fromActive = selectable.length > 0 && !selectable.every((c) => game.dice.location[c] === 'platter');
    instruction = selectable.length
      ? fromActive
        ? `No platter die fits your sheet, so you may take one of ${activeName}'s dice.`
        : 'Choose one die from the silver platter, then a highlighted box.'
      : 'No die fits your sheet.';
  } else if (mode === 'extra') {
    const left = v.plusOnesLeft(sheet);
    instruction = left > 0 ? `You may spend a +1 (${left} left): choose any die, then a box.` : 'No +1 actions left.';
    if (left > 0 && selectable.length === 0) instruction = `You have ${left} +1 action(s), but no die fits your sheet.`;
  } else {
    instruction = '';
  }

  // Dice that will land on the silver platter if the selected die is taken now.
  const discarding: DieColor[] =
    mode === 'pick' && selected && phase.kind === 'active'
      ? diceAt(game, 'pool').filter((c) => c !== selected && (phase.step === 2 || game.dice.values[c] < game.dice.values[selected]))
      : [];

  const shownPlayer = viewing ?? player;
  const isOwn = shownPlayer === player;

  return (
    <div className={`game mode-${game.mode}`}>
      {multi && ack !== player && (
        <div className="handoff">
          <div className="handoff-card">
            <p>Pass the device to</p>
            <h2>{name}</h2>
            <p className="muted">
              Round {game.round} · {role} {phase.kind === 'passive' && !game.solo ? `(${activeName} is active)` : ''}
            </p>
            <button type="button" className="btn primary" onClick={() => setAck(player)}>
              I'm {name}
            </button>
          </div>
        </div>
      )}

      <header className="topbar">
        <div>
          <strong>Round {game.round}</strong> / {game.totalRounds}
          <span className="muted"> · {v.title}</span>
          {multi && <span className="muted"> · active: {activeName}</span>}
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn small" disabled={!canUndo} onClick={onUndo} title="Roll back the last action">
            Undo
          </button>
          <button type="button" className="btn small" onClick={() => setShowLog((v) => !v)}>
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
          <section className={`turn-panel role-${mode}`}>
            <div className="turn-title">
              <span className="who">{name}</span>
              <span className="role">{role}</span>
            </div>
            <p className="instruction">{instruction}</p>
            {hint && <p className="hint">{hint}</p>}
            {error && <p className="error">{error}</p>}
            <DiceTray game={game} labels={v.dieLabel} selectable={selectable} selected={selected} discarding={discarding} onSelect={selectDie} />

            {anyChoices.length > 0 && (
              <div className="any-number">
                <span className="any-label">Use as</span>
                {anyChoices.map((c) => {
                  const on = as?.slot === c.slot;
                  return (
                    <button
                      key={c.slot}
                      type="button"
                      className={`chip ${on ? 'on' : ''}`}
                      onClick={() => {
                        if (on) {
                          setAs(null);
                          setFreeSlot(null);
                        } else if (c.value === null) {
                          setFreeSlot(c.slot);
                          setAs(null);
                        } else {
                          setAs({ slot: c.slot, value: c.value });
                          setFreeSlot(null);
                        }
                      }}
                    >
                      {c.value === null ? (freeSlot === c.slot || (on && as) ? `? = ${as?.value ?? '…'}` : '?') : c.value}
                    </button>
                  );
                })}
                {freeSlot !== null && (
                  <span className="free-pick">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button key={n} type="button" className={`chip ${as?.slot === freeSlot && as.value === n ? 'on' : ''}`} onClick={() => setAs({ slot: freeSlot, value: n })}>
                        {n}
                      </button>
                    ))}
                  </span>
                )}
                {as && (
                  <span className="muted">
                    {v.dieLabel[selected!]} counts as {as.value}
                  </span>
                )}
              </div>
            )}

            <div className="controls">
              {mode === 'bonus' && pending?.optional && (
                <button type="button" className="btn" onClick={() => dispatch({ type: 'skipBonus' })}>
                  Skip this bonus
                </button>
              )}
              {mode === 'pick' && (
                <>
                  <button type="button" className="btn" disabled={!canReroll(game)} onClick={() => dispatch({ type: 'reroll' })}>
                    Re-roll ({v.rerollsLeft(sheet)})
                  </button>
                  {v.unusableRoll === 'takeDie' && selected && targets.length === 0 && !as && (
                    <button type="button" className="btn warn" onClick={() => dispatch({ type: 'pick', color: selected, target: null })}>
                      Take {v.dieLabel[selected]} without marking
                    </button>
                  )}
                  {canPass(game) && (
                    <button type="button" className="btn warn" onClick={() => dispatch({ type: 'pass' })}>
                      Forfeit this roll
                    </button>
                  )}
                </>
              )}
              {mode === 'passivePick' && (
                <button type="button" className="btn" onClick={() => dispatch({ type: 'passiveSkip' })}>
                  {selectable.length ? 'Skip (take no die)' : 'Continue'}
                </button>
              )}
              {mode === 'extra' && phase.kind === 'activeExtra' && (
                <button type="button" className="btn primary" onClick={() => dispatch({ type: 'endActive' })}>
                  End turn
                </button>
              )}
              {mode === 'extra' && phase.kind === 'passive' && (
                <button type="button" className="btn primary" onClick={() => dispatch({ type: 'passiveDone' })}>
                  Done
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
                <button key={i} type="button" className={`tab ${shownPlayer === i ? 'on' : ''} ${i === player ? 'turn' : ''}`} onClick={() => setViewing(i === player ? null : i)}>
                  {p.name}
                </button>
              ))}
            </nav>
          )}
          {renderSheet(shownPlayer, isOwn)}
        </div>
      </div>
    </div>
  );
}
