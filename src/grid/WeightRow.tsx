import { MAX_WEIGHT, MIN_WEIGHT } from '../store/scoring';
import type { Criterion } from '../types';

interface Props {
  criterion: Criterion;
  weighted: boolean;
  deciding: boolean;
  onChange: (patch: Partial<Criterion>) => void;
  onRemove: () => void;
}

export function WeightRow({ criterion, weighted, deciding, onChange, onRemove }: Props) {
  return (
    <div className={deciding ? 'criterion is-deciding' : 'criterion'} data-guide="weight">
      <div className="criterion__top">
        <input
          className="criterion__label"
          dir="auto"
          value={criterion.label}
          placeholder="What matters here"
          aria-label="Criterion"
          onChange={(event) => onChange({ label: event.target.value })}
        />
        <button className="criterion__remove data" onClick={onRemove} aria-label={`Remove ${criterion.label}`}>
          ×
        </button>
      </div>

      {weighted && (
        <label className="criterion__weight">
          <span className="sr-only">How much {criterion.label || 'this'} matters</span>
          <input
            type="range"
            min={MIN_WEIGHT}
            max={MAX_WEIGHT}
            step={1}
            value={criterion.weight}
            onChange={(event) => onChange({ weight: Number(event.target.value) })}
          />
          <span className="criterion__weight-value data">×{criterion.weight}</span>
        </label>
      )}

      {deciding && <p className="criterion__flag data">decides it</p>}
    </div>
  );
}
