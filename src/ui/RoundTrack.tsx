import type { ReactNode } from 'react';

/** The round boxes with their bonuses. With `onNext`, the box of the coming round is a button. */
export function RoundTrack<B>({
  bonuses,
  round,
  totalRounds,
  icon,
  onNext,
}: {
  bonuses: readonly (B | null)[];
  round: number;
  totalRounds: number;
  icon: (b: B) => ReactNode;
  onNext?: () => void;
}) {
  return (
    <div className="round-track">
      {bonuses.map((b, i) => {
        const n = i + 1;
        const next = !!onNext && n === round + 1 && n <= totalRounds;
        const cls = ['round-box', n <= round ? 'marked' : '', n > totalRounds ? 'unused' : '', next ? 'next' : ''].join(' ');
        const inner = (
          <>
            <span className="round-num">{n}</span>
            {b && icon(b)}
          </>
        );
        return next ? (
          <button key={n} type="button" className={cls} onClick={onNext} title={`Start round ${n}`} aria-label={`Start round ${n}`}>
            {inner}
          </button>
        ) : (
          <div key={n} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
