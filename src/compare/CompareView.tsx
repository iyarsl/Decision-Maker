import { useEffect, useMemo, useRef } from 'react';
import { useDecisionStore, childrenOf } from '../store/useDecisionStore';
import { compareBranches, type Standing } from '../store/scoring';
import { LedgerReadout } from '../branch/LedgerReadout';
import './compare.css';

/**
 * The branches of one intersection, side by side. Nothing is written here: each column
 * is the case that branch already holds, so the comparison can never disagree with the
 * branch it came from.
 */
export function CompareView() {
  const nodeId = useDecisionStore((s) => s.compareNodeId);
  const ownerLabel = useDecisionStore(
    (s) => s.doc.nodes.find((n) => n.id === s.compareNodeId)?.data.label ?? '',
  );
  // the doc itself is a stable reference between mutations — deriving here rather than in a
  // selector keeps this from handing back a new array on every render
  const doc = useDecisionStore((s) => s.doc);
  const closeCompare = useDecisionStore((s) => s.closeCompare);
  const openWeigh = useDecisionStore((s) => s.openWeigh);
  const selectNode = useDecisionStore((s) => s.selectNode);
  const deciding = useDecisionStore((s) => s.mode === 'decide');

  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  const branches = useMemo(() => (nodeId ? childrenOf(doc, nodeId) : []), [doc, nodeId]);
  const result = useMemo(() => compareBranches(branches), [branches]);
  const span = useMemo(
    () => Math.max(1, ...result.ranked.map((s) => Math.abs(s.balance.net))),
    [result],
  );

  if (!nodeId) return null;

  // the list is what you came here to fix, so go straight to it — unless there is nothing
  // to fix, in which case the card's own reading is the right place to land
  const openBranch = (branchId: string) => {
    closeCompare();
    if (deciding) selectNode(branchId);
    else openWeigh(branchId);
  };

  return (
    <div className="compare-scrim" onMouseDown={(event) => event.target === event.currentTarget && closeCompare()}>
      <section
        ref={sheetRef}
        tabIndex={-1}
        className="compare-sheet enter"
        role="dialog"
        aria-modal="true"
        aria-label="Compare branches"
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeCompare();
        }}
      >
        <header className="compare-sheet__head">
          <div className="compare-sheet__title">
            <span className="eyebrow">Weighing what follows from</span>
            <h2 className="compare-sheet__question" dir="auto">
              <bdi>{ownerLabel || 'this decision'}</bdi>
            </h2>
          </div>
          <button className="btn" onClick={closeCompare}>
            Done
          </button>
        </header>

        <div className="compare-scroll">
          <div className="compare-columns">
            {result.ranked.map((standing) => (
              <Column
                key={standing.nodeId}
                standing={standing}
                span={span}
                leads={result.leader?.nodeId === standing.nodeId && !result.tied && result.weighed > 0}
                openLabel={deciding ? 'Read this branch' : 'Weigh this branch'}
                onOpen={() => openBranch(standing.nodeId)}
              />
            ))}
          </div>
        </div>

        <footer className="compare-sheet__foot" data-guide="verdict">
          <Readout />
        </footer>
      </section>
    </div>
  );

  function Readout() {
    if (result.weighed === 0) {
      return (
        <p className="readout readout--empty">
          Nothing weighed yet. Open a branch and list what is for it and against it — this reads what
          you write there.
        </p>
      );
    }
    if (!result.leader) return null;

    const rest =
      result.unweighed > 0 ? (
        <span className="readout__caveat">
          {' '}
          {result.unweighed} branch{result.unweighed === 1 ? ' has' : 'es have'} nothing listed yet.
        </span>
      ) : null;

    if (result.tied) {
      return (
        <p className="readout">
          Dead level. Either something that matters is missing from one of these lists, or the choice is
          closer than it feels.
          {rest}
        </p>
      );
    }

    return (
      <p className="readout">
        <strong>
          <bdi>{result.leader.label || 'The first branch'}</bdi>
        </strong>{' '}
        is ahead by {result.margin}
        {result.carriedBy ? (
          <>
            {' '}
            — carried by{' '}
            <em>
              <bdi>{result.carriedBy.text}</bdi>
            </em>
          </>
        ) : null}
        .{rest}
      </p>
    );
  }
}

function Column({
  standing,
  span,
  leads,
  openLabel,
  onOpen,
}: {
  standing: Standing;
  span: number;
  leads: boolean;
  openLabel: string;
  onOpen: () => void;
}) {
  const { balance } = standing;
  const width = `${(Math.abs(balance.net) / span) * 100}%`;

  return (
    <article className={leads ? 'compare-col is-leading' : 'compare-col'}>
      <header className="compare-col__head">
        <h3 className="compare-col__label" dir="auto">
          <bdi>{standing.label || 'Untitled branch'}</bdi>
        </h3>
        <p className="compare-col__net data">
          <span className={balance.net > 0 ? 'is-for' : balance.net < 0 ? 'is-against' : undefined}>
            net {balance.net > 0 ? '+' : ''}
            {balance.net}
          </span>
          {leads && <span className="compare-col__flag">Ahead</span>}
        </p>
        <div className="compare-col__bar" aria-hidden="true">
          <span
            className={balance.net < 0 ? 'compare-col__fill is-against' : 'compare-col__fill'}
            style={{ width }}
          />
        </div>
      </header>

      {balance.count === 0 ? (
        <p className="panel__help compare-col__empty">Nothing listed for this one yet.</p>
      ) : (
        <LedgerReadout balance={balance} />
      )}

      <button className="btn btn--quiet compare-col__open" onClick={onOpen}>
        {openLabel}
      </button>
    </article>
  );
}
