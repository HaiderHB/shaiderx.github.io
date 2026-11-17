import { classes } from 'utils/style';
import { Dot } from './Badges';
import { formatMs } from './format';
import { JsonView } from './JsonView';
import { MiniLabel } from './Panel';
import styles from './ToolCall.module.css';

/**
 * One tool call an agent made: a row with a status dot, the tool name, its arguments inline and
 * a one-line summary of the result; opens to the arguments and the full JSON result.
 * tone: 'ok' | 'warn' | 'bad' (dot colour); ms: tool time; open: start expanded;
 * argsLabel / resultLabel: the two headings. Use inside a list (`as` defaults to 'li').
 */
export function ToolCall({
  name,
  args,
  result,
  summary,
  tone = 'ok',
  ms,
  open = false,
  argsLabel = 'arguments',
  resultLabel = 'result',
  as: Component = 'li',
  className,
}) {
  const inline = args && Object.keys(args).length ? JSON.stringify(args) : '{}';
  return (
    <Component className={classes(styles.call, className)} data-tone={tone}>
      <details open={open}>
        <summary>
          <Dot tone={tone} className={styles.dot} />
          <span className={styles.name}>
            <code>{name}</code>
            <code className={styles.args}>{inline}</code>
          </span>
          {ms != null && <span className={styles.ms}>{formatMs(ms)}</span>}
          {summary && <span className={styles.summary}>{summary}</span>}
        </summary>
        <div className={styles.detail}>
          <div>
            <MiniLabel>{argsLabel}</MiniLabel>
            <JsonView value={args || {}} />
          </div>
          <div>
            <MiniLabel>{resultLabel}</MiniLabel>
            <JsonView value={result ?? null} />
          </div>
        </div>
      </details>
    </Component>
  );
}

/** A list of ToolCalls. */
export function ToolCallList({ className, children, label }) {
  return (
    <ul className={classes(styles.list, className)} aria-label={label}>
      {children}
    </ul>
  );
}
