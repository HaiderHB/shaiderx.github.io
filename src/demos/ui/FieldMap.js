import { classes } from 'utils/style';
import styles from './FieldMap.module.css';
import { StatusIcon } from './StatusIcon';

const ICON = { pass: 'pass', warn: 'warn', fail: 'fail', na: 'na' };

/**
 * A field mapping between two systems as a diff (CRM -> ERP, source -> warehouse): one row per
 * field with the source path and value, an arrow, the target path and value (plus a short note
 * under it), and a status icon. On phones each row stacks: source over target.
 * rows: [{ id, from: { path, value }, to: { path, value, note }, status ('pass' | 'warn' | 'fail' |
 * 'na') }]; fromLabel / toLabel name the two sides in the header; label: the list's aria-label.
 */
export function FieldMap({ rows, fromLabel = 'Source', toLabel = 'Target', label = 'Field mapping', className }) {
  return (
    <div className={classes(styles.map, className)}>
      <div className={styles.head} aria-hidden>
        <span>{fromLabel}</span>
        <span />
        <span>{toLabel}</span>
        <span />
      </div>
      <ol className={styles.rows} aria-label={label}>
        {rows.map(row => (
          <li key={row.id} className={styles.row} data-status={row.status}>
            <span className={styles.side}>
              <span className={styles.path}>{row.from.path}</span>
              <span className={styles.value}>{row.from.value}</span>
            </span>
            <span className={styles.arrow} aria-label="maps to">
              →
            </span>
            <span className={styles.side} data-target>
              <span className={styles.path}>{row.to.path}</span>
              <span className={styles.value}>{row.to.value}</span>
              {row.to.note && <span className={styles.note}>{row.to.note}</span>}
            </span>
            <StatusIcon status={ICON[row.status] || 'na'} className={styles.icon} />
          </li>
        ))}
      </ol>
    </div>
  );
}
