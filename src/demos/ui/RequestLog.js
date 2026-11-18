import { classes } from 'utils/style';
import { Spinner } from './States';
import styles from './RequestLog.module.css';

// 24-hour time with milliseconds: request logs are read to the millisecond
const time = at =>
  typeof at === 'number'
    ? `${new Date(at).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })}.${String(at % 1000).padStart(3, '0')}`
    : at;

const statusTone = status => {
  if (status === 'pending') return 'pending';
  if (status === 'timeout') return 'bad';
  if (typeof status !== 'number') return 'muted';
  if (status < 300) return 'ok';
  if (status < 500) return 'warn';
  return 'bad';
};

/**
 * HTTP requests an API received, newest last: time, method and path, a status pill, the outcome
 * and small meta (an idempotency key, the attempt, the time it took). For demos about retries,
 * idempotency and webhooks.
 * items: [{ id, at (ms or text), method, path, status (number | 'timeout' | 'pending'),
 *   outcome (a word: "charged", "replayed"), note, meta: [text], tone (overrides the status tone),
 *   highlight (bool: the row the story is about) }]; empty: text with no items.
 */
export function RequestLog({ items, empty, label = 'Requests', className }) {
  if (!items.length) {
    return empty ? <p className={classes(styles.empty, className)}>{empty}</p> : null;
  }
  return (
    <ol className={classes(styles.log, className)} aria-label={label}>
      {items.map((item, index) => {
        const tone = item.tone || statusTone(item.status);
        return (
          <li
            key={item.id ?? index}
            className={styles.row}
            data-tone={tone}
            data-highlight={item.highlight || undefined}
          >
            <span className={styles.time}>{time(item.at)}</span>
            <span className={styles.call}>
              <span className={styles.method}>{item.method || 'POST'}</span>
              <span className={styles.path}>{item.path}</span>
            </span>
            <span className={styles.status}>
              {item.status === 'pending' ? <Spinner /> : null}
              {item.status === 'pending' ? 'sent' : item.status}
            </span>
            <span className={styles.body}>
              {item.outcome && <strong className={styles.outcome}>{item.outcome}</strong>}
              {item.note && <span className={styles.note}>{item.note}</span>}
            </span>
            {item.meta?.length ? (
              <span className={styles.meta}>
                {item.meta.map(text => (
                  <span key={text}>{text}</span>
                ))}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
