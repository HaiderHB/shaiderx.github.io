import { classes } from 'utils/style';
import styles from './Approval.module.css';
import { Dot } from './Badges';
import { Button } from './Button';

const STATE = {
  pending: { tone: 'warn', motion: 'pulse' },
  approved: { tone: 'ok' },
  rejected: { tone: 'idle' },
};

/**
 * An action an agent wants to take that waits for a person (a send, a payment, a delete):
 * a status line, what it is, who it goes to, the content, optional evidence (judge scores) and
 * Approve / Reject. Once decided, the buttons give way to the outcome line.
 * status: 'pending' | 'approved' | 'rejected'; statusText: { pending, approved, rejected };
 * meta: [[label, value]] (To, Subject); body: the text that would go out; children render
 * under the body; onApprove / onReject; approveLabel / rejectLabel; busy disables both.
 */
export function ApprovalCard({
  title,
  status = 'pending',
  statusText = {
    pending: 'Waiting for your approval',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  meta = [],
  body,
  onApprove,
  onReject,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  busy = false,
  className,
  children,
  ...rest
}) {
  const state = STATE[status] || STATE.pending;
  return (
    <article className={classes(styles.card, className)} data-status={status} {...rest}>
      <div className={styles.head}>
        <span className={styles.status}>
          <Dot tone={state.tone} motion={state.motion} />
          {statusText[status]}
        </span>
        {title && <h4 className={styles.title}>{title}</h4>}
      </div>
      {meta.length > 0 && (
        <dl className={styles.meta}>
          {meta.map(([label, value]) => (
            <div key={label} className={styles.metaRow}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {body && <p className={styles.body}>{body}</p>}
      {children}
      {status === 'pending' && (onApprove || onReject) && (
        <div className={styles.actions}>
          {onApprove && (
            <Button size="s" onClick={onApprove} disabled={busy}>
              {approveLabel}
            </Button>
          )}
          {onReject && (
            <Button size="s" variant="secondary" onClick={onReject} disabled={busy}>
              {rejectLabel}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
