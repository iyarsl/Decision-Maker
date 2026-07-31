import { useEffect, useRef, useState } from 'react';
import { useDecisionStore } from '../store/useDecisionStore';
import { balanceOf, MAX_WEIGHT, MIN_WEIGHT, WEIGHT_LABEL, weightOf } from '../store/scoring';
import { KIND_LABEL, type Counter, type LedgerItem, type Side } from '../types';
import './branch.css';

const STEPS = Array.from({ length: MAX_WEIGHT - MIN_WEIGHT + 1 }, (_, i) => MIN_WEIGHT + i);

const SIDES: { side: Side; eyebrow: string; add: string; empty: string }[] = [
  { side: 'pro', eyebrow: "What's for it", add: '+ Add a pro', empty: 'Nothing for it yet.' },
  { side: 'con', eyebrow: "What's against", add: '+ Add a con', empty: 'Nothing against it yet.' },
];

/**
 * One branch, weighed on its own: what is for it, what is against it, and how much each
 * line counts. It takes the whole screen because a line needs room for its own words —
 * Compare only ever reads what is written here.
 */
export function BranchPage() {
  const nodeId = useDecisionStore((s) => s.weighNodeId);
  const node = useDecisionStore((s) => s.doc.nodes.find((n) => n.id === s.weighNodeId));
  const closeWeigh = useDecisionStore((s) => s.closeWeigh);
  const updateNodeData = useDecisionStore((s) => s.updateNodeData);
  const addLedgerItem = useDecisionStore((s) => s.addLedgerItem);

  // the line just added takes the caret, so a click leads straight into typing
  const [freshId, setFreshId] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  if (!nodeId || !node) return null;

  const { data } = node;
  const ledger = data.ledger ?? [];
  const balance = balanceOf(data);
  const span = Math.max(1, balance.forTotal, balance.againstTotal);

  return (
    <div
      className="branch-scrim"
      onMouseDown={(event) => event.target === event.currentTarget && closeWeigh()}
    >
      <section
        ref={sheetRef}
        tabIndex={-1}
        className="branch-sheet enter"
        role="dialog"
        aria-modal="true"
        aria-label="Weigh this branch"
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeWeigh();
        }}
      >
        <header className="branch-sheet__head">
          <div className="branch-sheet__lead">
            <button className="btn btn--quiet branch-sheet__back" onClick={closeWeigh}>
              ‹ Back to the map
            </button>
            <span className="eyebrow">Weighing this {KIND_LABEL[data.kind].toLowerCase()}</span>
          </div>

          <input
            className="branch-sheet__title"
            dir="auto"
            value={data.label}
            placeholder="Name this branch"
            aria-label="Name this branch"
            onChange={(event) => updateNodeData(nodeId, { label: event.target.value })}
          />

          {data.note.trim() && (
            <p className="branch-sheet__note" dir="auto">
              {data.note}
            </p>
          )}
        </header>

        <div className="branch-scroll">
          <div className="ledger">
            {SIDES.map(({ side, eyebrow, add, empty }, index) => {
              const rows = ledger.filter((item) => item.side === side);
              const total = side === 'pro' ? balance.forTotal : balance.againstTotal;
              return (
                <section className={`ledger__side ledger__side--${side}`} key={side}>
                  <p className="ledger__head">
                    <span className="eyebrow">{eyebrow}</span>
                    <span className="ledger__total data">{total}</span>
                  </p>

                  {rows.length === 0 ? (
                    <p className="ledger__empty">{empty}</p>
                  ) : (
                    <ul className="ledger__list">
                      {rows.map((item, row) => (
                        <LedgerRow
                          key={item.id}
                          nodeId={nodeId}
                          item={item}
                          autoFocus={item.id === freshId}
                          anchorWeight={index === 0 && row === 0}
                          onEnter={() => setFreshId(addLedgerItem(nodeId, side))}
                        />
                      ))}
                    </ul>
                  )}

                  <button
                    className="ledger__add"
                    data-guide={side === 'pro' ? 'pro' : undefined}
                    onClick={() => setFreshId(addLedgerItem(nodeId, side))}
                  >
                    {add}
                  </button>
                </section>
              );
            })}
          </div>
        </div>

        <footer className="branch-sheet__foot" role="status">
          {balance.count === 0 ? (
            <p className="ledger__empty">
              Nothing listed yet — one line per thing that is for this branch or against it, in your own
              words.
            </p>
          ) : (
            <>
              <div className="ledger__scales" aria-hidden="true">
                <span
                  className="ledger__scale ledger__scale--for"
                  style={{ width: `${(balance.forTotal / span) * 100}%` }}
                />
                <span
                  className="ledger__scale ledger__scale--against"
                  style={{ width: `${(balance.againstTotal / span) * 100}%` }}
                />
              </div>
              <p className="ledger__figures data">
                <strong className={balance.net > 0 ? 'is-for' : balance.net < 0 ? 'is-against' : undefined}>
                  net {balance.net > 0 ? '+' : ''}
                  {balance.net}
                </strong>
                <span>
                  for {balance.forTotal} · against {balance.againstTotal}
                </span>
              </p>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

function LedgerRow({
  nodeId,
  item,
  autoFocus,
  anchorWeight,
  onEnter,
}: {
  nodeId: string;
  item: LedgerItem;
  autoFocus: boolean;
  /** the walkthrough points at one weight control; this is the one */
  anchorWeight: boolean;
  onEnter: () => void;
}) {
  const updateLedgerItem = useDecisionStore((s) => s.updateLedgerItem);
  const removeLedgerItem = useDecisionStore((s) => s.removeLedgerItem);
  const addCounter = useDecisionStore((s) => s.addCounter);
  const [freshCounter, setFreshCounter] = useState<string | null>(null);
  const textRef = useAutoHeight(item.text, autoFocus);

  const name = item.text.trim();
  const counters = item.counters ?? [];
  const counted = weightOf(item);

  return (
    <li className="ledger__item">
      <textarea
        ref={textRef}
        className="ledger__text"
        dir="auto"
        rows={1}
        value={item.text}
        placeholder={item.side === 'pro' ? 'Something for it' : 'Something against it'}
        aria-label={item.side === 'pro' ? 'A pro' : 'A con'}
        onChange={(event) => updateLedgerItem(nodeId, item.id, { text: event.target.value })}
        onKeyDown={(event) => onEnterAdds(event, onEnter)}
      />

      <div className="ledger__meta">
        <div
          className={item.weight === undefined ? 'ledger__weight is-unrated' : 'ledger__weight'}
          role="radiogroup"
          aria-label={`How much ${name || 'this'} counts — optional`}
          data-guide={anchorWeight ? 'weight' : undefined}
        >
          {STEPS.map((step) => (
            <button
              key={step}
              role="radio"
              aria-checked={item.weight === step}
              aria-label={String(step)}
              title={
                item.weight === step ? `${WEIGHT_LABEL[step]} — click to leave it unrated` : WEIGHT_LABEL[step]
              }
              className={pipClass(step, item.weight, counted)}
              // clicking the step it is already on takes the rating back off
              onClick={() =>
                updateLedgerItem(nodeId, item.id, { weight: item.weight === step ? undefined : step })
              }
            />
          ))}
        </div>

        <button
          className="ledger__remove"
          aria-label={`Remove ${name || 'this line'}`}
          title="Remove this line"
          onClick={() => removeLedgerItem(nodeId, item.id)}
        >
          ×
        </button>
      </div>

      {counters.length > 0 && (
        <ul className="counters">
          {counters.map((counter) => (
            <CounterRow
              key={counter.id}
              nodeId={nodeId}
              itemId={item.id}
              counter={counter}
              side={item.side}
              autoFocus={counter.id === freshCounter}
              onEnter={() => setFreshCounter(addCounter(nodeId, item.id))}
            />
          ))}
        </ul>
      )}

      <button
        className="ledger__counter-add"
        onClick={() => setFreshCounter(addCounter(nodeId, item.id))}
        title={
          item.side === 'pro'
            ? 'The con that comes straight back at this pro'
            : 'The pro that comes straight back at this con'
        }
      >
        {item.side === 'pro' ? '↩ But…' : '↩ Even so…'}
      </button>
    </li>
  );
}

/** the answer to a line: written where it belongs, and taken off what that line counts */
function CounterRow({
  nodeId,
  itemId,
  counter,
  side,
  autoFocus,
  onEnter,
}: {
  nodeId: string;
  itemId: string;
  counter: Counter;
  side: Side;
  autoFocus: boolean;
  onEnter: () => void;
}) {
  const updateCounter = useDecisionStore((s) => s.updateCounter);
  const removeCounter = useDecisionStore((s) => s.removeCounter);
  const textRef = useAutoHeight(counter.text, autoFocus);
  const name = counter.text.trim();

  return (
    <li className={`counter counter--${side === 'pro' ? 'con' : 'pro'}`}>
      <textarea
        ref={textRef}
        className="counter__text"
        dir="auto"
        rows={1}
        value={counter.text}
        placeholder={side === 'pro' ? 'But…' : 'Even so…'}
        aria-label={side === 'pro' ? 'A con answering this pro' : 'A pro answering this con'}
        onChange={(event) => updateCounter(nodeId, itemId, counter.id, { text: event.target.value })}
        onKeyDown={(event) => onEnterAdds(event, onEnter)}
      />

      <div className="counter__meta">
        <div
          className={counter.weight === undefined ? 'ledger__weight is-unrated' : 'ledger__weight'}
          role="radiogroup"
          aria-label={`How much ${name || 'this answer'} takes off — optional`}
        >
          {STEPS.map((step) => (
            <button
              key={step}
              role="radio"
              aria-checked={counter.weight === step}
              aria-label={String(step)}
              title={WEIGHT_LABEL[step]}
              className={
                counter.weight !== undefined && step <= counter.weight ? 'ledger__pip is-on' : 'ledger__pip'
              }
              onClick={() =>
                updateCounter(nodeId, itemId, counter.id, {
                  weight: counter.weight === step ? undefined : step,
                })
              }
            />
          ))}
        </div>

        <button
          className="ledger__remove"
          aria-label={`Remove ${name || 'this answer'}`}
          title="Remove this answer"
          onClick={() => removeCounter(nodeId, itemId, counter.id)}
        >
          ×
        </button>
      </div>
    </li>
  );
}

/**
 * Enter starts the next line rather than a second paragraph of this one — listing is the
 * common case, and a line long enough to need its own break can still have one with
 * shift+Enter. An empty line adds nothing: there is one waiting already.
 */
function onEnterAdds(event: React.KeyboardEvent<HTMLTextAreaElement>, add: () => void) {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  if (event.currentTarget.value.trim()) add();
}

/**
 * Filled up to what the line actually counts; the steps an answer has taken off are struck
 * through rather than emptied. The bar says "you rated this 4, it is worth 1 now" without
 * a sentence saying so.
 */
function pipClass(step: number, stated: number | undefined, counted: number) {
  // an unrated line stays unrated to look at, answered or not
  if (stated === undefined) return 'ledger__pip';
  if (step <= counted) return 'ledger__pip is-on';
  if (step <= stated) return 'ledger__pip is-cut';
  return 'ledger__pip';
}

/** a field that is as tall as its text, so nothing written is ever out of sight */
function useAutoHeight(text: string, autoFocus: boolean) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }, [text]);

  return ref;
}
