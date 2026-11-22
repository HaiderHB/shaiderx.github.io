import { classes } from 'utils/style';
import { Dot } from './Badges';
import { formatMs } from './format';
import styles from './TraceWaterfall.module.css';

/**
 * One trace as a span tree with a latency waterfall: each row is a span (agent run, memory,
 * model step, tool call) indented by depth, with its kind, name, a short meta line (tokens,
 * status) and a bar placed by start and duration on the trace's time axis. A row with `detail`
 * opens (a disclosure) to show it: arguments, a result, the model's text.
 * spans: [{ id, depth, kind, name, start, ms, meta, tone ('ok' | 'warn' | 'bad' | 'idle'), detail }];
 * total: the axis length in ms (defaults to the latest span end); open: ids opened at first;
 * kinds: labels per kind ({ model: 'LLM' }); label: aria label. On phones the bar sits under the name.
 */
export function TraceWaterfall({ spans, total, open = [], kinds, label = 'Trace', className }) {
  const axis = Math.max(1, total || Math.max(...spans.map(span => (span.start || 0) + (span.ms || 0))));
  return (
    <ol className={classes(styles.trace, className)} aria-label={label}>
      {spans.map(span => {
        const left = Math.min(100, ((span.start || 0) / axis) * 100);
        const width = Math.max(0, Math.min(100 - left, ((span.ms || 0) / axis) * 100));
        const row = (
          <>
            <span className={styles.label} style={{ '--depth': span.depth || 0 }}>
              <Dot tone={span.tone || 'idle'} className={styles.dot} />
              <span className={styles.kind}>{kinds?.[span.kind] || span.kind}</span>
              <code className={styles.name}>{span.name}</code>
              {span.meta && <span className={styles.meta}>{span.meta}</span>}
            </span>
            <span className={styles.track} aria-hidden>
              <span className={styles.bar} data-tone={span.tone} style={{ left: `${left}%`, width: `${width}%` }} />
            </span>
            <span className={styles.ms}>{span.ms != null ? formatMs(span.ms) : ''}</span>
          </>
        );
        return (
          <li key={span.id} className={styles.span} data-kind={span.kind}>
            {span.detail ? (
              <details open={open.includes(span.id)}>
                <summary className={styles.row}>{row}</summary>
                <div className={styles.detail} style={{ '--depth': span.depth || 0 }}>
                  {span.detail}
                </div>
              </details>
            ) : (
              <div className={styles.row}>{row}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
