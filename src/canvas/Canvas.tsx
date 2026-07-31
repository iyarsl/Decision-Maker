import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { NODE_WIDTH } from './layout';
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
  const focusNode = useDecisionStore((s) => s.focusNode);
  const addChild = useDecisionStore((s) => s.addChild);
  const addLooseNode = useDecisionStore((s) => s.addLooseNode);
  const selectedNodeId = useDecisionStore((s) => s.selectedNodeId);
  const alignBranches = useDecisionStore((s) => s.alignBranches);
  const { screenToFlowPosition, flowToScreenPosition, getNode, getViewport, setViewport, fitView } =
    useReactFlow<TreeNode>();

  // Moving a card is not asking to read it. The panel opens on a click that did not turn
  // into a drag; anything else only ever closes it.
  const dragged = useRef(false);

  const onNodeDragStart = useCallback(() => {
    dragged.current = true;
    focusNode(null);
  }, [focusNode]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: TreeNode) => {
      if (dragged.current) {
        dragged.current = false;
        return;
      }
      focusNode(node.id);
    },
    [focusNode],
  );

  // the panel speaks for one card at a time; a multi-selection has nothing single to say
  const onSelectionChange = useCallback(
    ({ nodes: selection }: OnSelectionChangeParams) => {
      if (selection.length !== 1) focusNode(null);
    },
    [focusNode],
  );

  // The panel is a drawer over the canvas: a card near the right edge would sit behind it.
  // Slide the view just far enough to keep the card it belongs to in the open.
  useEffect(() => {
    if (!selectedNodeId) return;
    const frame = requestAnimationFrame(() => {
      const node = getNode(selectedNodeId);
      const panel = document.querySelector('.panel')?.getBoundingClientRect();
      if (!node || !panel) return;
      const right = flowToScreenPosition({
        x: node.position.x + (node.measured?.width ?? NODE_WIDTH),
        y: node.position.y,
      });
      const width = node.measured?.width ?? NODE_WIDTH;
      const hidden = right.x - panel.left;
      // a sliver behind the drawer is fine; only move when a real part of the card is gone
      if (hidden < width * 0.25) return;
      const overlap = hidden + 24;
      const view = getViewport();
      setViewport({ ...view, x: view.x - overlap }, { duration: 240 });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedNodeId, getNode, flowToScreenPosition, getViewport, setViewport]);

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
  const selectedCount = nodes.filter((node) => node.selected).length;

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
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onDoubleClick={onPaneDoubleClick}
        onPaneClick={() => selectNode(null)}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Control', 'Meta', 'Shift']}
        selectionKeyCode={['Control', 'Meta', 'Shift']}
        panOnScroll
        panOnDrag
        zoomOnDoubleClick={false}
        connectionRadius={46}
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
        <Panel position="top-right" className="canvas-tools">
          <button
            className="btn"
            onClick={() => {
              alignBranches();
              window.requestAnimationFrame(() => fitView({ padding: 0.25, duration: 320, maxZoom: 1 }));
            }}
            title="Put every branch back on one grid, centred under what it came from"
          >
            Align branches
          </button>
        </Panel>

        <Panel position="top-left" className="canvas-hint">
          <p className="data">Drag to move · ctrl-click for several · double-click for a branch</p>
          {selectedCount > 1 && (
            <p className="canvas-hint__selection data" role="status">
              {selectedCount} branches held — drag one, they all move
            </p>
          )}
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
