import { classes } from 'utils/style';
import styles from './Stat.module.css';

/**
 * One headline number: icon chip, label, value with a small unit, optional note.
 * tone: none (surface) | 'tint' (soft accent wash) | 'accent' (saturated, light text).
 * value and unit are shown as given; `children` renders under the value (a Meter, a note).
 * `as` and any other props pass through, so a tile can be a link (`as="a" href="#evals"`).
 */
export function StatTile({
  label,
  value,
  unit,
  icon,
  tone,
  note,
  as: Component = 'div',
  className,
  children,
  ...rest
}) {
  return (
    <Component className={classes(styles.tile, className)} data-tone={tone} {...rest}>
      <div className={styles.body}>
        {icon && (
          <span className={styles.icon} aria-hidden>
            {icon}
          </span>
        )}
        <span className={styles.text}>
          <span className={styles.label}>{label}</span>
          <span className={styles.value}>
            {value}
            {unit != null && <span className={styles.unit}>{unit}</span>}
          </span>
          {note != null && <span className={styles.note}>{note}</span>}
        </span>
        {children && <div className={styles.extra}>{children}</div>}
      </div>
    </Component>
  );
}

/** Row of StatTiles. columns: how many per row on wide screens (default: one row). */
export function StatGrid({ columns, className, children }) {
  return (
    <div
      className={classes(styles.grid, className)}
      data-columns={columns || undefined}
      style={columns ? { '--uiStatColumns': columns } : undefined}
    >
      {children}
    </div>
  );
}
