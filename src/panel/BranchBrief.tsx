import { useDecisionStore } from '../store/useDecisionStore';
import { balanceOf } from '../store/scoring';
import { LedgerReadout } from '../branch/LedgerReadout';
import { BalanceBar } from '../branch/BalanceBar';
import { KIND_LABEL, type TreeNodeData } from '../types';
import { FEELINGS } from './feelings';

/**
 * The reading of a branch while deciding: everything it holds, nothing you can change.
 * Leaning is the exception — marking the path you are taking is the decision, not an
 * edit to the reasoning behind it.
 */
export function BranchBrief({ nodeId, data }: { nodeId: string; data: TreeNodeData }) {
  const toggleChosen = useDecisionStore((s) => s.toggleChosen);
  const openCompare = useDecisionStore((s) => s.openCompare);
  const selectNode = useDecisionStore((s) => s.selectNode);
  const branchCount = useDecisionStore((s) => s.doc.edges.filter((e) => e.source === nodeId).length);

  const balance = balanceOf(data);
  const feeling = data.feeling === undefined ? undefined : FEELINGS.find((f) => f.value === data.feeling);

  return (
    <aside className="panel panel--brief enter" aria-label={`Reading ${data.label || 'this branch'}`}>
      <header className="panel__head">
        <div>
          <span className="eyebrow">{KIND_LABEL[data.kind]}</span>
          <p className="panel__state data">Deciding</p>
        </div>
        <button className="btn btn--quiet" onClick={() => selectNode(null)} aria-label="Close">
          Close
        </button>
      </header>

      <div className="panel__body brief">
        <h2 className="brief__label" dir="auto">
          <bdi>{data.label || 'Untitled branch'}</bdi>
        </h2>

        {data.note.trim() ? (
          <p className="brief__note" dir="auto">
            {data.note}
          </p>
        ) : (
          <p className="panel__help">Nothing was written into this branch.</p>
        )}

        {balance.count > 0 ? (
          <>
            <BalanceBar balance={balance} />
            {/* both sides at once: reading a case means seeing what answers what */}
            <div className="brief__case">
              <LedgerReadout balance={balance} />
            </div>
          </>
        ) : (
          <p className="panel__help">Nothing was listed for or against it.</p>
        )}

        {(feeling || data.likelihood !== undefined) && (
          <p className="brief__aside data">
            {feeling && (
              <span>
                Gut read: <strong>{feeling.label}</strong>
              </span>
            )}
            {data.likelihood !== undefined && <span>{data.likelihood}% likely</span>}
          </p>
        )}

        {data.verdict && (
          <p className="panel__verdict data">
            Of the branches here, <strong><bdi>{data.verdict.winnerLabel}</bdi></strong> leads by{' '}
            {data.verdict.margin}.
          </p>
        )}
      </div>

      <footer className="panel__foot">
        <button
          className={data.chosen ? 'btn btn--signal' : 'btn'}
          onClick={() => toggleChosen(nodeId)}
          title="Mark the path you're taking"
        >
          {data.chosen ? 'Taking this' : 'Take this path'}
        </button>
        {branchCount >= 2 && (
          <button className="btn" onClick={() => openCompare(nodeId)}>
            Compare branches
          </button>
        )}
      </footer>
    </aside>
  );
}
