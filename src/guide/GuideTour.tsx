import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDecisionStore } from '../store/useDecisionStore';
import { isResolved } from '../types';
import { GUIDE_STEPS, type GuideSnapshot, type Place } from './steps';
import { useGuide } from './useGuide';
import './guide.css';

const CARD_WIDTH = 320;
const GAP = 16;
const MARGIN = 12;
const HALO = 8;

export function GuideTour() {
  const active = useGuide((s) => s.active);
  const seen = useGuide((s) => s.seen);
  const start = useGuide((s) => s.start);
  const untouched = useDecisionStore((s) => s.doc.nodes.length === 1 && s.doc.question.trim().length === 0);

  // first visit on an empty decision: offer the walkthrough rather than an empty canvas
  useEffect(() => {
    if (seen || active || !untouched) return;
    const timer = setTimeout(start, 900);
    return () => clearTimeout(timer);
  }, [seen, active, untouched, start]);

  if (!active) return null;
  return <Tour />;
}

function Tour() {
  const index = useGuide((s) => s.step);
  const next = useGuide((s) => s.next);
  const back = useGuide((s) => s.back);
  const goto = useGuide((s) => s.goto);
  const end = useGuide((s) => s.end);

  const step = GUIDE_STEPS[index] ?? GUIDE_STEPS[0];
  const snap = useSnapshot();
  const rect = useAnchorRect(step.anchor);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(220);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [index, rect]);

  const satisfied = step.done ? step.done(snap) : false;

  // when the action itself moves the interface, follow it; when the user is typing, wait
  useEffect(() => {
    if (!satisfied || step.advance !== 'auto') return;
    const timer = setTimeout(next, 650);
    return () => clearTimeout(timer);
  }, [satisfied, step, next]);

  const waiting = Boolean(step.anchor) && !rect;
  const position = place(rect, waiting ? 'center' : step.place ?? 'right', cardHeight);
  const last = index === GUIDE_STEPS.length - 1;

  return (
    <div className="guide" role="dialog" aria-modal="false" aria-label="Walkthrough">
      {rect && !waiting && (
        <div
          className="guide__halo"
          style={{
            top: rect.top - HALO,
            left: rect.left - HALO,
            width: rect.width + HALO * 2,
            height: rect.height + HALO * 2,
          }}
        />
      )}
      {(!rect || waiting) && <div className="guide__veil" />}

      <div ref={cardRef} className="guide__card" style={position} data-guide-card>
        <header className="guide__head">
          <span className="eyebrow">{step.eyebrow}</span>
          <button className="guide__close" onClick={end} aria-label="End the walkthrough">
            Skip
          </button>
        </header>

        <h2 className="guide__title">{step.title}</h2>
        <p className="guide__body">{waiting && step.missing ? step.missing : step.body}</p>

        {step.done && (
          <p className={satisfied ? 'guide__check data is-done' : 'guide__check data'}>
            {satisfied ? 'Done — carry on' : 'Try it now, then continue'}
          </p>
        )}

        <footer className="guide__foot">
          <ol className="guide__ticks" aria-label={`Step ${index + 1} of ${GUIDE_STEPS.length}`}>
            {GUIDE_STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  className={i === index ? 'guide__tick is-on' : i < index ? 'guide__tick is-past' : 'guide__tick'}
                  aria-label={s.title}
                  aria-current={i === index}
                  onClick={() => goto(i)}
                />
              </li>
            ))}
          </ol>

          <div className="guide__nav">
            {index > 0 && (
              <button className="btn btn--quiet" onClick={back}>
                Back
              </button>
            )}
            <button className={satisfied ? 'btn guide__go' : 'btn'} onClick={last ? end : next}>
              {last ? 'Start deciding' : index === 0 ? 'Show me' : 'Next'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** everything the steps watch for, as primitives so the store selectors stay stable */
function useSnapshot(): GuideSnapshot {
  const hasQuestion = useDecisionStore((s) => s.doc.question.trim().length > 0);
  const nodeCount = useDecisionStore((s) => s.doc.nodes.length);
  const writtenCount = useDecisionStore((s) => s.doc.nodes.filter((n) => isResolved(n.data)).length);
  const hasSelection = useDecisionStore((s) => s.selectedNodeId !== null);
  const weighOpen = useDecisionStore((s) => s.weighNodeId !== null);
  const compareOpen = useDecisionStore((s) => s.compareNodeId !== null);
  const ledgerItems = useDecisionStore((s) =>
    s.doc.nodes.reduce(
      (count, node) => count + (node.data.ledger ?? []).filter((item) => item.text.trim()).length,
      0,
    ),
  );
  return { hasQuestion, nodeCount, writtenCount, hasSelection, weighOpen, compareOpen, ledgerItems };
}

/**
 * Anchors move: cards are dragged, the canvas pans, panels slide in. Re-measure on
 * every frame but only re-render when the rounded rect actually changed.
 */
function useAnchorRect(selector?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    let frame = 0;
    let key = '';
    const tick = () => {
      const element = document.querySelector(selector);
      const next = element?.getBoundingClientRect() ?? null;
      const nextKey = next
        ? [next.top, next.left, next.width, next.height].map(Math.round).join(':')
        : '';
      if (nextKey !== key) {
        key = nextKey;
        setRect(next && next.width > 0 ? next : null);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [selector]);

  return rect;
}

/** put the card beside the anchor, flipping and clamping to stay on screen */
function place(rect: DOMRect | null, preferred: Place, height: number): React.CSSProperties {
  const view = { w: window.innerWidth, h: window.innerHeight };

  if (!rect || preferred === 'center') {
    return {
      top: Math.max(MARGIN, view.h / 2 - height / 2),
      left: Math.max(MARGIN, view.w / 2 - CARD_WIDTH / 2),
    };
  }

  const fits: Record<Place, boolean> = {
    right: rect.right + GAP + CARD_WIDTH + MARGIN <= view.w,
    left: rect.left - GAP - CARD_WIDTH - MARGIN >= 0,
    bottom: rect.bottom + GAP + height + MARGIN <= view.h,
    top: rect.top - GAP - height - MARGIN >= 0,
    center: true,
  };
  const flip: Record<Place, Place> = {
    right: 'left',
    left: 'right',
    bottom: 'top',
    top: 'bottom',
    center: 'center',
  };
  const side = fits[preferred] ? preferred : fits[flip[preferred]] ? flip[preferred] : preferred;

  let top: number;
  let left: number;
  if (side === 'right' || side === 'left') {
    top = rect.top + rect.height / 2 - height / 2;
    left = side === 'right' ? rect.right + GAP : rect.left - GAP - CARD_WIDTH;
  } else {
    top = side === 'bottom' ? rect.bottom + GAP : rect.top - GAP - height;
    left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
  }

  return {
    top: clamp(top, MARGIN, view.h - height - MARGIN),
    left: clamp(left, MARGIN, view.w - CARD_WIDTH - MARGIN),
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
