import { classes } from 'utils/style';
import styles from './Badges.module.css';

/**
 * Rounded label for run kind, model, cost or a hint.
 * tone: 'neutral' | 'live' | 'ok' | 'warn' | 'bad'; caps: uppercase outline style.
 */
export function Pill({ tone = 'neutral', caps = false, className, children, ...rest }) {
  return (
    <span
      className={classes(styles.pill, className)}
      data-tone={tone}
      data-caps={caps ? '' : undefined}
      {...rest}
    >
      {children}
    </span>
  );
}

/**
 * Short uppercase tag next to a value ("vague", "backorder").
 * tone: 'ok' | 'warn' | 'bad'; soft: neutral, not uppercase (ids such as "G1").
 */
export function Tag({ tone, soft = false, className, children }) {
  return (
    <span
      className={classes(styles.tag, className)}
      data-tone={tone}
      data-soft={soft ? '' : undefined}
    >
      {children}
    </span>
  );
}

/** The decision a run ended on (route, verdict). tone: 'ok' | 'warn' | 'bad'; size: 'm' | 'l'. */
export function DecisionBadge({ tone, size = 'm', className, children, ...rest }) {
  if (children == null || children === '') return null;
  return (
    <span
      className={classes(styles.decision, className)}
      data-tone={tone}
      data-size={size}
      {...rest}
    >
      {children}
    </span>
  );
}

/** Row of ScoreBadges. */
export function BadgeRow({ className, children, ...rest }) {
  return (
    <div className={classes(styles.badgeRow, className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * One model score as a badge: `label <strong>value</strong>`.
 * variant: 'score' (dot coloured by tone) | 'neutral' | 'pending' | 'muted'
 * tone (score): 'ok' | 'warn' | 'bad' | 'muted'
 */
export function ScoreBadge({ label, value, tone, variant = 'score', title, children }) {
  return (
    <span className={styles.score} data-variant={variant} data-tone={tone} title={title}>
      {children ?? (
        <>
          {label} <strong>{value}</strong>
        </>
      )}
    </span>
  );
}

/** Small grey text at the end of a BadgeRow ("Jev · 112 ms"). */
export function BadgeMeta({ children }) {
  return <span className={styles.badgeMeta}>{children}</span>;
}

/**
 * 8px status dot. tone: 'ok' | 'warn' | 'bad' | 'idle' (none = muted grey).
 * motion: 'pulse' | 'ring' for waiting and live states.
 */
export function Dot({ tone, motion, className }) {
  return (
    <span
      className={classes(styles.dot, className)}
      data-tone={tone}
      data-motion={motion}
      aria-hidden
    />
  );
}

const RUN_STATES = {
  example: { tone: 'warn' },
  wait: { tone: 'warn', motion: 'pulse' },
  live: { tone: 'bad', motion: 'ring' },
  ended: { tone: 'ok' },
  idle: { tone: 'idle' },
};

/**
 * Status line for a run: example (recorded), wait, live (pulsing ring), ended or idle.
 * Text is the caller's ("Example run · 11 turns · scores recorded live").
 */
export function RunStatus({ state = 'idle', className, children }) {
  const dot = RUN_STATES[state] || RUN_STATES.idle;
  return (
    <span className={classes(styles.status, className)} data-state={state}>
      <Dot tone={dot.tone} motion={dot.motion} />
      {children}
    </span>
  );
}
