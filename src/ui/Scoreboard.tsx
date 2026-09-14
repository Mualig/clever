import { variantFor } from '../game/engine';
import type { GameState } from '../game/types';
import { winners } from '../game/variant';

export function Scoreboard({ game, final }: { game: GameState; final?: boolean }) {
  const v = variantFor(game.mode);
  const scores = game.players.map((p) => v.score(p.sheet));
  const win = final ? winners(scores) : [];
  return (
    <div className="scoreboard-wrap">
      <table className="scoreboard">
        <thead>
          <tr>
            <th>Player</th>
            {v.areas.map((a) => (
              <th key={a.key} style={{ background: a.color, color: a.key === 'yellow' ? '#1f2430' : '#fff' }} title={a.label}>
                {a.short}
              </th>
            ))}
            <th>🦊</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {game.players.map((p, i) => (
            <tr key={i} className={win.includes(i) ? 'winner' : ''}>
              <td>
                {p.name}
                {win.includes(i) && ' 🏆'}
              </td>
              {scores[i].areas.map((a) => (
                <td key={a.key}>{a.points}</td>
              ))}
              <td>
                {scores[i].foxes}×{Math.min(...scores[i].areas.map((a) => a.points))}
              </td>
              <td>
                <strong>{scores[i].total}</strong>
                {final && game.solo && <div className="rating">{v.soloRating(scores[i].total)}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
