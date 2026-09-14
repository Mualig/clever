import { DIE_COLORS, type DieColor } from '../game/sheet';
import type { GameState } from '../game/types';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function Die({
  color,
  label,
  value,
  selectable,
  selected,
  discard,
  onClick,
}: {
  color: DieColor;
  label?: string;
  value: number;
  selectable?: boolean;
  selected?: boolean;
  /** Will go to the silver platter if the current selection is confirmed. */
  discard?: boolean;
  onClick?: () => void;
}) {
  const cls = ['die', `die-${color}`, selectable ? 'selectable' : '', selected ? 'selected' : '', discard ? 'discard' : ''].join(' ');
  return (
    <button type="button" className={cls} disabled={!selectable} onClick={onClick} aria-label={`${label ?? color} die showing ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={PIPS[value].includes(i) ? 'pip' : 'pip empty'} />
      ))}
    </button>
  );
}

export function DiceTray({
  game,
  labels,
  selectable,
  selected,
  discarding = [],
  onSelect,
}: {
  game: GameState;
  labels?: Record<DieColor, string>;
  selectable: DieColor[];
  selected: DieColor | null;
  discarding?: DieColor[];
  onSelect: (c: DieColor) => void;
}) {
  const { dice } = game;
  const pool = DIE_COLORS.filter((c) => dice.location[c] === 'pool');
  const platter = DIE_COLORS.filter((c) => dice.location[c] === 'platter');
  const chosen = dice.chosenOrder;
  const render = (c: DieColor) => (
    <Die
      key={c}
      color={c}
      label={labels?.[c]}
      value={dice.values[c]}
      selectable={selectable.includes(c)}
      selected={selected === c}
      discard={discarding.includes(c)}
      onClick={() => onSelect(c)}
    />
  );
  const soloPassive = game.solo && game.phase.kind === 'passive';
  const toRoll = game.phase.kind === 'beforeRoll';
  return (
    <div className="tray">
      <div className="tray-zone rolled">
        <div className="tray-label">{toRoll ? 'Next roll' : 'Rolled'}</div>
        <div className={`dice-row ${toRoll ? 'unrolled' : ''}`}>{pool.length ? pool.map(render) : <span className="tray-empty">–</span>}</div>
      </div>
      <div className="tray-zone">
        <div className="tray-label">{soloPassive ? 'Not on the platter' : 'Die fields'}</div>
        <div className="dice-row">
          {chosen.map(render)}
          {!soloPassive && Array.from({ length: Math.max(0, 3 - chosen.length) }, (_, i) => <span key={i} className="die-slot" />)}
        </div>
      </div>
      <div className="tray-zone platter">
        <div className="tray-label">Silver platter</div>
        <div className="dice-row">{platter.length ? platter.map(render) : <span className="tray-empty">empty</span>}</div>
      </div>
      <div className="tray-note">
        Blue value = blue {dice.values.blue} + white {dice.values.white} = <strong>{dice.values.blue + dice.values.white}</strong>
      </div>
    </div>
  );
}
