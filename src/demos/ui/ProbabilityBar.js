import { classes } from 'utils/style';
import { pct } from './format';
import styles from './ProbabilityBar.module.css';

/**
 * One horizontal probability bar: label, filled track, percent.
 * tone: 'ok' | 'warn' | 'bad' (none = grey); strong: the chosen option (full opacity, bold);
 * marks: thresholds drawn on the track, as probabilities (e.g. [0.5, 0.8]).
 */
export function ProbabilityBar({ label, value, tone, strong = false, marks = [] }) {
  return (
    <div className={styles.row} data-strong={strong || undefined}>
      <span className={styles.label}>{label}</span>
      <span className={styles.track}>
        <span
          className={styles.fill}
          data-tone={tone}
          style={{ width: `${Math.max(1.5, (value || 0) * 100)}%` }}
        />
        {marks.map(mark => (
          <span key={mark} className={styles.mark} style={{ left: `${mark * 100}%` }} />
        ))}
      </span>
      <span className={styles.value}>{pct(value)}</span>
    </div>
  );
}

/**
 * A model's probabilities over a set of options, one bar each.
 * options: [{ value, label, tone }]; probabilities: { [value]: p }; choice: the picked value.
 */
export function ProbabilityBars({ options, probabilities = {}, choice, className }) {
  return (
    <div className={classes(styles.bars, className)}>
      {options.map(option => (
        <ProbabilityBar
          key={option.value}
          label={option.label}
          value={probabilities[option.value] || 0}
          tone={option.tone}
          strong={choice === option.value}
        />
      ))}
    </div>
  );
}
