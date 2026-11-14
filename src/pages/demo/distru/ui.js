// Small presentational pieces for the Distru demo page.
import { ROUTE_LABELS } from './agent';
import styles from './Distru.module.css';

const JSON_TOKEN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/** Pretty JSON with light syntax colouring (no innerHTML). */
export function JsonView({ value, className = '' }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const parts = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(JSON_TOKEN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    let kind = styles.jNumber;
    if (token.startsWith('"')) kind = match[2] ? styles.jKey : styles.jString;
    else if (token === 'true' || token === 'false') kind = styles.jBool;
    else if (token === 'null') kind = styles.jNull;
    parts.push(
      <span key={index++} className={kind}>
        {token}
      </span>
    );
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <pre className={`${styles.json} ${className}`}>{parts}</pre>;
}

export function RouteBadge({ route, size = 'm' }) {
  if (!route) return null;
  return (
    <span className={styles.routeBadge} data-route={route} data-size={size}>
      {ROUTE_LABELS[route] || route}
    </span>
  );
}

export function Dot({ level }) {
  return <span className={styles.dot} data-level={level} aria-hidden />;
}

export function Check({ pass }) {
  if (pass == null) return <span className={styles.checkIdle}>–</span>;
  return (
    <span className={styles.check} data-pass={pass} aria-label={pass ? 'Pass' : 'Fail'}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
        {pass ? (
          <path
            d="M3 8.5l3.2 3L13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M4 4l8 8M12 4l-8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </svg>
    </span>
  );
}

export function Spinner() {
  return <span className={styles.spinner} aria-hidden />;
}

export function formatMs(ms) {
  if (ms == null) return '';
  if (ms < 0.01) return '<0.01 ms';
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export const pct = value => `${Math.round((Number(value) || 0) * 100)}%`;

/** One horizontal probability bar. */
export function Bar({ label, value, tone, strong, marks = [] }) {
  return (
    <div className={styles.barRow} data-strong={strong || undefined}>
      <span className={styles.barLabel}>{label}</span>
      <span className={styles.barTrack}>
        <span
          className={styles.barFill}
          data-tone={tone}
          style={{ width: `${Math.max(1.5, (value || 0) * 100)}%` }}
        />
        {marks.map(mark => (
          <span
            key={mark}
            className={styles.barMark}
            style={{ left: `${mark * 100}%` }}
          />
        ))}
      </span>
      <span className={styles.barValue}>{pct(value)}</span>
    </div>
  );
}
