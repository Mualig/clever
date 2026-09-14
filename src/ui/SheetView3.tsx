import { useState, type ReactNode } from 'react';
import { brownLast, score3, turquoiseColDone, turquoiseRowDone, type Sheet3, type Target3 } from '../game/rules3';
import {
  ACTION_SLOTS3,
  ANY_NUMBER_SLOTS,
  B3_BONUS,
  B3_POINTS,
  B3_SIDE,
  BR3_GAP_BONUS,
  BR3_NUMBERS,
  BR3_POINTS,
  P3_BONUS,
  P3_MULT,
  ROUND_BONUS3,
  ROW_END_BONUS,
  T3_COL_BONUS,
  T3_COLORED,
  T3_ROW_BONUS,
  T3_ROW_POINTS,
  Y3_GAP_BONUS,
  Y3_GREY,
  Y3_ROW_POINTS,
  describeBonus3,
  type Bonus3,
} from '../game/sheet3';

export function BonusIcon3({ bonus, earned, lost, big }: { bonus: Bonus3; earned?: boolean; lost?: boolean; big?: boolean }) {
  const cls = ['bonus', earned ? 'earned' : '', lost ? 'lost' : '', big ? 'big' : ''].join(' ');
  const title = describeBonus3(bonus);
  switch (bonus.type) {
    case 'reroll':
      return <span className={`${cls} b-black`} title={title}>⟳</span>;
    case 'plusOne':
      return <span className={`${cls} b-black`} title={title}>+1</span>;
    case 'anyNumber':
      return <span className={`${cls} b-black b-any-number`} title={title}>⚄?</span>;
    case 'fox':
      return <span className={`${cls} b-fox`} title={title}>🦊</span>;
    case 'q':
      return <span className={`${cls} b3-${bonus.color}`} title={title}>?</span>;
    case 'tx':
      return <span className={`${cls} b3-turquoise`} title={title}>+✕</span>;
  }
}

/** A box that applies its single target on click, or opens a small menu when several targets fit. */
function OptionCell({
  className,
  options,
  label,
  onPick,
  children,
}: {
  className: string;
  options: Target3[];
  label: (t: Target3) => string;
  onPick?: (t: Target3) => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const active = options.length > 0 && !!onPick;
  return (
    <span className="cell-wrap">
      <button
        type="button"
        className={`${className} ${active ? 'target' : ''}`}
        disabled={!active}
        onClick={() => {
          if (!active) return;
          if (options.length === 1) onPick(options[0]);
          else setOpen((o) => !o);
        }}
      >
        {children}
      </button>
      {open && options.length > 1 && (
        <span className="options">
          {options.map((t, i) => (
            <button
              key={i}
              type="button"
              className="option"
              onClick={() => {
                setOpen(false);
                onPick!(t);
              }}
            >
              {label(t)}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function ActionRow({
  icon,
  title,
  unlocked,
  used,
  numbers,
  end,
}: {
  icon: string;
  title: string;
  unlocked: number;
  used: boolean[];
  numbers?: readonly (number | null)[];
  end: Bonus3;
}) {
  return (
    <div className="action-bar" title={title}>
      <span className="bonus b-black big">{icon}</span>
      {Array.from({ length: ACTION_SLOTS3 }, (_, i) => (
        <span key={i} className={`slot ${used[i] ? 'used' : i < unlocked ? 'available' : ''} ${numbers ? 'num' : ''}`}>
          {numbers ? (numbers[i] ?? '?') : ''}
        </span>
      ))}
      <BonusIcon3 bonus={end} earned={unlocked >= ACTION_SLOTS3} />
      <span className="action-count">{unlocked - used.filter(Boolean).length}</span>
    </div>
  );
}

interface Props {
  sheet: Sheet3;
  round: number;
  totalRounds: number;
  targets?: Target3[];
  onTarget?: (t: Target3) => void;
}

export function SheetView3({ sheet, round, totalRounds, targets = [], onTarget }: Props) {
  const score = score3(sheet);
  const pts = (key: string) => score.areas.find((a) => a.key === key)!.points;
  const optionsFor = (pred: (t: Target3) => boolean) => targets.filter(pred);
  const x = <span className="x">✕</span>;

  const yellowRowCount = (r: number) => sheet.yellow[r].filter(Boolean).length;
  const turqRowCount = (r: number) => sheet.turquoise[r].filter(Boolean).length;
  const last = brownLast(sheet);
  const pinkNext = sheet.pink.length;

  return (
    <div className="sheet sheet3">
      <div className="sheet-top">
        <div className="round-track">
          {ROUND_BONUS3.map((b, i) => {
            const n = i + 1;
            const cls = ['round-box', n <= round ? 'marked' : '', n > totalRounds ? 'unused' : ''].join(' ');
            return (
              <div key={n} className={cls}>
                <span className="round-num">{n}</span>
                {b && <BonusIcon3 bonus={b} />}
              </div>
            );
          })}
        </div>
        <div className="action-bars">
          <ActionRow icon="⟳" title="Re-rolls" unlocked={sheet.rerollsUnlocked} used={Array.from({ length: ACTION_SLOTS3 }, (_, i) => i < sheet.rerollsUsed)} end={ROW_END_BONUS.reroll} />
          <ActionRow icon="⚄?" title="Any number" unlocked={sheet.anyUnlocked} used={sheet.anyUsed} numbers={ANY_NUMBER_SLOTS} end={ROW_END_BONUS.anyNumber} />
          <ActionRow icon="+1" title="+1 actions" unlocked={sheet.plusOnesUnlocked} used={Array.from({ length: ACTION_SLOTS3 }, (_, i) => i < sheet.plusOnesUsed)} end={ROW_END_BONUS.plusOne} />
        </div>
      </div>

      <div className="areas areas3">
        {/* Yellow */}
        <div className="area s3-yellow">
          <div className="scale">
            {Y3_ROW_POINTS.slice(1).map((p, i) => (
              <span key={i} className="scale-item">
                <span className="scale-n">{i + 1}</span>
                <span className="scale-p">{p}</span>
              </span>
            ))}
          </div>
          <div className="rows">
          {sheet.yellow.map((row, r) => (
            <div key={r} className="rows-pair">
              <div className="y3-row">
                <span className="y3-label">{['I', 'II', 'III'][r]}</span>
                {row.map((marked, c) => (
                  <OptionCell
                    key={c}
                    className={`cell ${Y3_GREY[r][c] ? 'grey' : ''} ${marked ? 'marked' : ''}`}
                    options={optionsFor((t) => t.area === 'yellow' && t.row === r && t.col === c)}
                    label={() => 'cross'}
                    onPick={onTarget}
                  >
                    {marked ? x : c + 1}
                  </OptionCell>
                ))}
                <span className={`row-pts ${yellowRowCount(r) ? 'earned' : ''}`}>{Y3_ROW_POINTS[yellowRowCount(r)]}</span>
              </div>
              {r < 2 && (
                <div className="y3-gap">
                  <span className="y3-label" />
                  {Y3_GAP_BONUS[r].map((b, c) => (
                    <span key={c} className="gap-slot">
                      <BonusIcon3 bonus={b} earned={sheet.yellow[r][c] && sheet.yellow[r + 1][c]} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          </div>
        </div>

        {/* Turquoise */}
        <div className="area s3-turquoise">
          <div className="scale">
            {T3_ROW_POINTS.slice(1).map((p, i) => (
              <span key={i} className="scale-item">
                <span className="scale-n">{i + 1}</span>
                <span className="scale-p">{p}</span>
              </span>
            ))}
          </div>
          <div className="rows">
          {sheet.turquoise.map((row, r) => (
            <div key={r} className="t3-row">
              {row.map((marked, c) => (
                <OptionCell
                  key={c}
                  className={`cell ${c < T3_COLORED[r] ? 'tinted' : ''} ${marked ? 'marked' : ''}`}
                  options={optionsFor((t) => t.area === 'turquoise' && t.row === r && t.col === c)}
                  label={() => 'cross'}
                  onPick={onTarget}
                >
                  {marked ? x : c + 1}
                </OptionCell>
              ))}
              <span className="gap-slot">{T3_ROW_BONUS[r] ? <BonusIcon3 bonus={T3_ROW_BONUS[r]!} earned={turquoiseRowDone(sheet, r)} /> : <span className={`row-pts ${turqRowCount(r) ? 'earned' : ''}`}>{T3_ROW_POINTS[turqRowCount(r)]}</span>}</span>
            </div>
          ))}
          </div>
          <div className="t3-row t3-cols">
            {T3_COL_BONUS.map((b, c) => (
              <span key={c} className="gap-slot">
                <BonusIcon3 bonus={b} earned={turquoiseColDone(sheet, c)} />
              </span>
            ))}
            <span className="gap-slot" />
          </div>
        </div>

        {/* Blue */}
        <div className="area s3-blue">
          <div className="b3-row">
            {Array.from({ length: 2 * B3_SIDE + 1 }, (_, i) => {
              const side = i < B3_SIDE ? 'left' : i > B3_SIDE ? 'right' : null;
              const k = side === 'left' ? B3_SIDE - 1 - i : side === 'right' ? i - B3_SIDE - 1 : -1;
              const written = side === 'left' ? sheet.blueLeft[k] : side === 'right' ? sheet.blueRight[k] : 7;
              const isNext = side === 'left' ? k === sheet.blueLeft.length : side === 'right' ? k === sheet.blueRight.length : false;
              const dist = side ? k + 1 : 0;
              const b = B3_BONUS[i];
              return (
                <span key={i} className="b3-col">
                  <span className="track-points">{side ? B3_POINTS[dist] : ''}</span>
                  <span className="b3-cellrow">
                    {side === 'left' && i > 0 && <span className="b3-step">−1</span>}
                    {side === 'right' && <span className="b3-step">+1</span>}
                    <OptionCell
                      className={`cell ${side === null ? 'centre' : ''} ${written !== undefined && side !== null ? 'marked' : ''}`}
                      options={isNext ? optionsFor((t) => t.area === 'blue' && t.side === side) : []}
                      label={(t) => String((t as { value: number }).value)}
                      onPick={onTarget}
                    >
                      {written ?? ''}
                    </OptionCell>
                  </span>
                  <span className="track-bonus">{b && <BonusIcon3 bonus={b} earned={written !== undefined && side !== null} />}</span>
                </span>
              );
            })}
          </div>
          <div className="b3-note muted">blue + white · every 2, 3, 4, 10, 11, 12 written: +4</div>
        </div>

        {/* Brown */}
        <div className="area s3-brown">
          <div className="scale">
            {BR3_POINTS.slice(1).map((p, i) => (
              <span key={i} className={`scale-item ${sheet.brown.filter(Boolean).length === i + 1 ? 'current' : ''}`}>
                <span className="scale-n">{i + 1}</span>
                <span className="scale-p">{p}</span>
              </span>
            ))}
          </div>
          <div className="br3-row">
            <span className="track-arrow">➜</span>
            {BR3_NUMBERS.map((n, i) => (
              <span key={i} className={`br3-col ${i % 3 === 0 && i > 0 ? 'group' : ''}`}>
                {i > 0 && (
                  <span className="br3-gap">
                    {BR3_GAP_BONUS[i - 1] && <BonusIcon3 bonus={BR3_GAP_BONUS[i - 1]!} earned={sheet.brown[i - 1] && sheet.brown[i]} />}
                  </span>
                )}
                <OptionCell
                  className={`cell ${sheet.brown[i] ? 'marked' : i <= last ? 'skipped' : ''}`}
                  options={optionsFor((t) => t.area === 'brown' && t.index === i)}
                  label={() => 'cross'}
                  onPick={onTarget}
                >
                  {sheet.brown[i] ? x : n}
                </OptionCell>
              </span>
            ))}
          </div>
        </div>

        {/* Pink */}
        <div className="area s3-pink">
          <div className="p3-row">
            <span className="track-arrow">➜</span>
            {P3_MULT.map((m, i) => {
              const written = sheet.pink[i];
              const b = P3_BONUS[i];
              return (
                <span key={i} className="track-col">
                  <span className="track-points">{m === 0 ? '½' : `×${m}`}</span>
                  <OptionCell
                    className={`cell ${written !== undefined ? 'marked' : ''}`}
                    options={i === pinkNext ? optionsFor((t) => t.area === 'pink') : []}
                    label={(t) => {
                      const p = t as { mode: 'bonus' | 'points'; value: number };
                      return p.mode === 'bonus' ? `½ → ${Math.ceil(p.value / 2)}${b ? ' + bonus' : ''}` : `×${m} → ${p.value * m}`;
                    }}
                    onPick={onTarget}
                  >
                    {written ?? (i === 0 ? <span className="mult">½</span> : '')}
                  </OptionCell>
                  <span className="track-bonus">{b && <BonusIcon3 bonus={b} earned={sheet.pinkBonus[i] === true} lost={written !== undefined && !sheet.pinkBonus[i]} />}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="score-row">
        <span className="sc sc3-yellow">{pts('yellow')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc3-turquoise">{pts('turquoise')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc3-blue">{pts('blue')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc3-brown">{pts('brown')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc3-pink">{pts('pink')}</span>
        <span className="sc-plus">+</span>
        <span className="sc sc-fox" title={`${score.foxes} fox(es) × lowest area`}>
          🦊{score.foxes} = {score.foxPoints}
        </span>
        <span className="sc-plus">=</span>
        <span className="sc sc-total">{score.total}</span>
        <span className="sc-actions">
          ⟳ {sheet.rerollsUnlocked - sheet.rerollsUsed} · ⚄? {sheet.anyUnlocked - sheet.anyUsed.filter(Boolean).length} · +1 {sheet.plusOnesUnlocked - sheet.plusOnesUsed}
        </span>
      </div>
    </div>
  );
}
