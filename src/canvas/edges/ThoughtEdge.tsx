import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { isResolved } from '../../types';
import { useDecisionStore } from '../../store/useDecisionStore';

/**
 * An edge is only as solid as the thinking at its end: it stays hairline and dashed
 * until the branch it feeds has reasoning written into it.
 */
export function ThoughtEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps) {
  // one primitive per selector — zustand compares them with Object.is
  const resolved = useDecisionStore((s) => {
    const targetNode = s.doc.nodes.find((n) => n.id === target);
    return targetNode ? isResolved(targetNode.data) : false;
  });
  const chosen = useDecisionStore((s) => {
    const sourceNode = s.doc.nodes.find((n) => n.id === source);
    const targetNode = s.doc.nodes.find((n) => n.id === target);
    return Boolean(sourceNode?.data.chosen && targetNode?.data.chosen);
  });
  const state = { resolved, chosen };

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.32,
  });

  const stroke = state.chosen ? 'var(--signal)' : state.resolved ? 'var(--mist)' : 'var(--mist-faint)';

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      className={state.chosen ? 'thought-edge is-chosen' : 'thought-edge'}
      style={{
        stroke,
        strokeWidth: state.chosen ? 2.4 : state.resolved ? 1.6 : 1,
        strokeDasharray: state.resolved || state.chosen ? undefined : '3 6',
        opacity: state.resolved || state.chosen ? 1 : 0.6,
      }}
    />
  );
}
