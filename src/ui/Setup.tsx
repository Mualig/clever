import { useState } from 'react';
import { ROUNDS_BY_PLAYER_COUNT } from '../game/sheet';

export function Setup({ onStart, canResume, onResume }: { onStart: (names: string[]) => void; canResume: boolean; onResume: () => void }) {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
  return (
    <div className="setup">
      <h1>Ganz schön clever</h1>
      <p className="tagline">A dice game by Wolfgang Warsch, for 1–4 players on one device.</p>
      {canResume && (
        <button type="button" className="btn primary wide" onClick={onResume}>
          Continue the saved game
        </button>
      )}
      <div className="setup-card">
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
            <input
              value={names[i]}
              maxLength={20}
              onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
            />
          </label>
        ))}
        <p className="hint">{ROUNDS_BY_PLAYER_COUNT[count]} rounds. {count === 1 ? 'You alternate between the active and the passive role.' : 'Pass the device around: everyone plays on this screen.'}</p>
        <button type="button" className="btn primary wide" onClick={() => onStart(names.slice(0, count).map((n, i) => n.trim() || `Player ${i + 1}`))}>
          Start game
        </button>
      </div>
      <details className="rules">
        <summary>Rules in short</summary>
        <ul>
          <li>The active player rolls all six dice, picks one and writes it in the matching colour area. The white die is wild; blue always counts blue + white.</li>
          <li>Every die showing a lower value than the chosen one goes to the silver platter. Roll the rest, pick again, up to three dice per turn.</li>
          <li>Afterwards every other player picks one die from the silver platter.</li>
          <li>Purple numbers must each be higher than the previous one. After a 6 the chain resets and any value may follow.</li>
          <li>Completing rows, columns or special boxes gives bonuses: extra marks, re-rolls, +1 actions and foxes. Bonuses chain immediately.</li>
          <li>Re-roll: re-roll all dice just thrown (active player only). +1: at the end of a turn, write any one of the six dice as an extra.</li>
          <li>At the end, every fox scores as many points as your lowest area.</li>
        </ul>
      </details>
    </div>
  );
}
