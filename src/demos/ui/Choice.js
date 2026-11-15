import { classes } from 'utils/style';
import styles from './Choice.module.css';

/**
 * One-of-n toggle. options: [{ value, label, disabled }]; label may be a node.
 * variant 'pill': rounded track (modes, tool pickers). 'box': small square toggle.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  variant = 'pill',
  disabled = false,
  className,
}) {
  return (
    <div
      className={classes(styles.segmented, className)}
      data-variant={variant}
      role="group"
      aria-label={label}
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={disabled || option.disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Small numbered square ("1", "2"), for samples and eval cards. */
export function IndexBadge({ className, children }) {
  return <span className={classes(styles.indexBadge, className)}>{children}</span>;
}

/** Stacked, numbered sample picker: options [{ value, label, hint }]. */
export function OptionList({ options, value, onChange, label, className }) {
  return (
    <div className={classes(styles.options, className)} role="group" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          <IndexBadge>{index + 1}</IndexBadge>
          <span className={styles.optionText}>
            <strong>{option.label}</strong>
            <span>{option.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Row of toggle chips (samples, filters): options [{ value, label }]. */
export function ChoiceChips({ options, value, onChange, label, className }) {
  return (
    <div className={classes(styles.chips, className)} role="group" aria-label={label}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={styles.choiceChip}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Small rounded action chip (query presets, suggestions). */
export function Chip({ className, children, ...rest }) {
  return (
    <button type="button" className={classes(styles.chip, className)} {...rest}>
      {children}
    </button>
  );
}

/**
 * Tab list: items [{ id, label, sub }]. The caller renders the panel.
 * variant 'files': horizontal, monospace file names with the folder underneath.
 * variant 'list': vertical list, code name with a description underneath.
 */
export function Tabs({ items, value, onChange, label, variant = 'files', className }) {
  return (
    <div
      className={classes(styles.tabs, className)}
      data-variant={variant}
      role="tablist"
      aria-label={label}
    >
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {variant === 'list' ? <code>{item.label}</code> : item.label}
          {item.sub != null && <span className={styles.tabSub}>{item.sub}</span>}
        </button>
      ))}
    </div>
  );
}
