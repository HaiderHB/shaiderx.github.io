import { forwardRef } from 'react';
import { classes } from 'utils/style';
import styles from './Panel.module.css';

/** Bordered panel. Padding follows --uiCardPad (default --spaceL). */
export const Card = forwardRef(function Card(
  { as: Component = 'div', className, children, ...rest },
  ref
) {
  return (
    <Component ref={ref} className={classes(styles.card, className)} {...rest}>
      {children}
    </Component>
  );
});

/** Card header row: title and pills on the left, `aside` pushed to the right. */
export function CardHead({ aside, nowrap = false, className, children }) {
  return (
    <div
      className={classes(styles.cardHead, className)}
      data-nowrap={nowrap ? '' : undefined}
    >
      {children}
      {aside != null && aside !== false && (
        <span className={styles.headAside}>{aside}</span>
      )}
    </div>
  );
}

/** Card title. size 's' for small cards in a grid. */
export function CardTitle({ as: Component = 'h3', size, className, children, ...rest }) {
  return (
    <Component
      className={classes(styles.cardTitle, className)}
      data-size={size}
      {...rest}
    >
      {children}
    </Component>
  );
}

/** Tiny uppercase label above a value or code block ("arguments", "Final route"). */
export function MiniLabel({ as: Component = 'span', className, children, ...rest }) {
  return (
    <Component className={classes(styles.miniLabel, className)} {...rest}>
      {children}
    </Component>
  );
}

/** Uppercase kicker above a title ("The task", "Live, free"). */
export function Kicker({ className, children }) {
  return <p className={classes(styles.kicker, className)}>{children}</p>;
}

/** Uppercase eyebrow with an optional step number: (2) INTERVIEW. */
export function Eyebrow({ step, className, children }) {
  return (
    <span className={classes(styles.eyebrow, className)}>
      {step != null && <span className={styles.step}>{step}</span>}
      {step != null && typeof children === 'string' ? ` ${children}` : children}
    </span>
  );
}

/**
 * Section heading.
 * variant 'plain': title + lede. flush drops the bottom margin.
 * variant 'eyebrow': Eyebrow (step + kicker) above the title, lede, `action` on the right.
 *   compact: header inside a card (top-aligned, small bottom margin).
 * variant 'numbered': `index` ("01") in the margin, kicker, large title, lede.
 */
export function SectionHead({
  variant = 'plain',
  index,
  step,
  kicker,
  title,
  titleId,
  titleAs: Title = 'h2',
  lede,
  action,
  flush = false,
  compact = false,
  className,
}) {
  const heading = (
    <Title id={titleId} className={styles.title}>
      {title}
    </Title>
  );
  const ledeNode = lede ? <p className={styles.lede}>{lede}</p> : null;

  if (variant === 'numbered') {
    return (
      <header className={classes(styles.head, className)} data-variant="numbered">
        <span className={styles.number}>{index}</span>
        <div>
          {kicker && <p className={styles.kicker}>{kicker}</p>}
          {heading}
          {ledeNode}
        </div>
      </header>
    );
  }

  if (variant === 'eyebrow') {
    return (
      <div
        className={classes(styles.head, className)}
        data-variant="eyebrow"
        data-compact={compact ? '' : undefined}
      >
        <div>
          {kicker && <Eyebrow step={step}>{kicker}</Eyebrow>}
          {title != null && heading}
          {ledeNode}
        </div>
        {action}
      </div>
    );
  }

  return (
    <div
      className={classes(styles.head, className)}
      data-variant="plain"
      data-flush={flush ? '' : undefined}
    >
      {heading}
      {ledeNode}
    </div>
  );
}

/**
 * Definition grid of label/value pairs. items: [[label, value], ...].
 * --uiKvColumns (default 2) and --uiKvGap (default 8px 16px) adjust the grid.
 */
export function KeyValues({ items, className }) {
  return (
    <dl className={classes(styles.keyValues, className)}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Short notes in a grid ("Design choices", "How it is wired"). items: [{ title, text }].
 * variant 'accent': up to four columns with an accent top rule. 'boxed': two bordered columns.
 */
export function NoteGrid({ items, variant = 'accent', className }) {
  if (variant === 'boxed') {
    return (
      <div className={classes(styles.notes, className)} data-variant="boxed">
        {items.map(item => (
          <div key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    );
  }
  return (
    <ul
      className={classes(styles.notes, className)}
      data-variant="accent"
      style={{ '--uiNoteColumns': Math.min(items.length, 4) }}
    >
      {items.map(item => (
        <li key={item.title}>
          <strong>{item.title}</strong>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
