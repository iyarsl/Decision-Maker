import { useEffect, useMemo, useRef, useState } from 'react';
import { useDecisionStore } from '../store/useDecisionStore';
import { scoreGrid } from '../store/scoring';
import { cellKey, type Cell, type GridMode } from '../types';
import { ScoreCell } from './ScoreCell';
import { WeightRow } from './WeightRow';
import { ResultBar } from './ResultBar';
import './grid.css';

const EMPTY_CELL: Cell = { score: 0, note: '' };
const MODES: { value: GridMode; label: string; hint: string }[] = [
  { value: 'weighted', label: 'Weighted', hint: 'Criteria count as much as you say they do' },
  { value: 'simple', label: 'Even', hint: 'Every criterion counts the same' },
];

export function GridView() {
  const grid = useDecisionStore((s) => (s.openGridId ? s.doc.grids[s.openGridId] : undefined));
  const ownerLabel = useDecisionStore((s) =>
    s.openGridId ? s.doc.nodes.find((n) => n.id === s.doc.grids[s.openGridId!]?.nodeId)?.data.label : '',
  );
  const closeGrid = useDecisionStore((s) => s.closeGrid);
  const setGridTitle = useDecisionStore((s) => s.setGridTitle);
  const setGridMode = useDecisionStore((s) => s.setGridMode);
  const addCriterion = useDecisionStore((s) => s.addCriterion);
  const updateCriterion = useDecisionStore((s) => s.updateCriterion);
  const removeCriterion = useDecisionStore((s) => s.removeCriterion);
  const addOption = useDecisionStore((s) => s.addOption);
  const updateOption = useDecisionStore((s) => s.updateOption);
  const removeOption = useDecisionStore((s) => s.removeOption);
  const setCell = useDecisionStore((s) => s.setCell);
  const promoteOptions = useDecisionStore((s) => s.promoteOptions);

  const [promoted, setPromoted] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  const result = useMemo(() => (grid ? scoreGrid(grid) : undefined), [grid]);

  if (!grid || !result) return null;

  const weighted = grid.mode === 'weighted';
  const maxAbs = Math.max(1, ...result.results.map((r) => Math.abs(r.total)));
  // the criteria column narrows on small screens via --criteria-col
  const columns = `var(--criteria-col, minmax(190px, 220px)) repeat(${grid.options.length}, minmax(180px, 1fr))`;

  return (
    <div className="grid-scrim" onMouseDown={(event) => event.target === event.currentTarget && closeGrid()}>
      <section
        ref={sheetRef}
        tabIndex={-1}
        className="grid-sheet enter"
        role="dialog"
        aria-modal="true"
        aria-label="Compare options"
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeGrid();
        }}
      >
        <header className="grid-sheet__head">
          <div className="grid-sheet__title">
            <span className="eyebrow">
              Weighing <bdi>{ownerLabel || 'this decision'}</bdi>
            </span>
            <input
              className="grid-sheet__title-input"
              dir="auto"
              value={grid.title}
              aria-label="What this comparison is about"
              onChange={(event) => setGridTitle(grid.id, event.target.value)}
            />
          </div>

          <div className="grid-sheet__controls">
            <div className="segmented" role="group" aria-label="Scoring mode">
              {MODES.map((mode) => (
                <button
                  key={mode.value}
                  className={grid.mode === mode.value ? 'segmented__item is-on' : 'segmented__item'}
                  aria-pressed={grid.mode === mode.value}
                  title={mode.hint}
                  onClick={() => setGridMode(grid.id, mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <button className="btn" onClick={closeGrid}>
              Done
            </button>
          </div>
        </header>

        <div className="grid-scroll">
          <div className="grid" style={{ gridTemplateColumns: columns }}>
            <div className="grid__corner">
              <span className="eyebrow">{weighted ? 'What matters · weight' : 'What matters'}</span>
            </div>

            {grid.options.map((option) => {
              const optionResult = result.results.find((r) => r.optionId === option.id);
              const isWinner = result.winner?.optionId === option.id && !result.tied;
              return (
                <div key={option.id} className={isWinner ? 'option-head is-winner' : 'option-head'}>
                  <input
                    className="option-head__label"
                    dir="auto"
                    value={option.label}
                    placeholder="Name an option"
                    aria-label="Option"
                    onChange={(event) => updateOption(grid.id, option.id, { label: event.target.value })}
                  />
                  <div className="option-head__meta data">
                    <span className="option-head__total">
                      {(optionResult?.total ?? 0) > 0 ? '+' : ''}
                      {optionResult?.total ?? 0}
                    </span>
                    <button
                      className="option-head__remove"
                      aria-label={`Remove ${option.label || 'option'}`}
                      onClick={() => removeOption(grid.id, option.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}

            {grid.criteria.map((criterion) => (
              <div className="grid__row" key={criterion.id} style={{ display: 'contents' }}>
                <WeightRow
                  criterion={criterion}
                  weighted={weighted}
                  deciding={result.decidingCriterionId === criterion.id}
                  onChange={(patch) => updateCriterion(grid.id, criterion.id, patch)}
                  onRemove={() => removeCriterion(grid.id, criterion.id)}
                />
                {grid.options.map((option) => (
                  <ScoreCell
                    key={option.id}
                    cell={grid.cells[cellKey(option.id, criterion.id)] ?? EMPTY_CELL}
                    optionLabel={option.label || 'this option'}
                    criterionLabel={criterion.label}
                    onChange={(patch) => setCell(grid.id, option.id, criterion.id, patch)}
                  />
                ))}
              </div>
            ))}

            <div className="grid__totals-label">
              <span className="eyebrow">Where it lands</span>
            </div>
            {grid.options.map((option) => {
              const optionResult = result.results.find((r) => r.optionId === option.id);
              if (!optionResult) return <div key={option.id} />;
              return (
                <ResultBar
                  key={option.id}
                  result={optionResult}
                  max={maxAbs}
                  isWinner={result.winner?.optionId === option.id && !result.tied}
                />
              );
            })}
          </div>
        </div>

        <footer className="grid-sheet__foot" data-guide="verdict">
          <div className="grid-sheet__actions">
            <button className="btn" onClick={() => addCriterion(grid.id)}>
              + What matters
            </button>
            <button className="btn" onClick={() => addOption(grid.id)}>
              + Option
            </button>
            <button
              className="btn btn--quiet"
              onClick={() => setPromoted(promoteOptions(grid.id))}
              title="Give every option its own branch on the canvas"
            >
              Send options to the canvas
            </button>
            {promoted !== null && (
              <span className="grid-sheet__flash data" role="status">
                {promoted === 0 ? 'Every option already has a branch' : `${promoted} branch${promoted === 1 ? '' : 'es'} added`}
              </span>
            )}
          </div>

          <Readout />
        </footer>
      </section>
    </div>
  );

  function Readout() {
    if (!grid || !result) return null;
    if (result.completeness === 0) {
      return (
        <p className="readout readout--empty">
          Nothing scored yet. Rate each option against what matters, and the standing appears here.
        </p>
      );
    }
    if (!result.winner) return null;
    if (result.tied) {
      return (
        <p className="readout">
          Dead level. Either something that matters is missing from the list, or the choice is closer than
          it feels.
        </p>
      );
    }

    const deciding = grid.criteria.find((c) => c.id === result.decidingCriterionId);
    return (
      <p className="readout">
        <strong>
          <bdi>{result.winner.label || 'The first option'}</bdi>
        </strong>{' '}
        leads by {result.margin}
        {deciding?.label ? (
          <>
            {' '}
            — mostly on{' '}
            <em>
              <bdi>{deciding.label}</bdi>
            </em>
          </>
        ) : null}
        .
        {result.swing && (
          <>
            {' '}
            Move{' '}
            <em>
              <bdi>{result.swing.criterionLabel || 'one criterion'}</bdi>
            </em>{' '}
            from ×{result.swing.from} to ×{result.swing.to} and it flips.
          </>
        )}
        {result.completeness < 1 && (
          <span className="readout__caveat"> {Math.round(result.completeness * 100)}% of the cells are filled.</span>
        )}
      </p>
    );
  }
}
