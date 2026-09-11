import { useEffect, useState } from "react";
import {
  canReroll,
  currentPlayer,
  diceAt,
  passiveCandidates,
  plusOneCandidates,
  reduce,
  RuleError,
} from "../game/engine";
import {
  bonusTargets,
  plusOnesLeft,
  rerollsLeft,
  targetsForDie,
} from "../game/rules";
import { describeBonus, type DieColor } from "../game/sheet";
import type { Action, GameState, Target } from "../game/types";
import { DiceTray } from "./DiceTray";
import { Scoreboard } from "./Scoreboard";
import { SheetView } from "./SheetView";

type Mode = "bonus" | "pick" | "passivePick" | "extra" | "over";

interface Props {
  game: GameState;
  setGame: (g: GameState) => void;
  canUndo: boolean;
  onUndo: () => void;
  onQuit: () => void;
}

export function Game({ game, setGame, canUndo, onUndo, onQuit }: Props) {
  const player = currentPlayer(game);
  const [selected, setSelected] = useState<DieColor | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [ack, setAck] = useState<number>(player);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1100px)").matches,
  );

  const multi = game.players.length > 1;
  const phase = game.phase;
  const pending = game.pending[0];
  const mode: Mode = pending
    ? "bonus"
    : phase.kind === "active"
      ? "pick"
      : phase.kind === "activeExtra"
        ? "extra"
        : phase.kind === "passive"
          ? phase.picked
            ? "extra"
            : "passivePick"
          : "over";

  const sheet = game.players[player]?.sheet;
  const selectable: DieColor[] =
    mode === "pick"
      ? diceAt(game, "pool")
      : mode === "passivePick"
        ? passiveCandidates(game, player)
        : mode === "extra"
          ? plusOneCandidates(game, player)
          : [];

  // Keep the selection valid, and preselect when there is no real choice of die.
  useEffect(() => {
    if (selected && !selectable.includes(selected)) setSelected(null);
    if (
      !selected &&
      selectable.length === 1 &&
      (mode === "pick" || mode === "passivePick")
    )
      setSelected(selectable[0]);
  }, [selected, selectable.join(","), mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!multi) setAck(player);
  }, [player, multi]);

  const targets: Target[] =
    mode === "bonus" && pending
      ? bonusTargets(sheet, pending.bonus)
      : selected
        ? targetsForDie(sheet, game.dice, selected)
        : [];

  // Dice that will land on the silver platter if the selected die is taken now.
  const discarding: DieColor[] =
    mode === "pick" && selected && phase.kind === "active"
      ? diceAt(game, "pool").filter(
          (c) => c !== selected && (phase.step === 2 || game.dice.values[c] < game.dice.values[selected]),
        )
      : [];

  const dispatch = (a: Action) => {
    try {
      setGame(reduce(game, a));
      setSelected(null);
      setError(null);
    } catch (e) {
      setError(e instanceof RuleError ? e.message : String(e));
    }
  };

  const onTarget = (t: Target) => {
    if (mode === "bonus") dispatch({ type: "resolve", target: t });
    else if (!selected) return;
    else if (mode === "pick")
      dispatch({ type: "pick", color: selected, target: t });
    else if (mode === "passivePick")
      dispatch({ type: "passivePick", color: selected, target: t });
    else if (mode === "extra")
      dispatch({ type: "plusOne", color: selected, target: t });
  };

  if (phase.kind === "gameOver") {
    return (
      <div className="game">
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
            <div className="log">
              {game.log
                .slice(-40)
                .reverse()
                .map((e, i) => (
                  <div key={i}>
                    <span className="muted">
                      R{e.round} {game.players[e.player].name}:
                    </span>{" "}
                    {e.text}
                  </div>
                ))}
            </div>
          </div>
          <div className="col-right sheets-final">
            {game.players.map((p, i) => (
              <div key={i}>
                <h3>{p.name}</h3>
                <SheetView sheet={p.sheet} round={game.round} totalRounds={game.totalRounds} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const name = game.players[player].name;
  const activeName = game.players[game.activePlayer].name;
  const role =
    mode === "bonus"
      ? "Bonus"
      : phase.kind === "passive"
        ? game.solo
          ? "Passive turn"
          : "Passive"
        : "Active";

  let instruction: string;
  let hint: string | null = null;
  if (mode === "bonus" && pending) {
    instruction = `Bonus: ${describeBonus(pending.bonus)}. Choose a highlighted box.`;
  } else if (mode === "pick" && phase.kind === "active") {
    instruction = `Roll ${phase.step + 1} of 3: choose a die, then a highlighted box.`;
    if (selected && targets.length === 0)
      hint =
        "This die fits nowhere on your sheet. You can still take it to keep it off the platter.";
  } else if (mode === "passivePick") {
    const fromActive =
      selectable.length > 0 &&
      !selectable.every((c) => game.dice.location[c] === "platter");
    instruction = selectable.length
      ? fromActive
        ? `No platter die fits your sheet, so you may take one of ${activeName}'s dice.`
        : "Choose one die from the silver platter, then a highlighted box."
      : "No die fits your sheet.";
  } else if (mode === "extra") {
    const left = plusOnesLeft(sheet);
    instruction =
      left > 0
        ? `You may spend a +1 (${left} left): choose any die, then a box.`
        : "No +1 actions left.";
    if (left > 0 && selectable.length === 0)
      instruction = `You have ${left} +1 action(s), but no die fits your sheet.`;
  } else {
    instruction = "";
  }

  const shownPlayer = viewing ?? player;
  const shownSheet = game.players[shownPlayer].sheet;
  const isOwn = shownPlayer === player;

  return (
    <div className="game">
      {multi && ack !== player && (
        <div className="handoff">
          <div className="handoff-card">
            <p>Pass the device to</p>
            <h2>{name}</h2>
            <p className="muted">
              Round {game.round} · {role}{" "}
              {phase.kind === "passive" && !game.solo
                ? `(${activeName} is active)`
                : ""}
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => setAck(player)}
            >
              I'm {name}
            </button>
          </div>
        </div>
      )}

      <header className="topbar">
        <div>
          <strong>Round {game.round}</strong> / {game.totalRounds}
          {multi && <span className="muted"> · active: {activeName}</span>}
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn small" disabled={!canUndo} onClick={onUndo} title="Roll back the last action">
            Undo
          </button>
          <button
            type="button"
            className="btn small"
            onClick={() => setShowLog((v) => !v)}
          >
            Log
          </button>
          <button
            type="button"
            className="btn small"
            onClick={() => {
              if (confirm("Abandon this game?")) onQuit();
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
            <DiceTray
              game={game}
              selectable={selectable}
              selected={selected}
              discarding={discarding}
              onSelect={(c) => setSelected(selected === c ? null : c)}
            />
            <div className="controls">
              {mode === "pick" && (
                <>
                  <button
                    type="button"
                    className="btn"
                    disabled={!canReroll(game)}
                    onClick={() => dispatch({ type: "reroll" })}
                  >
                    Re-roll ({rerollsLeft(sheet)})
                  </button>
                  {selected && targets.length === 0 && (
                    <button
                      type="button"
                      className="btn warn"
                      onClick={() =>
                        dispatch({
                          type: "pick",
                          color: selected,
                          target: null,
                        })
                      }
                    >
                      Take {selected} without marking
                    </button>
                  )}
                </>
              )}
              {mode === "passivePick" && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => dispatch({ type: "passiveSkip" })}
                >
                  {selectable.length ? "Skip (take no die)" : "Continue"}
                </button>
              )}
              {mode === "extra" && phase.kind === "activeExtra" && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => dispatch({ type: "endActive" })}
                >
                  End turn
                </button>
              )}
              {mode === "extra" && phase.kind === "passive" && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => dispatch({ type: "passiveDone" })}
                >
                  Done
                </button>
              )}
            </div>
          </section>

          {multi && <Scoreboard game={game} />}

          {showLog && (
            <div className="log">
              {game.log
                .slice(-40)
                .reverse()
                .map((e, i) => (
                  <div key={i}>
                    <span className="muted">
                      R{e.round} {game.players[e.player].name}:
                    </span>{" "}
                    {e.text}
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="col-right">
          {multi && (
            <nav className="tabs">
              {game.players.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className={`tab ${shownPlayer === i ? "on" : ""} ${i === player ? "turn" : ""}`}
                  onClick={() => setViewing(i === player ? null : i)}
                >
                  {p.name}
                </button>
              ))}
            </nav>
          )}

          <SheetView
            sheet={shownSheet}
            round={game.round}
            totalRounds={game.totalRounds}
            targets={isOwn ? targets : []}
            onTarget={isOwn ? onTarget : undefined}
          />
        </div>
      </div>
    </div>
  );
}
