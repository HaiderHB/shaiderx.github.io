import { classes } from 'utils/style';
import { formatMs } from './format';
import { Spinner } from './States';
import { StatusIcon } from './StatusIcon';
import styles from './Timeline.module.css';

/** Ordered list of TimelineSteps (an agent run, a pipeline). */
export function Timeline({ className, children }) {
  return <ol className={classes(styles.timeline, className)}>{children}</ol>;
}

/**
 * One stage of a run. status: 'pending' | 'running' | 'done' | 'error'.
 * The marker shows the step number, a spinner while running and a tick when done;
 * `ms` (a number) is formatted on the right. Children render under the heading.
 */
export function TimelineStep({ index, status = 'pending', title, detail, ms, children }) {
  return (
    <li className={styles.step} data-status={status}>
      <span className={styles.marker}>
        {status === 'running' ? (
          <Spinner />
        ) : status === 'done' ? (
          <StatusIcon variant="solid" status="pass" />
        ) : (
          index + 1
        )}
      </span>
      <div className={styles.body}>
        <div className={styles.head}>
          <strong>{title}</strong>
          {detail && <span className={styles.detail}>{detail}</span>}
          {ms != null && <span className={styles.ms}>{formatMs(ms)}</span>}
        </div>
        {children}
      </div>
    </li>
  );
}

/** How a run works, as numbered cards: steps [{ label, what, cost }]. */
export function PipelineStrip({ steps, label = 'How a run works', className }) {
  return (
    <ol
      className={classes(styles.flow, className)}
      aria-label={label}
      style={{ '--uiFlowColumns': steps.length }}
    >
      {steps.map((step, index) => (
        <li key={step.label} className={styles.flowStep}>
          <span className={styles.flowIndex}>{index + 1}</span>
          <span className={styles.flowText}>
            <strong>{step.label}</strong>
            <span>{step.what}</span>
          </span>
          {step.cost && <span className={styles.flowCost}>{step.cost}</span>}
        </li>
      ))}
    </ol>
  );
}
