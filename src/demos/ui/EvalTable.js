import { Fragment } from 'react';
import { classes } from 'utils/style';
import styles from './EvalTable.module.css';
import { StatusIcon } from './StatusIcon';

/**
 * Expected vs actual for one eval case.
 * rows: [{ id, label, expected, actual, pass }]; pass true / false / null (not run).
 * The actual cell leads with a pass/fail icon. Values are shown as given.
 */
export function EvalTable({
  rows,
  columns = ['Check', 'Expected', 'Actual'],
  className,
}) {
  return (
    <div className={classes(styles.table, className)}>
      {columns.map(column => (
        <span key={column} className={styles.head}>
          {column}
        </span>
      ))}
      {rows.map(row => (
        <Fragment key={row.id}>
          <span className={styles.label}>{row.label}</span>
          <span className={styles.value}>{row.expected}</span>
          <span className={styles.value} data-pass={row.pass ?? undefined}>
            <StatusIcon
              variant="solid"
              status={row.pass == null ? 'na' : row.pass ? 'pass' : 'fail'}
            />
            {row.actual}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
