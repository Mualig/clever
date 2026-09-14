import { Fragment } from 'react';
import { greenPair, pinkBonusEarned, score2, silverColDone, yellowColDone, yellowCrossed, yellowRowDone, type Sheet2, type Target2 } from '../game/rules2';
import {
  ACTION_SLOTS2,
  B2_BONUS,
  B2_POINTS,
  G2_BONUS,
  G2_MULT,
  P2_BONUS,
  P2_MIN,
  ROUND_BONUS2,
  ROW_END_BONUS2,
  SILVER_COL_BONUS,
  SILVER_ROW_POINTS,
  SILVER_ROWS,
  TRACK_LENGTH2,
  Y2_CELLS,
  Y2_COL_BONUS,
  Y2_COLS,
  Y2_POINTS,
  Y2_ROW_BONUS,
  Y2_ROWS,
  describeBonus2,
  type Bonus2,
} from '../game/sheet2';
import { OptionCell } from './SheetView3';

export function BonusIcon2({ bonus, earned, lost, big }: { bonus: Bonus2; earned?: boolean; lost?: boolean; big?: boolean }) {
  const cls = ['bonus', earned ? 'earned' : '', lost ? 'lost' : '', big ? 'big' : ''].join(' ');
  const title = describeBonus2(bonus);
  switch (bonus.type) {
    case 'reroll':
      return <span className={`${cls} b-black`} title={title}>⟳</span>;
    case 'plusOne':
      return <span className={`${cls} b-black`} title={title}>+1</span>;
    case 'return':
      return <span className={`${cls} b-black`} title={title}>↩</span>;
    case 'fox':
      return <span className={`${cls} b-fox`} title={title}>🦊</span>;
    case 'q':
      return <span className={`${cls} b2-${bonus.color}`} title={title}>?</span>;
    case 'sx':
      return <span className={`${cls} b2-silver`} title={title}>+✕</span>;
  }
}

function ActionRow2({ icon, title, unlocked, used, end }: { icon: string; title: string; unlocked: number; used: number; end: Bonus2 }) {
  return (
    <div className="action-bar" title={title}>
      <span className="bonus b-black big">{icon}</span>
      {Array.from({ length: ACTION_SLOTS2 }, (_, i) => (
        <span key={i} className={`slot ${i < used ? 'used' : i < unlocked ? 'available' : ''}`} />
      ))}
      <BonusIcon2 bonus={end} earned={unlocked >= ACTION_SLOTS2} />
      <span className="action-count">{unlocked - used}</span>
    </div>
  );
}

interface Props {
  sheet: Sheet2;
  round: number;
  totalRounds: number;
  targets?: Target2[];
  onTarget?: (t: Target2) => void;
}

export function SheetView2({ sheet, round, totalRounds, targets = [], onTarget }: Props) {
  const score = score2(sheet);
  const pts = (key: string) => score.areas.find((a) => a.key === key)!.points;
  const optionsFor = (pred: (t: Target2) => boolean) => targets.filter(pred);
  const x = <span className="x">✕</span>;

  const blueNext = sheet.blue.length;
  const greenNext = sheet.green.length;
  const pinkNext = sheet.pink.length;
  const crossed = yellowCrossed(sheet);

  return (
    <div className="sheet sheet3 sheet2">
      <div className="sheet-top">
        <div className="round-track">
          {ROUND_BONUS2.map((b, i) => {
            const n = i + 1;
            const cls = ['round-box', n <= round ? 'marked' : '', n > totalRounds ? 'unused' : ''].join(' ');
            return (
              <div key={n} className={cls}>
                <span className="round-num">{n}</span>
                {b && <BonusIcon2 bonus={b} />}
              </div>
            );
          })}
        </div>
        <div className="action-bars">
          <ActionRow2 icon="⟳" title="Re-rolls" unlocked={sheet.rerollsUnlocked} used={sheet.rerollsUsed} end={ROW_END_BONUS2.reroll} />
          <ActionRow2 icon="↩" title="Return actions" unlocked={sheet.returnsUnlocked} used={sheet.returnsUsed} end={ROW_END_BONUS2.return} />
          <ActionRow2 icon="+1" title="+1 actions" unlocked={sheet.plusOnesUnlocked} used={sheet.plusOnesUsed} end={ROW_END_BONUS2.plusOne} />
        </div>
      </div>

      <div className="areas areas3 areas2">
        {/* Silver */}
        <div className="area s2-silver">
          <div className="s2-head">
            <div className="sv-row sv-head">
              {SILVER_COL_BONUS.map((b, c) => (
                <span key={c} className="gap-slot">
                  <BonusIcon2 bonus={b} earned={silverColDone(sheet, c)} />
                </span>
              ))}
              <span />
            </div>
          </div>
          <div className="rows">
            {sheet.silver.map((row, r) => {
              const count = row.filter(Boolean).length;
              return (
                <div key={r} className="sv-row">
                  {row.map((marked, c) => (
                    <OptionCell
                      key={c}
                      className={`cell sv-${SILVER_ROWS[r]} ${marked ? 'marked' : ''}`}
                      options={optionsFor((t) => t.area === 'silver' && t.row === r && t.col === c)}
                      label={() => 'mark'}
                      onPick={onTarget}
                    >
                      {marked ? x : c + 1}
                    </OptionCell>
                  ))}
                  <span className={`row-pts ${count ? 'earned' : ''}`}>{SILVER_ROW_POINTS[count]}</span>
                </div>
              );
            })}
          </div>
          <div className="s2-foot">
            <div className="scale">
              {SILVER_ROW_POINTS.slice(1).map((p, i) => (
                <span key={i} className="scale-item">
                  <span className="scale-n">{i + 1}</span>
                  <span className="scale-p">{p}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Yellow */}
        <div className="area s2-yellow">
          <div className="s2-head">
            <div className="scale wrap">
              {Y2_POINTS.slice(1).map((p, i) => (
                <span key={i} className={`scale-item ${crossed === i + 1 ? 'current' : ''}`}>
                  <span className="scale-n">{i + 1}</span>
                  <span className="scale-p">{p}</span>
                </span>
              ))}
            </div>
            <div className="y2-legend">○ first, ✕ second · lines of circles pay bonuses · only ✕ score</div>
          </div>
          <div className="y2-grid">
            {Array.from({ length: Y2_ROWS }, (_, r) => (
              <Fragment key={r}>
                {Array.from({ length: Y2_COLS }, (_, c) => {
                  const cell = Y2_CELLS.findIndex((y) => y.row === r && y.col === c);
                  // Lattice lines run from the first number of a row to the arrow on the right,
                  // and from the first number of a column down to the arrow at the bottom.
                  const firstCol = Math.min(...Y2_CELLS.filter((y) => y.row === r).map((y) => y.col));
                  const firstRow = Math.min(...Y2_CELLS.filter((y) => y.col === c).map((y) => y.row));
                  const lines = [c > firstCol ? 'h-full' : c === firstCol ? 'h-right' : '', r > firstRow ? 'v-full' : r === firstRow ? 'v-down' : ''].join(' ');
                  if (cell < 0) return <span key={c} className={`y2-pos ${lines}`} />;
                  const state = sheet.yellow[cell];
                  return (
                    <span key={c} className={`y2-pos ${lines}`}>
                      <OptionCell
                        className={`cell y2 ${state === 1 ? 'circled' : ''} ${state === 2 ? 'marked' : ''}`}
                        options={optionsFor((t) => t.area === 'yellow' && t.cell === cell)}
                        label={() => (state === 1 ? 'cross' : 'circle')}
                        onPick={onTarget}
                      >
                        {state === 2 ? x : Y2_CELLS[cell].value}
                      </OptionCell>
                    </span>
                  );
                })}
                <span className="y2-rowend">
                  <span className="y2-arrow">▶</span>
                  <BonusIcon2 bonus={Y2_ROW_BONUS[r]} earned={yellowRowDone(sheet, r)} />
                </span>
              </Fragment>
            ))}
            {Y2_COL_BONUS.map((b, c) => (
              <span key={c} className="y2-colend">
                <span className="y2-arrow">▼</span>
                <BonusIcon2 bonus={b} earned={yellowColDone(sheet, c)} />
              </span>
            ))}
            <span />
          </div>
        </div>

        {/* Blue */}
        <div className="area s2-blue">
          <div className="t2-row">
            <span className="track-arrow">➜</span>
            {Array.from({ length: TRACK_LENGTH2 }, (_, i) => {
              const written = sheet.blue[i];
              const b = B2_BONUS[i];
              return (
                <span key={i} className="track-col">
                  <span className={`track-points ${i === blueNext - 1 ? 'current' : ''}`}>{B2_POINTS[i + 1]}</span>
                  <span className="b2-cellrow">
                    {i > 0 && <span className="b2-sep">≥</span>}
                    <OptionCell
                      className={`cell ${written !== undefined ? 'marked' : ''}`}
                      options={i === blueNext ? optionsFor((t) => t.area === 'blue') : []}
                      label={(t) => String((t as { value: number }).value)}
                      onPick={onTarget}
                    >
                      {written ?? ''}
                    </OptionCell>
                  </span>
                  <span className="track-bonus">{b && <BonusIcon2 bonus={b} earned={written !== undefined} />}</span>
                </span>
              );
            })}
          </div>
          <div className="b3-note muted">blue + white · each number at most the previous one</div>
        </div>

        {/* Green */}
        <div className="area s2-green">
          <div className="g2-row">
            <span className="track-arrow">➜</span>
            {Array.from({ length: TRACK_LENGTH2 / 2 }, (_, k) => {
              const pair = greenPair(sheet, k);
              return (
                <span key={k} className="g2-pair">
                  <span className={`g2-star ${pair !== null ? 'earned' : ''}`}>{pair !== null ? pair : '−'}</span>
                  <span className="g2-cells">
                    {[2 * k, 2 * k + 1].map((i) => {
                      const minus = i % 2 === 1 ? <span className="g2-minus">−</span> : null;
                      const written = sheet.green[i];
                      const b = G2_BONUS[i];
                      const m = G2_MULT[i];
                      return (
                        <Fragment key={i}>
                        {minus}
                        <span className="track-col">
                          <OptionCell
                            className={`cell ${written !== undefined ? 'marked' : ''}`}
                            options={i === greenNext ? optionsFor((t) => t.area === 'green') : []}
                            label={(t) => {
                              const n = (t as { value: number }).value;
                              return `${n} × ${m} = ${n * m}`;
                            }}
                            onPick={onTarget}
                          >
                            {written ?? <span className="mult">×{m}</span>}
                          </OptionCell>
                          <span className="track-bonus">{b && <BonusIcon2 bonus={b} earned={written !== undefined} />}</span>
                        </span>
                        </Fragment>
                      );
                    })}
                  </span>
                </span>
              );
            })}
          </div>
          <div className="b3-note muted">die × multiplier · every pair scores first − second</div>
        </div>

        {/* Pink */}
        <div className="area s2-pink">
          <div className="t2-row">
            <span className="track-arrow">➜</span>
            {Array.from({ length: TRACK_LENGTH2 }, (_, i) => {
              const written = sheet.pink[i];
              const b = P2_BONUS[i];
              const min = P2_MIN[i];
              return (
                <span key={i} className="track-col">
                  <OptionCell
                    className={`cell ${written !== undefined ? 'marked' : ''}`}
                    options={i === pinkNext ? optionsFor((t) => t.area === 'pink') : []}
                    label={(t) => String((t as { value: number }).value)}
                    onPick={onTarget}
                  >
                    {written ?? (min !== null ? <span className="mult">≥{min}</span> : '')}
                  </OptionCell>
                  <span className="track-bonus">{b && <BonusIcon2 bonus={b} earned={pinkBonusEarned(sheet, i)} lost={written !== undefined && !pinkBonusEarned(sheet, i)} />}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="score-row">
        <span className="sc sc2-silver">{pts('silver')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc2-yellow">{pts('yellow')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc2-blue">{pts('blue')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc2-green">{pts('green')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc2-pink">{pts('pink')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc-fox" title={`${score.foxes} fox(es) × lowest area`}>
          🦊{score.foxes} = {score.foxPoints}
        </span>
        <span className="sc-plus">=</span>
        <span className="sc sc-total">{score.total}</span>
        <span className="sc-actions">
          ⟳ {sheet.rerollsUnlocked - sheet.rerollsUsed} · ↩ {sheet.returnsUnlocked - sheet.returnsUsed} · +1 {sheet.plusOnesUnlocked - sheet.plusOnesUsed}
        </span>
      </div>
    </div>
  );
}
