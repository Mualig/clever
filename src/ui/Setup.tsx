import { useState } from 'react';
import { ROUNDS_BY_PLAYER_COUNT } from '../game/sheet';
import type { GameMode } from '../game/variant';

const MODES: { id: GameMode; title: string; subtitle: string }[] = [
  { id: 'clever', title: 'Ganz schön clever', subtitle: 'The original (2018)' },
  { id: 'clever2', title: 'Doppelt so clever', subtitle: 'Twice as Clever (2019)' },
  { id: 'clever3', title: 'Clever hoch Drei', subtitle: 'Ganz schön clever 3 / Clever Cubed (2020)' },
];

export function Setup({
  onStart,
  canResume,
  onResume,
}: {
  onStart: (mode: GameMode, names: string[]) => void;
  canResume: boolean;
  onResume: () => void;
}) {
  const [mode, setMode] = useState<GameMode>('clever');
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
  return (
    <div className="setup">
      <h1>Clever</h1>
      <p className="tagline">The roll-and-write dice games by Wolfgang Warsch, for 1–4 players on one device.</p>
      {canResume && (
        <button type="button" className="btn primary wide" onClick={onResume}>
          Continue the saved game
        </button>
      )}
      <div className="setup-card">
        <div className="field">
          Game
          <div className="mode-list">
            {MODES.map((m) => (
              <button key={m.id} type="button" className={`mode ${m.id === mode ? 'on' : ''} mode-${m.id}`} onClick={() => setMode(m.id)}>
                <span className="mode-title">{m.title}</span>
                <span className="mode-sub">{m.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          Players
          <div className="seg">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" className={n === count ? 'on' : ''} onClick={() => setCount(n)}>
                {n === 1 ? 'Solo' : n}
              </button>
            ))}
          </div>
        </label>
        {Array.from({ length: count }, (_, i) => (
          <label key={i} className="field">
            {count === 1 ? 'Name' : `Player ${i + 1}`}
            <input value={names[i]} maxLength={20} onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))} />
          </label>
        ))}
        <p className="hint">
          {ROUNDS_BY_PLAYER_COUNT[count]} rounds.{' '}
          {count === 1 ? 'You alternate between the active and the passive role.' : 'Pass the device around: everyone plays on this screen.'}
        </p>
        <button
          type="button"
          className="btn primary wide"
          onClick={() =>
            onStart(
              mode,
              names.slice(0, count).map((n, i) => n.trim() || `Player ${i + 1}`),
            )
          }
        >
          Start game
        </button>
      </div>
      <details className="rules">
        <summary>Rules in short</summary>
        <ul>
          <li>The active player rolls all six dice, picks one and writes it in the matching colour area. The white die is wild; blue always counts blue + white.</li>
          <li>Every die showing a lower value than the chosen one goes to the silver platter. Roll the rest, pick again, up to three dice per turn.</li>
          <li>Afterwards every other player picks one die from the silver platter.</li>
          <li>Completing rows, columns or special boxes gives bonuses: extra marks, re-rolls, +1 actions and foxes. Bonuses chain immediately.</li>
          <li>Re-roll: re-roll all dice just thrown (active player only). +1: at the end of a turn, write any one of the six dice as an extra.</li>
          <li>At the end, every fox scores as many points as your lowest area.</li>
        </ul>
        {mode === 'clever' ? (
          <ul>
            <li>Purple numbers must each be higher than the previous one. After a 6 the chain resets and any value may follow.</li>
          </ul>
        ) : mode === 'clever2' ? (
          <ul>
            <li>Silver: mark the die's number in any coloured row. Dice that the silver die sweeps onto the platter may be marked there too. Completed columns give bonuses; rows score by count.</li>
            <li>Yellow: a first yellow die circles its number, a second one crosses it. Rows and columns completed with circles give bonuses; only crosses score.</li>
            <li>Blue: blue + white, left to right, each number at most the previous one. Green: die × multiplier; every pair scores first minus second. Pink: any number; the bonus below needs the printed minimum.</li>
            <li>Return action (active player, before a roll): take a die back from the silver platter into the next roll.</li>
            <li>"?" bonuses: write any number in that area (2–12 for blue). The black "?" of round 4 lets you choose the area. A roll you cannot use is forfeited.</li>
          </ul>
        ) : (
          <ul>
            <li>Yellow: your first, second and third die of a turn go to rows I, II and III. From the silver platter you may only cross grey cells.</li>
            <li>Turquoise: cross any cell with the die's number. Each other die of your die fields (or of the platter, when passive) showing the same number lets you cross one more.</li>
            <li>Blue: blue + white. Start at the 7 and extend left by exactly −1 or right by exactly +1. A 7 resets the chain. Numbers 2–4 and 10–12 score 4 extra.</li>
            <li>Brown: cross a printed number to the right of your last cross. Skipping is allowed but skipped cells are lost.</li>
            <li>Pink: write half the die (rounded up) and take the bonus, or the die × the multiplier and cross the bonus out. The first field always takes half.</li>
            <li>"?" bonuses: choose any number 1–6 and write it as if rolled. "Any number" actions let a chosen die count as the printed number (or any number on a "?" slot).</li>
            <li>A roll you cannot or do not want to use is forfeited: no die is placed.</li>
          </ul>
        )}
      </details>
    </div>
  );
}
