import { useEffect, useRef } from 'react';
import { useDecisionStore } from '../store/useDecisionStore';
import { isResolved, KIND_LABEL, type Feeling, type NodeKind } from '../types';
import { FEELINGS } from './feelings';
import './panel.css';

const KINDS: NodeKind[] = ['decision', 'option', 'outcome'];

export function ThoughtPanel() {
  const nodeId = useDecisionStore((s) => s.selectedNodeId);
  const node = useDecisionStore((s) => s.doc.nodes.find((n) => n.id === s.selectedNodeId));
  const updateNodeData = useDecisionStore((s) => s.updateNodeData);
  const addChild = useDecisionStore((s) => s.addChild);
  const openGridForNode = useDecisionStore((s) => s.openGridForNode);
  const toggleChosen = useDecisionStore((s) => s.toggleChosen);
  const selectNode = useDecisionStore((s) => s.selectNode);
  const deleteNode = useDecisionStore((s) => s.deleteNode);
  const isRoot = useDecisionStore((s) => s.doc.nodes[0]?.id === s.selectedNodeId);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (node && !node.data.label) labelRef.current?.focus();
  }, [node]);

  if (!node || !nodeId) return null;

  const { data } = node;
  const resolved = isResolved(data);

  return (
    <aside className="panel enter" aria-label={`Thinking on ${data.label || 'this branch'}`}>
      <header className="panel__head">
        <div>
          <span className="eyebrow">{KIND_LABEL[data.kind]}</span>
          <p className={resolved ? 'panel__state panel__state--clear data' : 'panel__state data'}>
            {resolved ? 'Thought through' : 'Not written yet'}
          </p>
        </div>
        <button className="btn btn--quiet" onClick={() => selectNode(null)} aria-label="Close">
          Close
        </button>
      </header>

      <div className="panel__body">
        <label className="panel__field">
          <span className="eyebrow">Name this branch</span>
          <input
            ref={labelRef}
            className="field panel__label-input"
            dir="auto"
            value={data.label}
            placeholder="Take the offer"
            onChange={(event) => updateNodeData(nodeId, { label: event.target.value })}
          />
        </label>

        <fieldset className="panel__field panel__kinds">
          <legend className="eyebrow">This is a</legend>
          <div className="segmented">
            {KINDS.map((kind) => (
              <button
                key={kind}
                className={kind === data.kind ? 'segmented__item is-on' : 'segmented__item'}
                aria-pressed={kind === data.kind}
                onClick={() => updateNodeData(nodeId, { kind })}
              >
                {KIND_LABEL[kind]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="panel__field panel__field--grow">
          <span className="eyebrow">Your thinking here</span>
          <textarea
            className="field panel__note"
            data-guide="note"
            dir="auto"
            value={data.note}
            onChange={(event) => updateNodeData(nodeId, { note: event.target.value })}
          />
          <span className="panel__help">A written branch comes out of the fog.</span>
        </label>

        <fieldset className="panel__field">
          <legend className="eyebrow">Gut read</legend>
          <div className="feelings">
            {FEELINGS.map((feeling) => (
              <button
                key={feeling.value}
                className={data.feeling === feeling.value ? 'feelings__item is-on' : 'feelings__item'}
                aria-pressed={data.feeling === feeling.value}
                title={feeling.label}
                onClick={() =>
                  updateNodeData(nodeId, {
                    feeling: data.feeling === feeling.value ? undefined : (feeling.value as Feeling),
                  })
                }
              >
                <span aria-hidden="true">{feeling.glyph}</span>
                <span className="sr-only">{feeling.label}</span>
              </button>
            ))}
            <span className="panel__help feelings__caption">
              {data.feeling === undefined
                ? 'Optional — what the scoring misses'
                : FEELINGS.find((f) => f.value === data.feeling)?.label}
            </span>
          </div>
        </fieldset>

        {data.kind === 'outcome' && (
          <label className="panel__field">
            <span className="eyebrow">How likely does this feel</span>
            <div className="slider-row">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={data.likelihood ?? 50}
                onChange={(event) => updateNodeData(nodeId, { likelihood: Number(event.target.value) })}
              />
              <output className="data">{data.likelihood ?? 50}%</output>
            </div>
          </label>
        )}

        {data.verdict && (
          <p className="panel__verdict data">
            Grid says <strong><bdi>{data.verdict.winnerLabel}</bdi></strong>, ahead by {data.verdict.margin}.
          </p>
        )}
      </div>

      <footer className="panel__foot">
        <button className="btn" data-guide="branch" onClick={() => addChild(nodeId)}>
          + Branch from here
        </button>
        <button className="btn" data-guide="compare" onClick={() => openGridForNode(nodeId)}>
          Compare options
        </button>
        <button
          className={data.chosen ? 'btn btn--signal' : 'btn'}
          onClick={() => toggleChosen(nodeId)}
        >
          {data.chosen ? 'Leaning this way' : 'Lean this way'}
        </button>
        {!isRoot && (
          <button className="btn btn--danger" onClick={() => deleteNode(nodeId)} title="Delete this branch and everything under it">
            Delete branch
          </button>
        )}
      </footer>
    </aside>
  );
}
