import { classes } from 'utils/style';
import styles from './StatusIcon.module.css';

const SOFT_PATHS = {
  fail: <path d="M5 5l6 6M11 5l-6 6" />,
  warn: <path d="M8 4.5v4.5M8 11.2v.3" />,
  pass: <path d="M4.5 8.3l2.3 2.3 4.7-5" />,
  na: <path d="M5 8h6" />,
};

const SOLID_PATHS = {
  pass: <path d="M3 8.5l3.2 3L13 4.5" />,
  fail: <path d="M4 4l8 8M12 4l-8 8" />,
  warn: <path d="M8 3.5v5.5M8 12v.5" />,
};

const SOLID_LABELS = { pass: 'Pass', fail: 'Fail', warn: 'Warning' };

/**
 * Check result icon. status: 'pass' | 'fail' | 'warn' | 'na'.
 * variant 'soft' (20px, tinted pass): rule lists. 'solid' (18px): eval grids and timelines;
 * 'na' renders a dash.
 */
export function StatusIcon({ status = 'na', variant = 'soft', className }) {
  if (variant === 'solid') {
    if (!SOLID_PATHS[status]) return <span className={styles.idle}>–</span>;
    return (
      <span
        className={classes(styles.solid, className)}
        data-status={status}
        aria-label={SOLID_LABELS[status]}
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
          {SOLID_PATHS[status]}
        </svg>
      </span>
    );
  }
  return (
    <span
      className={classes(styles.icon, className)}
      data-status={status}
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16" width="16" height="16">
        {SOFT_PATHS[status] || SOFT_PATHS.na}
      </svg>
    </span>
  );
}
