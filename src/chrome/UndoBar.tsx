import { useEffect, useState } from 'react';
import { useDecisionStore } from '../store/useDecisionStore';
import './undo.css';

/** how long a step back stays on offer */
const WINDOW = 8000;

export function UndoBar() {
  const undo = useDecisionStore((s) => s.undo);
  const undoLast = useDecisionStore((s) => s.undoLast);
  const dismissUndo = useDecisionStore((s) => s.dismissUndo);
  const [left, setLeft] = useState(1);
  // the bar goes quiet after a few seconds, but the step back stays available to ctrl-Z
  // until something else replaces it
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!undo) return;
    setExpired(false);
    let frame = 0;
    const tick = () => {
      const remaining = 1 - (Date.now() - undo.at) / WINDOW;
      if (remaining <= 0) {
        setExpired(true);
        return;
      }
      setLeft(remaining);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [undo]);

  if (!undo || expired) return null;

  return (
    <div className="undo enter" role="status" aria-live="polite">
      <span className="undo__label data">{undo.label}</span>
      <button className="btn" onClick={undoLast}>
        Undo
      </button>
      <button className="undo__close" onClick={dismissUndo} aria-label="Dismiss">
        ×
      </button>
      <span className="undo__time" style={{ transform: `scaleX(${left})` }} aria-hidden="true" />
    </div>
  );
}
