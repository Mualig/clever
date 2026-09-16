import {
  blueAntiCount,
  blueColCount,
  blueDiagCount,
  blueRowCount,
  greenFieldPoints,
  greyColumnDone,
  greyCrossed,
  greyShadeDone,
  score4,
  yellowColumnPoints,
  yellowColumnsDone,
  type Sheet4,
  type Target4,
} from '../game/rules4';
import {
  B4_ANTI_POINTS,
  B4_COL_POINTS,
  B4_DIAG_BONUS,
  B4_ROW_BONUS,
  G4_CELL_BONUS,
  G4_COL_POINTS,
  G4_COLS,
  G4_PART_OF,
  G4_ROWS,
  G4_SHADE_NAME,
  G4_SHADES,
  GR4_BONUS,
  GR4_DOUBLE_FROM,
  GR4_FIELDS,
  P4_BONUS,
  P4_CIRCLE_POINTS,
  P4_POINTS,
  PLUS_ONE_SLOTS4,
  POLISH_SLOTS4,
  REROLL_SLOTS4,
  ROUND_BONUS4,
  ROW_END_BONUS4,
  Y4_BONUS,
  Y4_COL_POINTS,
  Y4_COLS,
  describeBonus4,
  type Bonus4,
  type Shade,
} from '../game/sheet4';
import { OptionCell } from './SheetView3';
import { RoundTrack } from './RoundTrack';

export function BonusIcon4({ bonus, earned, lost, big }: { bonus: Bonus4; earned?: boolean; lost?: boolean; big?: boolean }) {
  const cls = ['bonus', earned ? 'earned' : '', lost ? 'lost' : '', big ? 'big' : ''].join(' ');
  const title = describeBonus4(bonus);
  switch (bonus.type) {
    case 'reroll':
      return <span className={`${cls} b-black`} title={title}>⟳</span>;
    case 'plusOne':
      return <span className={`${cls} b-black`} title={title}>+1</span>;
    case 'polish':
      return <span className={`${cls} b-black b4-polish`} title={title}>◉</span>;
    case 'fox':
      return <span className={`${cls} b-fox`} title={title}>🦊</span>;
    case 'q':
      return <span className={`${cls} b4-${bonus.color}`} title={title}>?</span>;
  }
}

function ActionRow({ icon, title, unlocked, used, slots, end }: { icon: string; title: string; unlocked: number; used: number; slots: number; end: Bonus4 | null }) {
  return (
    <div className="action-bar" title={title}>
      <span className="bonus b-black big">{icon}</span>
      {Array.from({ length: slots }, (_, i) => (
        <span key={i} className={`slot ${i < used ? 'used' : i < unlocked ? 'available' : ''}`} />
      ))}
      {end && <BonusIcon4 bonus={end} earned={unlocked >= slots} />}
      <span className="action-count">{unlocked - used}</span>
    </div>
  );
}

/** What writing `value` in pink field `i` does, for the option menu. */
function pinkLabel(value: number, i: number): string {
  const b = P4_BONUS[i];
  switch (value) {
    case 2:
      return '2 (circle, +2)';
    case 3:
      return '3 (and another 3)';
    case 4:
      return '4 (circle, +4)';
    case 5:
      return b ? `5 (${describeBonus4(b)})` : '5';
    case 6:
      return b ? `6 (${describeBonus4(b)}, circle +3)` : '6 (circle, +3)';
    default:
      return String(value);
  }
}

interface Props {
  sheet: Sheet4;
  round: number;
  totalRounds: number;
  targets?: Target4[];
  onTarget?: (t: Target4) => void;
  /** Score-card mode: makes the next round's box clickable. */
  onNextRound?: () => void;
}

const SHADES: readonly Shade[] = ['W', 'L', 'D'];
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function SheetView4({ sheet, round, totalRounds, targets = [], onTarget, onNextRound }: Props) {
  const score = score4(sheet);
  const pts = (key: string) => score.areas.find((a) => a.key === key)!.points;
  const optionsFor = (pred: (t: Target4) => boolean) => targets.filter(pred);
  const x = <span className="x">✕</span>;
  const yellowDone = yellowColumnsDone(sheet);
  const pinkNext = sheet.pink.length;

  return (
    <div className="sheet sheet4">
      <div className="sheet-top">
        <RoundTrack bonuses={ROUND_BONUS4} round={round} totalRounds={totalRounds} icon={(b) => <BonusIcon4 bonus={b} />} onNext={onNextRound} />
        <div className="action-bars">
          <ActionRow icon="⟳" title="Re-rolls" unlocked={sheet.rerollsUnlocked} used={sheet.rerollsUsed} slots={REROLL_SLOTS4} end={ROW_END_BONUS4.reroll} />
          <ActionRow icon="◉" title="Polish silver (±1 on a platter die)" unlocked={sheet.polishUnlocked} used={sheet.polishUsed} slots={POLISH_SLOTS4} end={ROW_END_BONUS4.polish} />
          <ActionRow icon="+1" title="+1 actions" unlocked={sheet.plusOnesUnlocked} used={sheet.plusOnesUsed} slots={PLUS_ONE_SLOTS4} end={ROW_END_BONUS4.plusOne} />
        </div>
      </div>

      <div className="areas areas4">
        {/* Yellow */}
        <div className="area s4-yellow">
          {sheet.yellow.map((row, r) => (
            <div key={r} className="rows-pair">
              <div className="y4-row">
                <span className="y4-label">{r === 0 ? '↗' : r === 1 ? '−' : '+'}</span>
                {Array.from({ length: Y4_COLS }, (_, c) => {
                  const written = row[c];
                  return (
                    <span key={c} className="y4-cellpos">
                      {r === 0 && c > 0 && <span className="y4-sep">&lt;</span>}
                      <OptionCell
                        className={`cell ${written !== undefined ? 'marked' : ''}`}
                        options={c === row.length ? optionsFor((t) => t.area === 'yellow' && t.row === r) : []}
                        label={(t) => String((t as { value: number }).value)}
                        onPick={onTarget}
                      >
                        {written ?? <span className="pre">{r === 0 ? '' : r === 1 ? '−' : '+'}</span>}
                      </OptionCell>
                    </span>
                  );
                })}
                <span className={`row-pts ${row.length ? 'earned' : ''}`}>{r === 0 ? '' : r === 1 ? `−${sum(row)}` : `+${sum(row)}`}</span>
              </div>
              {r < 2 && (
                <div className="y4-gap">
                  <span className="y4-label" />
                  {Y4_BONUS[r].map((b, c) => (
                    <span key={c} className="gap-slot">
                      {b && <BonusIcon4 bonus={b} earned={row.length > c} />}
                    </span>
                  ))}
                  <span />
                </div>
              )}
            </div>
          ))}
          <div className="y4-gap y4-cols">
            <span className="y4-label" />
            {Y4_COL_POINTS.map((p, c) => (
              <span key={c} className="gap-slot">
                <span className={`col-points ${yellowDone > c ? 'earned' : ''}`}>{p}</span>
              </span>
            ))}
            <span className={`row-pts ${yellowDone ? 'earned' : ''}`}>+{yellowColumnPoints(sheet)}</span>
          </div>
        </div>

        {/* Blue */}
        <div className="area s4-blue">
          <div className="b4-grid">
            <span className="b4-corner" title="row = blue die, column = white die">
              <span className="b4-die b4-die-blue" />
              <span className="b4-die b4-die-white" />
            </span>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <span key={n} className="b4-head b4-head-white">
                {n}
              </span>
            ))}
            <span />
            {sheet.blue.map((row, r) => (
              <>
                <span key={`l${r}`} className="b4-head b4-head-blue">
                  {r + 1}
                </span>
                {row.map((marked, c) => (
                  <OptionCell
                    key={`${r}-${c}`}
                    className={`cell b4 ${marked ? 'marked' : ''} ${r === c || r + c === 5 ? 'diag' : ''}`}
                    options={optionsFor((t) => t.area === 'blue' && t.row === r && t.col === c)}
                    label={() => 'cross'}
                    onPick={onTarget}
                  >
                    {marked ? x : <span className="pre">{c + 1}</span>}
                  </OptionCell>
                ))}
                <span key={`b${r}`} className="gap-slot">
                  <BonusIcon4 bonus={B4_ROW_BONUS[r]} earned={blueRowCount(sheet, r) >= 2} />
                </span>
              </>
            ))}
            <span className="gap-slot">
              <span className={`col-points ${blueAntiCount(sheet) >= 2 ? 'earned' : ''}`} title="2 crosses on the ↙ diagonal">
                {B4_ANTI_POINTS}
              </span>
            </span>
            {B4_COL_POINTS.map((p, c) => (
              <span key={c} className="gap-slot">
                <span className={`col-points ${blueColCount(sheet, c) >= 2 ? 'earned' : ''}`}>{p}</span>
              </span>
            ))}
            <span className="gap-slot">
              <BonusIcon4 bonus={B4_DIAG_BONUS} earned={blueDiagCount(sheet) >= 2} />
            </span>
          </div>
          <div className="area-note muted">row = blue die, column = white die · 2 ✕ in a row: bonus · 2 ✕ in a column: points</div>
        </div>

        {/* Grey */}
        <div className="area s4-grey">
          <div className="g4-scroll">
            <div className="g4-grid">
              {G4_COL_POINTS.map((p, c) => (
                <span key={c} className={`col-points g4-pts ${greyColumnDone(sheet, c) ? 'earned' : ''}`}>
                  {p}
                </span>
              ))}
              {Array.from({ length: G4_ROWS }, (_, r) =>
                Array.from({ length: G4_COLS }, (_, c) => {
                  const marked = greyCrossed(sheet, r, c);
                  const b = G4_CELL_BONUS[`${r},${c}`];
                  const part = G4_PART_OF[r * G4_COLS + c];
                  return (
                    <OptionCell
                      key={`${r}-${c}`}
                      className={`cell g4 g4-${G4_SHADES[r][c]} ${marked ? 'marked' : ''} ${c === 0 && r !== 2 ? 'start' : ''}`}
                      options={optionsFor((t) => t.area === 'grey' && t.part === part)}
                      label={() => 'cross the part'}
                      onPick={onTarget}
                    >
                      {marked ? x : b ? <BonusIcon4 bonus={b} /> : ''}
                    </OptionCell>
                  );
                }),
              )}
            </div>
          </div>
          <div className="g4-foot">
            {SHADES.map((sh) => {
              const done = greyShadeDone(sheet, sh);
              return (
                <span key={sh} className={`g4-fox g4-${sh} ${done ? 'earned' : ''}`} title={`Fox for crossing every ${G4_SHADE_NAME[sh]} cell`}>
                  🦊 {G4_SHADE_NAME[sh]}
                  {done ? ' ✓' : ''}
                </span>
              );
            })}
            <span className="muted g4-note">die ≥ part size · start in column 1, then adjacent · full column: points</span>
          </div>
        </div>

        {/* Green */}
        <div className="area s4-green">
          <div className="gr4-row">
            <span className="track-arrow">➜</span>
            {Array.from({ length: GR4_FIELDS }, (_, i) => {
              const top = sheet.greenTop[i];
              const bottom = sheet.greenBottom[i];
              const p = greenFieldPoints(sheet, i);
              return (
                <span key={i} className="track-col">
                  <span className={`track-points ${p !== null ? 'earned' : ''}`}>{p ?? (i >= GR4_DOUBLE_FROM ? '×2' : '')}</span>
                  <span className="g4-field">
                    <OptionCell
                      className={`cell tri tri-top ${top !== undefined ? 'marked' : ''}`}
                      options={i === sheet.greenTop.length ? optionsFor((t) => t.area === 'green' && t.row === 'top') : []}
                      label={(t) => `top: ${(t as { value: number }).value}`}
                      onPick={onTarget}
                    >
                      {top ?? ''}
                    </OptionCell>
                    <OptionCell
                      className={`cell tri tri-bottom ${bottom !== undefined ? 'marked' : ''}`}
                      options={i === sheet.greenBottom.length ? optionsFor((t) => t.area === 'green' && t.row === 'bottom') : []}
                      label={(t) => `bottom: ${(t as { value: number }).value}`}
                      onPick={onTarget}
                    >
                      {bottom ?? ''}
                    </OptionCell>
                  </span>
                  <span className="track-bonus">
                    <BonusIcon4 bonus={GR4_BONUS[i]} earned={i < sheet.greenBottom.length} />
                  </span>
                </span>
              );
            })}
          </div>
          <div className="area-note muted">upper and lower triangles each fill left to right · lower triangle: bonus · both filled: sum (×2 from field 4)</div>
        </div>

        {/* Pink */}
        <div className="area s4-pink">
          <div className="p4-row">
            <span className="track-arrow">➜</span>
            {P4_POINTS.map((p, i) => {
              const written = sheet.pink[i];
              const b = P4_BONUS[i];
              return (
                <span key={i} className="track-col">
                  <span className={`track-points ${i === pinkNext - 1 ? 'earned' : ''}`}>{p}</span>
                  <OptionCell
                    className={`cell ${written !== undefined ? 'marked' : ''} ${written !== undefined && P4_CIRCLE_POINTS[written] ? 'circled' : ''}`}
                    options={i === pinkNext ? optionsFor((t) => t.area === 'pink') : []}
                    label={(t) => pinkLabel((t as { value: number }).value, i)}
                    onPick={onTarget}
                  >
                    {written ?? ''}
                  </OptionCell>
                  <span className="track-bonus">{b && <BonusIcon4 bonus={b} earned={written !== undefined && written >= 5} lost={written !== undefined && written < 5} />}</span>
                </span>
              );
            })}
          </div>
          <div className="area-note muted">2: ○ +2 · 3: another 3 follows · 4: ○ +4 · 5: bonus below · 6: bonus below, ○ +3 · score: last field</div>
        </div>
      </div>

      <div className="score-row">
        <span className="sc sc4-yellow">{pts('yellow')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc4-blue">{pts('blue')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc4-grey">{pts('grey')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc4-green">{pts('green')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc4-pink">{pts('pink')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc-fox" title={`${score.foxes} fox(es) × lowest area`}>
          🦊{score.foxes} = {score.foxPoints}
        </span>
        <span className="sc-plus">=</span>
        <span className="sc sc-total">{score.total}</span>
        <span className="sc-actions">
          ⟳ {sheet.rerollsUnlocked - sheet.rerollsUsed} · ◉ {sheet.polishUnlocked - sheet.polishUsed} · +1 {sheet.plusOnesUnlocked - sheet.plusOnesUsed}
        </span>
      </div>
    </div>
  );
}
