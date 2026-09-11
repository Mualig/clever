import { scoreSheet, winners } from "../game/rules";
import { soloRating } from "../game/sheet";
import type { GameState } from "../game/types";

export function Scoreboard({
  game,
  final,
}: {
  game: GameState;
  final?: boolean;
}) {
  const scores = game.players.map((p) => scoreSheet(p.sheet));
  const win = final ? winners(scores) : [];
  return (
    <div className="scoreboard-wrap">
      <table className="scoreboard">
        <thead>
          <tr>
            <th>Player</th>
            <th className="sc-yellow">Y</th>
            <th className="sc-blue">B</th>
            <th className="sc-green">G</th>
            <th className="sc-orange">O</th>
            <th className="sc-purple">P</th>
            <th>🦊</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {game.players.map((p, i) => (
            <tr key={i} className={win.includes(i) ? "winner" : ""}>
              <td>
                {p.name}
                {win.includes(i) && " 🏆"}
              </td>
              <td>{scores[i].yellow}</td>
              <td>{scores[i].blue}</td>
              <td>{scores[i].green}</td>
              <td>{scores[i].orange}</td>
              <td>{scores[i].purple}</td>
              <td>
                {scores[i].foxes}×
                {Math.min(
                  scores[i].yellow,
                  scores[i].blue,
                  scores[i].green,
                  scores[i].orange,
                  scores[i].purple,
                )}
              </td>
              <td>
                <strong>{scores[i].total}</strong>
                {final && game.solo && (
                  <div className="rating">{soloRating(scores[i].total)}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
