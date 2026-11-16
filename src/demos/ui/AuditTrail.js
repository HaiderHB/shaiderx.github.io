import { classes } from 'utils/style';
import styles from './AuditTrail.module.css';

const time = at =>
  typeof at === 'number'
    ? new Date(at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })
    : at;

/**
 * Chronological record of what an agent and the people around it did, newest last.
 * items: [{ id, at (ms or text), actor, tone ('accent' | 'ok' | 'warn' | 'bad' | 'muted'), text,
 *   action (a node on the right: an Undo button) }]; empty: shown with no items.
 */
export function AuditTrail({ items, empty, label = 'Audit trail', className }) {
  if (!items.length) {
    return empty ? <p className={classes(styles.empty, className)}>{empty}</p> : null;
  }
  return (
    <ol className={classes(styles.trail, className)} aria-label={label}>
      {items.map((item, index) => (
        <li
          key={item.id ?? index}
          className={styles.item}
          data-tone={item.tone || 'muted'}
        >
          <span className={styles.time}>{time(item.at)}</span>
          <span className={styles.actor}>{item.actor}</span>
          <span className={styles.text}>{item.text}</span>
          {item.action && <span className={styles.action}>{item.action}</span>}
        </li>
      ))}
    </ol>
  );
}
