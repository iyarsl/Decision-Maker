import { useCallback, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { useDecisionStore } from '../store/useDecisionStore';
import { isResolved, type TreeNode } from '../types';
import { ThoughtNode } from './nodes/ThoughtNode';
import { ThoughtEdge } from './edges/ThoughtEdge';
import './canvas.css';

const nodeTypes = { thought: ThoughtNode };
const edgeTypes = { thought: ThoughtEdge };

export function Canvas() {
  const nodes = useDecisionStore((s) => s.doc.nodes);
  const edges = useDecisionStore((s) => s.doc.edges);
  const onNodesChange = useDecisionStore((s) => s.onNodesChange);
  const onEdgesChange = useDecisionStore((s) => s.onEdgesChange);
  const onConnect = useDecisionStore((s) => s.onConnect);
  const selectNode = useDecisionStore((s) => s.selectNode);
  const addChild = useDecisionStore((s) => s.addChild);
  const addLooseNode = useDecisionStore((s) => s.addLooseNode);
  const selectedNodeId = useDecisionStore((s) => s.selectedNodeId);
  const { screenToFlowPosition } = useReactFlow();

  const onSelectionChange = useCallback(
    ({ nodes: selection }: OnSelectionChangeParams) => {
      selectNode(selection.length === 1 ? selection[0].id : null);
    },
    [selectNode],
  );

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // only empty canvas makes a card — double-clicking a card, the minimap or the
      // controls bubbles up here too, and used to drop a stray node behind them
      const onChrome = (event.target as HTMLElement).closest(
        '.react-flow__node, .react-flow__edge, .react-flow__controls, .react-flow__minimap, .react-flow__panel',
      );
      if (onChrome) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addLooseNode({ x: position.x - 126, y: position.y - 58 });
    },
    [addLooseNode, screenToFlowPosition],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!selectedNodeId) return;
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        addChild(selectedNodeId);
      }
    },
    [addChild, selectedNodeId],
  );

  const minimapColor = useMemo(
    () => (node: TreeNode) => {
      if (node.data.chosen) return 'var(--signal)';
      return isResolved(node.data) ? 'var(--mist)' : 'var(--edge)';
    },
    [],
  );

  const unwritten = nodes.filter((node) => !isResolved(node.data)).length;

  return (
    <div className="canvas" onKeyDown={onKeyDown}>
      <ReactFlow<TreeNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'thought' }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onDoubleClick={onPaneDoubleClick}
        onPaneClick={() => selectNode(null)}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Shift']}
        selectionKeyCode={['Shift']}
        panOnScroll
        panOnDrag
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.35, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.4} color="var(--edge)" />
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap
          pannable
          zoomable
          nodeColor={minimapColor}
          maskColor="color-mix(in srgb, var(--ground) 76%, transparent)"
          position="bottom-left"
        />
        <Panel position="top-left" className="canvas-hint">
          <p className="data">Drag to move · double-click for a branch · drag a handle to connect</p>
          {unwritten > 0 && (
            <p className="canvas-hint__pending data">
              {unwritten} branch{unwritten === 1 ? '' : 'es'} still unwritten
            </p>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}
