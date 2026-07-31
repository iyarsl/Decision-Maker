import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import { isResolved, KIND_LABEL, type TreeNode } from '../../types';
import { useDecisionStore } from '../../store/useDecisionStore';
import { balanceOf } from '../../store/scoring';
import { BalanceBar } from '../../branch/BalanceBar';
import { FEELINGS } from '../../panel/feelings';
import { NODE_WIDTH } from '../layout';

export function ThoughtNode({ id, data }: NodeProps<TreeNode>) {
  const addChild = useDecisionStore((s) => s.addChild);
  const openCompare = useDecisionStore((s) => s.openCompare);
  const openWeigh = useDecisionStore((s) => s.openWeigh);
  const toggleChosen = useDecisionStore((s) => s.toggleChosen);
  const deleteNode = useDecisionStore((s) => s.deleteNode);
  const selectNode = useDecisionStore((s) => s.selectNode);
  // the first node is the decision itself: it cannot be deleted, and nothing feeds into it.
  // A node dropped on empty canvas is not root — it can be deleted and connected up later.
  const isRoot = useDecisionStore((s) => s.doc.nodes[0]?.id === id);
  const solo = useDecisionStore((s) => s.selectedNodeId === id);
  const branchCount = useDecisionStore((s) => s.doc.edges.filter((e) => e.source === id).length);
  const deciding = useDecisionStore((s) => s.mode === 'decide');

  const resolved = isResolved(data);
  const balance = balanceOf(data);
  const feeling = data.feeling === undefined ? undefined : FEELINGS.find((f) => f.value === data.feeling);

  return (
    <>
      {/* one toolbar, or none: its actions speak for a single card, so a multi-selection
          leaves it out rather than stacking three sets of buttons on the canvas */}
      <NodeToolbar isVisible={solo} position={Position.Top} offset={10}>
        <div className="node-tools">
          {/* deciding leaves one action standing: marking the path you are taking is the
              decision itself, not a change to the reasoning behind it */}
          {!deciding && (
            <button className="btn" onClick={() => addChild(id)} title="Add a branch from here">
              + Branch
            </button>
          )}
          {!deciding && (
            <>
              <button
                className="btn"
                onClick={() => openWeigh(id)}
                title="What's for this branch, what's against"
              >
                Weigh
              </button>
              <button
                className="btn"
                disabled={branchCount < 2}
                onClick={() => openCompare(id)}
                title={
                  branchCount < 2
                    ? 'Compare needs at least two branches from this card'
                    : 'Put the branches from here side by side'
                }
              >
                Compare
              </button>
            </>
          )}
          <button
            className={data.chosen ? 'btn btn--signal' : 'btn'}
            onClick={() => toggleChosen(id)}
            title={deciding ? "Mark the path you're taking" : "Mark the path you're leaning toward"}
          >
            {deciding
              ? data.chosen
                ? 'Taking this'
                : 'Take this path'
              : data.chosen
                ? 'Leaning'
                : 'Lean here'}
          </button>
          {!isRoot && !deciding && (
            <button className="btn btn--quiet" onClick={() => deleteNode(id)} title="Delete this branch">
              Delete
            </button>
          )}
        </div>
      </NodeToolbar>

      <Handle type="target" position={Position.Left} isConnectable={!isRoot} />

      <article
        className={[
          'node-card',
          `node-card--${data.kind}`,
          resolved ? 'is-resolved' : 'is-unresolved',
          data.chosen ? 'is-chosen' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ width: NODE_WIDTH }}
        data-guide={isRoot ? 'root-card' : undefined}
        onDoubleClick={() => selectNode(id)}
      >
        <header className="node-card__head">
          <span className="eyebrow">{KIND_LABEL[data.kind]}</span>
          <span className="node-card__state data" aria-label={resolved ? 'Thought through' : 'Not yet written'}>
            {resolved ? '●' : '○'}
          </span>
        </header>

        <h3 className="node-card__label" dir="auto">
          {data.label || 'Untitled branch'}
        </h3>

        {resolved && (
          <p className="node-card__note" dir="auto">
            {data.note}
          </p>
        )}

        <BalanceBar balance={balance} />

        {(data.verdict || feeling || data.likelihood !== undefined) && (
          <footer className="node-card__foot data">
            {data.verdict && (
              <span className="node-card__verdict" title={`Leads by ${data.verdict.margin}`}>
                <bdi>{data.verdict.winnerLabel}</bdi> leads
              </span>
            )}
            {data.likelihood !== undefined && <span>{data.likelihood}% likely</span>}
            {feeling && <span title={feeling.label}>{feeling.glyph}</span>}
          </footer>
        )}
      </article>

      <Handle type="source" position={Position.Right} />
    </>
  );
}
