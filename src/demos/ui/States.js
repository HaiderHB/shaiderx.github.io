import { classes } from 'utils/style';
import styles from './States.module.css';

/**
 * Small inline spinner. Inside a primary Button it takes the button's text colour
 * (--uiSpinnerColor and --uiSpinnerTrackColor recolour it anywhere).
 */
export function Spinner({ className }) {
  return <span className={classes(styles.spinner, className)} aria-hidden />;
}

/**
 * Blinking caret after text that is still streaming.
 * variant: 'bar' (default, 7px) | 'soft' (fades, sits on the text bottom) | 'block' (8px, no gap)
 */
export function Caret({ variant = 'bar', className }) {
  return (
    <span
      className={classes(styles.caret, className)}
      data-variant={variant}
      aria-hidden
    />
  );
}

/** Three bouncing dots: someone is typing, transcribing or thinking. */
export function TypingDots({ label, className }) {
  return (
    <span className={classes(styles.typing, className)} aria-label={label}>
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * Dashed placeholder for output that has not arrived yet.
 * size: 's' (row with an optional spinner) | 'm' (centred block, more padding)
 * loading: shows a spinner before the text (size 's').
 */
export function EmptyState({ size = 'm', loading = false, className, children }) {
  return (
    <div className={classes(styles.empty, className)} data-size={size}>
      {loading && <Spinner />}
      {size === 's' ? <span>{children}</span> : children}
    </div>
  );
}

/** Shimmering placeholder cards while a slow result (findings, a report) loads. */
export function SkeletonGrid({ count = 2, label = 'Loading', className }) {
  return (
    <div className={classes(styles.skeletons, className)} aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

/**
 * Status message: preview mode (no demo key), info or error.
 * kind: 'info' | 'error'; size: 's' | 'm'; flat: no border.
 * Set --uiNoticeRgb on a wrapper to recolour info notices.
 */
export function Notice({
  kind = 'info',
  size = 'm',
  flat = false,
  as: Component = 'p',
  className,
  children,
  ...rest
}) {
  return (
    <Component
      className={classes(styles.notice, className)}
      data-kind={kind}
      data-size={size}
      data-flat={flat ? '' : undefined}
      {...rest}
    >
      {children}
    </Component>
  );
}
