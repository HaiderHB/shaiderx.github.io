import { classes } from 'utils/style';
import styles from './CheckList.module.css';
import { StatusIcon } from './StatusIcon';

const ICON = { pass: 'pass', fixed: 'warn', fail: 'fail', na: 'na' };
const DEFAULT_LABELS = { pass: 'Pass', fixed: 'Fixed', fail: 'Fail', na: 'n/a' };

/**
 * Rule checks a run went through (guardrails, policy, eligibility): one row per rule with an icon,
 * the rule, a short detail and a status word. items: [{ id, label, status, detail, removed }];
 * status 'pass' | 'fixed' (code repaired it) | 'fail' | 'na' (did not apply); removed: text the
 * check took out, shown struck through. statusLabels overrides the status words.
 */
export function CheckList({ items, statusLabels, label, className }) {
  const words = { ...DEFAULT_LABELS, ...statusLabels };
  return (
    <ul className={classes(styles.list, className)} aria-label={label}>
      {items.map(item => (
        <li key={item.id || item.label} className={styles.item} data-status={item.status}>
          <StatusIcon status={ICON[item.status] || 'na'} />
          <span className={styles.text}>
            <span className={styles.label}>{item.label}</span>
            {item.detail && <span className={styles.detail}>{item.detail}</span>}
            {item.removed?.map(text => (
              <del key={text} className={styles.removed}>
                {text}
              </del>
            ))}
          </span>
          <span className={styles.status}>{words[item.status] || item.status}</span>
        </li>
      ))}
    </ul>
  );
}
