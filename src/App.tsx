import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Header } from './chrome/Header';
import { Canvas } from './canvas/Canvas';
import { ThoughtPanel } from './panel/ThoughtPanel';
import { GridView } from './grid/GridView';
import { GuideTour } from './guide/GuideTour';
import { useDecisionStore } from './store/useDecisionStore';

export default function App() {
  const theme = useDecisionStore((s) => s.theme);
  const gridOpen = useDecisionStore((s) => Boolean(s.openGridId));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  // Escape always steps back out: grid first, then the thought panel
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const { openGridId, selectedNodeId, closeGrid, selectNode } = useDecisionStore.getState();
      if (openGridId) closeGrid();
      else if (selectedNodeId) selectNode(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Delete removes the branch you are looking at, panel open or not — but never while
  // the caret is in a field, where the key belongs to the text
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === 'SELECT') return;
      // a field only claims the key while it has text to delete — a branch you just added
      // sits with the caret in an empty name, and Delete there means the branch
      const field = target as HTMLInputElement | HTMLTextAreaElement | null;
      if ((target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') && field?.value.length) {
        return;
      }
      const { selectedNodeId, openGridId, doc, deleteNode } = useDecisionStore.getState();
      if (openGridId || !selectedNodeId || doc.nodes[0]?.id === selectedNodeId) return;
      event.preventDefault();
      deleteNode(selectedNodeId);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app">
      <Header />
      <ReactFlowProvider>
        <main className="app__stage enter">
          <Canvas />
          <ThoughtPanel />
        </main>
        {gridOpen && <GridView />}
      </ReactFlowProvider>
      <GuideTour />
    </div>
  );
}
