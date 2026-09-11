import { describeBonus, type Bonus } from '../game/sheet';

export function BonusIcon({ bonus, earned, big }: { bonus: Bonus; earned?: boolean; big?: boolean }) {
  const cls = ['bonus', earned ? 'earned' : '', big ? 'big' : ''].join(' ');
  const title = describeBonus(bonus);
  switch (bonus.type) {
    case 'reroll':
      return <span className={`${cls} b-black`} title={title}>⟳</span>;
    case 'plusOne':
      return <span className={`${cls} b-black`} title={title}>+1</span>;
    case 'fox':
      return <span className={`${cls} b-fox`} title={title}>🦊</span>;
    case 'x':
      return <span className={`${cls} b-${bonus.color}`} title={title}>X</span>;
    case 'number':
      return <span className={`${cls} b-${bonus.color}`} title={title}>{bonus.value}</span>;
    case 'roundFour':
      return (
        <span className="bonus-pair" title={title}>
          <span className={`${cls} b-any`}>X</span>
          <span className={`${cls} b-any`}>6</span>
        </span>
      );
  }
}
