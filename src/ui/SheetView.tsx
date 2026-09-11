import { blueCount, foxCount, plusOnesLeft, rerollsLeft, sameTarget, scoreSheet, yellowColumnsComplete } from '../game/rules';
import {
  ACTION_SLOTS,
  BLUE_COLUMN_BONUS,
  BLUE_GRID,
  BLUE_POINTS,
  BLUE_ROW_BONUS,
  GREEN_BONUS,
  GREEN_POINTS,
  GREEN_THRESHOLDS,
  ORANGE_BONUS,
  ORANGE_MULTIPLIER,
  PURPLE_BONUS,
  ROUND_BONUS,
  TRACK_LENGTH,
  YELLOW_COLUMN_POINTS,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_GRID,
  YELLOW_ROW_BONUS,
} from '../game/sheet';
import type { Sheet, Target } from '../game/types';
import { BonusIcon } from './BonusIcon';

interface Props {
  sheet: Sheet;
  round: number;
  totalRounds: number;
  targets?: Target[];
  onTarget?: (t: Target) => void;
  compact?: boolean;
}

function ActionBar({ label, icon, unlocked, used }: { label: string; icon: string; unlocked: number; used: number }) {
  return (
    <div className="action-bar" title={label}>
      <span className="bonus b-black big">{icon}</span>
      {Array.from({ length: ACTION_SLOTS }, (_, i) => (
        <span key={i} className={`slot ${i < used ? 'used' : i < unlocked ? 'available' : ''}`} />
      ))}
      <span className="action-count">{unlocked - used}</span>
    </div>
  );
}

export function SheetView({ sheet, round, totalRounds, targets = [], onTarget, compact }: Props) {
  const isTarget = (t: Target) => targets.some((x) => sameTarget(x, t));
  const click = (t: Target) => () => onTarget?.(t);
  const cellCls = (base: string, marked: boolean, t?: Target) =>
    [base, marked ? 'marked' : '', t && isTarget(t) ? 'target' : ''].join(' ');

  const score = scoreSheet(sheet);
  const yellowCols = yellowColumnsComplete(sheet);
  const yellowRowDone = (r: number) => [0, 1, 2, 3].every((c) => sheet.yellow[r * 4 + c]);
  const diagonalDone = [0, 5, 10, 15].every((c) => sheet.yellow[c]);
  const blueMarked = (idx: number) => BLUE_GRID[idx] === null || sheet.blue[(BLUE_GRID[idx] as number) - 2];
  const blueRowDone = (r: number) => [0, 1, 2, 3].every((c) => blueMarked(r * 4 + c));
  const blueColDone = (c: number) => [0, 1, 2].every((r) => blueMarked(r * 4 + c));
  const nBlue = blueCount(sheet);

  return (
    <div className={`sheet ${compact ? 'compact' : ''}`}>
      <div className="sheet-top">
        <div className="round-track">
          {ROUND_BONUS.map((b, i) => {
            const n = i + 1;
            const cls = ['round-box', n <= round ? 'marked' : '', n > totalRounds ? 'unused' : ''].join(' ');
            return (
              <div key={n} className={cls}>
                <span className="round-num">{n}</span>
                {b && <BonusIcon bonus={b} />}
              </div>
            );
          })}
        </div>
        <div className="action-bars">
          <ActionBar label="Re-rolls" icon="⟳" unlocked={sheet.rerollsUnlocked} used={sheet.rerollsUsed} />
          <ActionBar label="+1 actions" icon="+1" unlocked={sheet.plusOnesUnlocked} used={sheet.plusOnesUsed} />
        </div>
      </div>

      <div className="areas">
        {/* Yellow */}
        <div className="area area-yellow">
          <div className="grid yellow-grid">
            {YELLOW_GRID.map((v, cell) => {
              const row = Math.floor(cell / 4);
              const col = cell % 4;
              const t: Target = { area: 'yellow', cell };
              const marked = sheet.yellow[cell];
              return (
                <div key={cell} style={{ gridRow: row + 1, gridColumn: col + 1 }}>
                  <button type="button" className={cellCls('cell', marked, v === null ? undefined : t)} disabled={!isTarget(t)} onClick={click(t)}>
                    {v === null ? <span className="pre">✕</span> : marked ? <span className="x">✕</span> : v}
                  </button>
                </div>
              );
            })}
            {YELLOW_ROW_BONUS.map((b, r) => (
              <div key={`r${r}`} className="row-bonus" style={{ gridRow: r + 1, gridColumn: 5 }}>
                <BonusIcon bonus={b} earned={yellowRowDone(r)} />
              </div>
            ))}
            {YELLOW_COLUMN_POINTS.map((p, c) => (
              <div key={`c${c}`} className={`col-points ${yellowCols[c] ? 'earned' : ''}`} style={{ gridRow: 5, gridColumn: c + 1 }}>
                {p}
              </div>
            ))}
            <div className="row-bonus" style={{ gridRow: 5, gridColumn: 5 }}>
              <BonusIcon bonus={YELLOW_DIAGONAL_BONUS} earned={diagonalDone} />
            </div>
          </div>
        </div>

        {/* Blue */}
        <div className="area area-blue">
          <div className="blue-scale">
            {BLUE_POINTS.slice(1).map((p, i) => (
              <span key={i} className={`scale-item ${nBlue === i + 1 ? 'current' : ''}`}>
                <span className="scale-n">{i + 1}</span>
                <span className="scale-p">{p}</span>
              </span>
            ))}
          </div>
          <div className="grid blue-grid">
            {BLUE_GRID.map((v, idx) => {
              const row = Math.floor(idx / 4);
              const col = idx % 4;
              if (v === null) return <div key={idx} style={{ gridRow: row + 1, gridColumn: col + 1 }} />;
              const t: Target = { area: 'blue', value: v };
              const marked = sheet.blue[v - 2];
              return (
                <div key={idx} style={{ gridRow: row + 1, gridColumn: col + 1 }}>
                  <button type="button" className={cellCls('cell', marked, t)} disabled={!isTarget(t)} onClick={click(t)}>
                    {marked ? <span className="x">✕</span> : v}
                  </button>
                </div>
              );
            })}
            {BLUE_ROW_BONUS.map((b, r) => (
              <div key={`r${r}`} className="row-bonus" style={{ gridRow: r + 1, gridColumn: 5 }}>
                <BonusIcon bonus={b} earned={blueRowDone(r)} />
              </div>
            ))}
            {BLUE_COLUMN_BONUS.map((b, c) => (
              <div key={`c${c}`} className="row-bonus" style={{ gridRow: 4, gridColumn: c + 1 }}>
                <BonusIcon bonus={b} earned={blueColDone(c)} />
              </div>
            ))}
          </div>
        </div>

        {/* Green */}
        <div className="area area-green">
          <div className="track">
            <span className="track-arrow">➜</span>
            {GREEN_THRESHOLDS.map((th, i) => {
              const t: Target = { area: 'green' };
              const marked = i < sheet.green;
              const active = i === sheet.green && isTarget(t);
              return (
                <div key={i} className="track-col">
                  <span className={`track-points ${i < sheet.green ? 'earned' : ''}`}>{GREEN_POINTS[i + 1]}</span>
                  <button type="button" className={cellCls('cell', marked, active ? t : undefined)} disabled={!active} onClick={click(t)}>
                    {marked ? <span className="x">✕</span> : `≥${th}`}
                  </button>
                  <span className="track-bonus">{GREEN_BONUS[i] && <BonusIcon bonus={GREEN_BONUS[i]} earned={marked} />}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Orange */}
        <div className="area area-orange">
          <div className="track">
            <span className="track-arrow">➜</span>
            {Array.from({ length: TRACK_LENGTH }, (_, i) => {
              const t: Target = { area: 'orange' };
              const marked = i < sheet.orange.length;
              const active = i === sheet.orange.length && isTarget(t);
              return (
                <div key={i} className="track-col">
                  <span className="track-points"></span>
                  <button type="button" className={cellCls('cell', marked, active ? t : undefined)} disabled={!active} onClick={click(t)}>
                    {marked ? sheet.orange[i] : ORANGE_MULTIPLIER[i] > 1 ? <span className="mult">×{ORANGE_MULTIPLIER[i]}</span> : ''}
                  </button>
                  <span className="track-bonus">{ORANGE_BONUS[i] && <BonusIcon bonus={ORANGE_BONUS[i]} earned={marked} />}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purple */}
        <div className="area area-purple">
          <div className="track">
            <span className="track-arrow">➜</span>
            {Array.from({ length: TRACK_LENGTH }, (_, i) => {
              const t: Target = { area: 'purple' };
              const marked = i < sheet.purple.length;
              const active = i === sheet.purple.length && isTarget(t);
              return (
                <div key={i} className="track-col">
                  {i > 0 &&
                    (sheet.purple[i - 1] === 6 ? (
                      <span className="track-sep reset" title="After a 6, any value may follow">
                        ↺
                      </span>
                    ) : (
                      <span className="track-sep">&lt;</span>
                    ))}
                  <span className="track-points"></span>
                  <button type="button" className={cellCls('cell', marked, active ? t : undefined)} disabled={!active} onClick={click(t)}>
                    {marked ? sheet.purple[i] : ''}
                  </button>
                  <span className="track-bonus">{PURPLE_BONUS[i] && <BonusIcon bonus={PURPLE_BONUS[i]} earned={marked} />}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="score-row">
        <span className="sc sc-yellow">{score.yellow}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc-blue">{score.blue}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc-green">{score.green}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc-orange">{score.orange}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc-purple">{score.purple}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc-fox" title={`${foxCount(sheet)} fox(es) × lowest area`}>
          🦊{score.foxes} = {score.foxPoints}
        </span>
        <span className="sc-plus">=</span>
        <span className="sc sc-total">{score.total}</span>
        <span className="sc-actions">
          ⟳ {rerollsLeft(sheet)} · +1 {plusOnesLeft(sheet)}
        </span>
      </div>
    </div>
  );
}
