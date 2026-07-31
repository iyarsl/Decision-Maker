import type { OptionResult } from '../store/scoring';

interface Props {
  result: OptionResult;
  max: number;
  isWinner: boolean;
}

export function ResultBar({ result, max, isWinner }: Props) {
  const width = max === 0 ? 0 : Math.min(100, (Math.abs(result.total) / max) * 100);
  const negative = result.total < 0;

  return (
    <div className={isWinner ? 'result is-winner' : 'result'}>
      <div className="result__track" aria-hidden="true">
        <span
          className={negative ? 'result__fill result__fill--negative' : 'result__fill'}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="result__value data">
        {result.total > 0 ? '+' : ''}
        {result.total}
      </p>
    </div>
  );
}
