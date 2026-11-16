import { classes } from 'utils/style';
import styles from './TrackedText.module.css';

const KEYS = ['Enter', ' '];

/**
 * Prose with tracked changes, drawn as a redline: deletions struck through, insertions
 * underlined, like a word processor's "All markup" view.
 *
 * text: the original text. changes: [{ id, start, end, insert, state, title }], ranges into
 * `text`, non-overlapping. state: 'pending' (redline) | 'accepted' (the insertion as plain
 * text) | 'rejected' (the original as plain text); accepting or rejecting flashes the spot.
 * activeId: the change to highlight. onSelect(id): makes changes clickable and focusable.
 * animate: a newly mounted pending change draws its strike, then fades its words in.
 * Colours: --uiRedlineDel and --uiRedlineIns (rgb channels; default bad and accent), so a
 * white "paper" surface can use darker inks.
 */
export function TrackedText({
  text,
  changes = [],
  activeId,
  onSelect,
  animate = true,
  as: Component = 'span',
  className,
}) {
  const sorted = [...changes]
    .filter(change => change.end > change.start || change.insert)
    .sort((a, b) => a.start - b.start);
  const parts = [];
  let cursor = 0;

  for (const change of sorted) {
    if (change.start < cursor) continue; // overlapping ranges are the caller's bug; skip, don't garble
    if (change.start > cursor) {
      parts.push(<span key={`t${cursor}`}>{text.slice(cursor, change.start)}</span>);
    }
    parts.push(
      <Change
        key={change.id}
        change={change}
        original={text.slice(change.start, change.end)}
        active={activeId === change.id}
        onSelect={onSelect}
      />
    );
    cursor = change.end;
  }
  if (cursor < text.length) parts.push(<span key={`t${cursor}`}>{text.slice(cursor)}</span>);

  return (
    <Component
      className={classes(styles.tracked, className)}
      data-animate={animate ? '' : undefined}
    >
      {parts}
    </Component>
  );
}

function Change({ change, original, active, onSelect }) {
  const state = change.state || 'pending';
  const clickable = Boolean(onSelect);
  const select = () => onSelect?.(change.id);
  const describe =
    state === 'pending'
      ? `Suggested change: delete “${original}”${change.insert ? `, insert “${change.insert}”` : ''}`
      : state === 'accepted'
      ? `Accepted change: “${change.insert}”`
      : `Rejected change, original kept: “${original}”`;

  return (
    <span
      className={styles.change}
      data-state={state}
      data-active={active ? '' : undefined}
      data-change-id={change.id}
      title={change.title}
      {...(clickable && {
        role: 'button',
        tabIndex: 0,
        'aria-label': describe,
        'aria-pressed': active,
        onClick: select,
        onKeyDown: event => {
          if (KEYS.includes(event.key)) {
            event.preventDefault();
            select();
          }
        },
      })}
    >
      {state === 'pending' && (
        <>
          {original && <del className={styles.del}>{original}</del>}
          {change.insert && (
            <ins className={styles.ins}>
              {/* Spaces fade with their word, or their underline would show first */}
              {change.insert.split(/(\s+)/).map((token, index) =>
                token ? (
                  <span
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className={styles.word}
                    style={{ '--uiWordIndex': Math.floor(index / 2) }}
                  >
                    {token}
                  </span>
                ) : null
              )}
            </ins>
          )}
        </>
      )}
      {state === 'accepted' && change.insert}
      {state === 'rejected' && original}
    </span>
  );
}
