import { classes } from 'utils/style';
import styles from './Funnel.module.css';

/**
 * A narrowing funnel: how many items are left after each step (40 creators -> 12 -> 10 -> 8).
 * steps: [{ label, value, note }]; a null value is a step not reached yet (hatched, "–").
 * max: the 100% width (defaults to the first value). The last reached step is filled with the
 * accent and carries the weight; earlier steps are quiet ink. size: 'm' | 's' (inside a card).
 * tone: 'accent' (default) | 'ink' (on an accent card, where an accent bar would vanish).
 * label: read out by screen readers.
 */
export function Funnel({ steps, max, size = 'm', tone = 'accent', label, className }) {
  const top = max ?? steps.find(step => step.value != null)?.value ?? 1;
  const reached = steps.reduce((last, step, index) => (step.value != null ? index : last), -1);
  return (
    <ol
      className={classes(styles.funnel, className)}
      data-size={size}
      data-tone={tone}
      aria-label={label}
    >
      {steps.map((step, index) => {
        const value = step.value;
        const width = value == null ? 0 : Math.max(2, Math.min(100, (value / (top || 1)) * 100));
        return (
          <li
            key={step.label}
            className={styles.step}
            data-state={value == null ? 'pending' : index === reached ? 'current' : 'done'}
          >
            <span className={styles.label}>
              {step.label}
              {step.note && <small>{step.note}</small>}
            </span>
            <span className={styles.track} aria-hidden>
              <span className={styles.fill} style={{ width: `${width}%` }} />
            </span>
            <span className={styles.value}>{value ?? '–'}</span>
          </li>
        );
      })}
    </ol>
  );
}
