import { useState } from 'react';
import { MAX_SCORE, MIN_SCORE, SCORE_LABEL } from '../store/scoring';
import type { Cell } from '../types';

const STEPS = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => MIN_SCORE + i);

interface Props {
  cell: Cell;
  optionLabel: string;
  criterionLabel: string;
  onChange: (patch: Partial<Cell>) => void;
}

export function ScoreCell({ cell, optionLabel, criterionLabel, onChange }: Props) {
  const [noteOpen, setNoteOpen] = useState(cell.note.trim().length > 0);

  return (
    <div className="cell" data-guide="cell">
      <div
        className="cell__meter"
        role="radiogroup"
        aria-label={`${optionLabel} on ${criterionLabel || 'this criterion'}`}
      >
        {STEPS.map((step) => {
          // zero is the notch you score away from, never a filled state of its own
          const active = step === 0 ? false : step > 0 ? cell.score >= step : cell.score <= step;
          return (
            <button
              key={step}
              role="radio"
              aria-checked={cell.score === step}
              aria-label={SCORE_LABEL[step]}
              title={SCORE_LABEL[step]}
              className={[
                'cell__step',
                step === 0 ? 'cell__step--zero' : step > 0 ? 'cell__step--pro' : 'cell__step--con',
                active ? 'is-on' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onChange({ score: cell.score === step ? 0 : step })}
            />
          );
        })}
      </div>

      <div className="cell__foot">
        <span className="cell__score data">
          {cell.score > 0 ? '+' : ''}
          {cell.score}
        </span>
        <button
          className={cell.note.trim() ? 'cell__note-toggle data has-note' : 'cell__note-toggle data'}
          aria-expanded={noteOpen}
          aria-label={`Why ${optionLabel} scores this`}
          onClick={() => setNoteOpen((open) => !open)}
        >
          {cell.note.trim() ? 'why ●' : 'why'}
        </button>
      </div>

      {noteOpen && (
        <textarea
          className="field cell__note"
          dir="auto"
          rows={2}
          value={cell.note}
          placeholder="Because…"
          aria-label={`Why ${optionLabel} scores this on ${criterionLabel || 'this criterion'}`}
          onChange={(event) => onChange({ note: event.target.value })}
        />
      )}
    </div>
  );
}
