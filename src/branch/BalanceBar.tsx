import type { Balance } from '../store/scoring';

/**
 * Which way a branch's weight sits, and how much of it there is — without a total.
 * A sum is a verdict, and a verdict does not belong on a card you are still writing:
 * the segments are a share of this one branch's own weight, so nothing here claims
 * anything about the branch beside it.
 */
export function BalanceBar({ balance }: { balance: Balance }) {
  if (balance.count === 0) return null;

  const { forTotal, againstTotal, pros, cons } = balance;

  return (
    <div
      className="balance"
      title={`for ${forTotal}, against ${againstTotal}`}
      aria-label={`${pros.length} for, ${cons.length} against`}
    >
      <div className="balance__bar" aria-hidden="true">
        {forTotal > 0 && <span className="balance__side balance__side--for" style={{ flexGrow: forTotal }} />}
        {againstTotal > 0 && (
          <span className="balance__side balance__side--against" style={{ flexGrow: againstTotal }} />
        )}
      </div>
      {/* each count sits under the segment it belongs to, so the row lines up with the bar */}
      <p className="balance__counts data" aria-hidden="true">
        {pros.length > 0 && <span className="balance__count balance__count--for">{pros.length} for</span>}
        {cons.length > 0 && (
          <span className="balance__count balance__count--against">{cons.length} against</span>
        )}
      </p>
    </div>
  );
}
