import { statedWeight, weightOf } from '../store/scoring';
import type { Balance } from '../store/scoring';
import type { LedgerItem, Side } from '../types';

/**
 * A branch's case, read-only: both sides, each line with what it actually counts, and any
 * answer nested under the line it answers. One rendering, used by the comparison and by the
 * branch brief — two of these would drift apart.
 */
export function LedgerReadout({ balance }: { balance: Balance }) {
  if (balance.count === 0) return null;
  return (
    <>
      <ReadSide items={balance.pros} side="pro" total={balance.forTotal} />
      <ReadSide items={balance.cons} side="con" total={balance.againstTotal} />
    </>
  );
}

function ReadSide({ items, side, total }: { items: LedgerItem[]; side: Side; total: number }) {
  if (items.length === 0) return null;
  return (
    <div className={`ledger-read ledger-read--${side}`}>
      <p className="eyebrow ledger-read__head">
        {side === 'pro' ? 'For' : 'Against'} <span className="data">{total}</span>
      </p>
      <ul className="ledger-read__list">
        {items.map((item) => {
          const answers = (item.counters ?? []).filter((counter) => counter.text.trim());
          const counted = weightOf(item);
          return (
            <li key={item.id} className="ledger-read__item">
              <p className="ledger-read__line">
                <span className="ledger-read__text" dir="auto">
                  <bdi>{item.text}</bdi>
                </span>
                {/* an unrated line with nothing against it carries no number: it counts as
                    one, and "×1" would claim the user decided that */}
                {(item.weight !== undefined || answers.length > 0) && (
                  <span className="ledger-read__weight data" aria-label={`counts ${counted}`}>
                    ×{counted}
                  </span>
                )}
              </p>

              {answers.map((counter) => (
                <p key={counter.id} className={`ledger-read__counter ledger-read__counter--${side}`}>
                  <span dir="auto">
                    <bdi>{counter.text}</bdi>
                  </span>
                  <span className="ledger-read__weight data">−{statedWeight(counter)}</span>
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
