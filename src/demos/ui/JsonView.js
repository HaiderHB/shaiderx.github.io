import { Fragment } from 'react';
import { classes } from 'utils/style';
import styles from './JsonView.module.css';

const TOKEN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

// Shortens long strings for display only.
function clipStrings(value, limit, clipped) {
  if (typeof value === 'string' && value.length > limit + 20) {
    clipped.count += 1;
    return `${value.slice(0, limit)}… (+${value.length - limit} chars)`;
  }
  if (Array.isArray(value)) return value.map(item => clipStrings(item, limit, clipped));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clipStrings(item, limit, clipped)])
    );
  }
  return value;
}

/**
 * Splits JSON text into [text, kind] pieces; kind is '' for punctuation and spaces.
 * colon 'key' keeps a key's colon in the key piece; 'plain' leaves it uncoloured.
 */
export function tokenizeJson(text, { colon = 'key' } = {}) {
  const pieces = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) pieces.push([text.slice(last, match.index), '']);
    if (match[1] && match[2]) {
      if (colon === 'key') pieces.push([match[0], 'key']);
      else pieces.push([match[1], 'key'], [match[2], '']);
    } else if (match[1]) pieces.push([match[1], 'string']);
    else if (match[3]) pieces.push([match[3], 'bool']);
    else if (match[4]) pieces.push([match[4], 'null']);
    else pieces.push([match[0], 'number']);
    last = match.index + match[0].length;
  }
  if (last < text.length) pieces.push([text.slice(last), '']);
  return pieces;
}

/**
 * Pretty-printed, coloured JSON (no innerHTML). `value` may be a string to show as is.
 * variant 'well' | 'boxed'; tall raises the max height; clip shortens strings longer
 * than that many characters and shows `clipNote` under the block when it did.
 * colon: 'key' colours a key's colon like the key, 'plain' leaves it in the text colour.
 */
export function JsonView({
  value,
  variant = 'well',
  tall = false,
  clip,
  clipNote,
  colon = 'key',
  className,
}) {
  const clipped = { count: 0 };
  const shown = clip ? clipStrings(value, clip, clipped) : value;
  const text = typeof shown === 'string' ? shown : JSON.stringify(shown, null, 2);
  return (
    <>
      <pre
        className={classes(styles.json, className)}
        data-variant={variant}
        data-tall={tall ? '' : undefined}
      >
        <code>
          {tokenizeJson(text, { colon }).map(([part, kind], index) =>
            kind ? (
              <span key={index} className={styles[kind]}>
                {part}
              </span>
            ) : (
              <Fragment key={index}>{part}</Fragment>
            )
          )}
        </code>
      </pre>
      {clipped.count > 0 && clipNote}
    </>
  );
}

/** Raw JSON behind a disclosure ("Structured output (JSON)"). */
export function JsonDetails({ summary, value, open, tall, variant, className }) {
  return (
    <details className={classes(styles.details, className)} open={open}>
      <summary>{summary}</summary>
      <JsonView value={value} tall={tall} variant={variant} />
    </details>
  );
}
