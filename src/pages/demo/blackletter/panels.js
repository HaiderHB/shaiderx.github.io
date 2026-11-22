// Presentational pieces of the Blackletter demo page: the document with pinned highlights, the
// flag card with its lawyer decision, the golden set, the playbook and the eval results.
import {
  Button,
  Chip,
  MiniLabel,
  Pill,
  ProbabilityBars,
  StatGrid,
  StatTile,
  StatusIcon,
  Tag,
  TextArea,
  Input,
} from 'demos/ui';
import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiCornerDownRight, FiEdit3, FiMapPin, FiRotateCcw, FiX } from 'react-icons/fi';
import styles from './Blackletter.module.css';
import {
  DOCS,
  GENERIC_REASONS,
  LABELS,
  LABEL_COUNT,
  PLAYBOOK,
  SAMPLE_REASONS,
  SEVERITY,
  docById,
  ruleById,
} from './data';
import { CONFIDENCE_OPTIONS, REASON_MAX, REDLINE_MAX } from './harness';

const percent = value => (value == null ? '–' : `${Math.round(value * 100)}%`);
const docLabel = id => docById(id)?.label || id;

// --- document -----------------------------------------------------------------------------

function ClauseText({ clause, flags, activeId, feedback, onSelect }) {
  const marks = flags
    .filter(flag => flag.clause === clause.n)
    .sort((a, b) => a.start - b.start);
  const parts = [];
  let cursor = 0;
  for (const flag of marks) {
    if (flag.start < cursor) continue;
    if (flag.start > cursor) parts.push(clause.text.slice(cursor, flag.start));
    parts.push(
      <mark
        key={flag.id}
        className={styles.mark}
        data-severity={flag.severity}
        data-active={activeId === flag.id || undefined}
        data-verdict={feedback[flag.id]?.verdict}
        data-flag={flag.id}
        onClick={() => onSelect(flag.id)}
      >
        {clause.text.slice(flag.start, flag.end)}
      </mark>
    );
    cursor = flag.end;
  }
  if (cursor < clause.text.length) parts.push(clause.text.slice(cursor));
  return <p className={styles.clauseText}>{parts}</p>;
}

/** The sample document as numbered clauses; flagged words are highlighted where they stand. */
export function DocumentPane({ doc, flags, cleared, activeId, feedback, onSelect }) {
  const box = useRef(null);

  // Bring the active flag's clause into view inside the document's own scroll box
  useEffect(() => {
    if (!activeId || !box.current) return;
    const mark = box.current.querySelector(`[data-flag="${activeId}"]`);
    const clause = mark?.closest('[data-clause]');
    if (!clause) return;
    const top = clause.offsetTop - box.current.offsetTop - 12;
    const { scrollTop, clientHeight } = box.current;
    if (top < scrollTop || top + clause.offsetHeight > scrollTop + clientHeight) {
      box.current.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }, [activeId]);

  return (
    <div className={styles.paper} ref={box} data-testid="document">
      <p className={styles.docKind}>{doc.kind}</p>
      <h3 className={styles.docTitle}>{doc.title}</h3>
      <p className={styles.docParties}>{doc.parties}</p>
      <ol className={styles.clauses}>
        {doc.clauses.map(clause => {
          const passed = cleared.filter(item => item.clause === clause.n);
          return (
            <li key={clause.n} className={styles.clause} data-clause={clause.n}>
              <span className={styles.clauseNo}>{clause.n}</span>
              <div>
                <h4 className={styles.clauseHead}>
                  {clause.heading}
                  {passed.map(item => (
                    <span key={item.rule} className={styles.clearedChip} title={item.finding}>
                      <FiCheck aria-hidden /> {ruleById(item.rule).title} checked
                    </span>
                  ))}
                </h4>
                <ClauseText
                  clause={clause}
                  flags={flags}
                  activeId={activeId}
                  feedback={feedback}
                  onSelect={onSelect}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// --- flag card ------------------------------------------------------------------------------

function Confidence({ confidence }) {
  if (confidence?.error) {
    return <p className={styles.confNote}>Confidence unavailable for this flag.</p>;
  }
  const pending = !confidence;
  return (
    <div className={styles.confidence}>
      <div className={styles.confHead}>
        <MiniLabel>Confidence</MiniLabel>
        <span className={styles.confMeta}>
          {pending ? 'scoring' : `fast decision model · ${confidence.ms} ms`}
        </span>
      </div>
      <ProbabilityBars
        options={CONFIDENCE_OPTIONS}
        probabilities={confidence?.probabilities}
        choice={confidence?.choice}
        pending={pending}
      />
    </div>
  );
}

/** One flag: severity, rule, the pinned quote, the redline, the confidence, the lawyer's call. */
export function FlagCard({ flag, confidence, decision, active, onSelect, onDecide, onUndo }) {
  const rule = ruleById(flag.rule);
  const severity = SEVERITY[flag.severity];
  const [panel, setPanel] = useState(null); // null | 'reject' | 'edit'
  const [reason, setReason] = useState('');
  const [redline, setRedline] = useState(flag.redline);
  const sample = SAMPLE_REASONS[flag.id];
  const reasons = sample ? [sample] : GENERIC_REASONS;
  const doubtful = confidence && !confidence.error && confidence.choice !== 'breach';

  function saveReject(event) {
    event.preventDefault();
    onDecide(flag, { verdict: 'reject', reason: reason.trim() });
    setPanel(null);
  }

  function saveEdit(event) {
    event.preventDefault();
    const text = redline.trim() || flag.redline;
    onDecide(flag, { verdict: 'accept', redline: text, edited: text !== flag.redline });
    setPanel(null);
  }

  return (
    <article
      className={styles.flag}
      data-active={active || undefined}
      data-verdict={decision?.verdict}
      data-testid={`flag-${flag.id}`}
      onClick={() => onSelect(flag.id)}
    >
      <header className={styles.flagHead}>
        <Tag tone={severity.tone}>{severity.label}</Tag>
        <strong className={styles.flagRule}>{rule.title}</strong>
        <span className={styles.clauseRef}>§{flag.clause}</span>
        {doubtful && <Tag tone="warn">Check first</Tag>}
        <span className={styles.pinned} title="The quote was found in the document, character for character">
          <FiMapPin aria-hidden /> {flag.exact ? 'Pinned to the exact words' : 'Pinned after re-match'}
        </span>
      </header>

      <blockquote className={styles.quote}>{flag.quote}</blockquote>
      <p className={styles.issue}>{flag.issue}</p>
      <p className={styles.ruleLine}>
        <span className={styles.ruleTag}>Rule {rule.id}</span> {rule.text}
      </p>

      <div className={styles.redline}>
        <MiniLabel>{decision?.edited ? 'Preferred redline (lawyer)' : 'Suggested redline'}</MiniLabel>
        <p>
          <FiCornerDownRight aria-hidden /> {decision?.verdict === 'accept' ? decision.redline : flag.redline}
        </p>
      </div>

      <Confidence confidence={confidence} />

      {decision ? (
        <div className={styles.decided} data-verdict={decision.verdict}>
          <StatusIcon status={decision.verdict === 'accept' ? 'pass' : 'fail'} />
          <p>
            {decision.verdict === 'accept' ? (
              <>
                <strong>Accepted.</strong>{' '}
                {decision.edited
                  ? 'Your wording is saved as the preferred redline.'
                  : 'Saved as a must-flag case.'}
              </>
            ) : (
              <>
                <strong>Rejected.</strong> {decision.reason ? `“${decision.reason}” ` : ''}
                Saved as an eval case.
              </>
            )}
          </p>
          <Button
            variant="ghost"
            size="s"
            onClick={event => {
              event.stopPropagation();
              onUndo(flag.id);
            }}
          >
            <FiRotateCcw aria-hidden /> Undo
          </Button>
        </div>
      ) : panel === 'reject' ? (
        <form className={styles.decide} onSubmit={saveReject} onClick={event => event.stopPropagation()}>
          <label className={styles.fieldLabel} htmlFor={`reason-${flag.id}`}>
            Why is this not an issue? One line.
          </label>
          <Input
            id={`reason-${flag.id}`}
            value={reason}
            maxLength={REASON_MAX}
            placeholder="e.g. Market standard, flag only above 1x"
            onChange={event => setReason(event.target.value)}
            autoFocus
          />
          <div className={styles.reasonChips}>
            {reasons.map(text => (
              <Chip key={text} onClick={() => setReason(text)} title="Use this sample reason">
                {sample ? 'Sample reason: ' : ''}
                {text}
              </Chip>
            ))}
          </div>
          <div className={styles.actions}>
            <Button type="submit" size="s" disabled={!reason.trim()} data-testid="save-reject">
              Save rejection
            </Button>
            <Button variant="ghost" size="s" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : panel === 'edit' ? (
        <form className={styles.decide} onSubmit={saveEdit} onClick={event => event.stopPropagation()}>
          <label className={styles.fieldLabel} htmlFor={`redline-${flag.id}`}>
            Your redline. It becomes the preferred wording for this rule.
          </label>
          <TextArea
            id={`redline-${flag.id}`}
            className={styles.redlineInput}
            value={redline}
            maxLength={REDLINE_MAX}
            onChange={event => setRedline(event.target.value)}
            autoFocus
          />
          <div className={styles.actions}>
            <Button type="submit" size="s" data-testid="save-edit">
              Accept with this redline
            </Button>
            <Button variant="ghost" size="s" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.actions} onClick={event => event.stopPropagation()}>
          <Button
            variant="secondary"
            size="s"
            data-testid="accept"
            onClick={() => onDecide(flag, { verdict: 'accept', redline: flag.redline, edited: false })}
          >
            <FiCheck aria-hidden /> Accept
          </Button>
          <Button variant="secondary" size="s" data-testid="edit" onClick={() => setPanel('edit')}>
            <FiEdit3 aria-hidden /> Edit redline
          </Button>
          <Button variant="secondary" size="s" data-testid="reject" onClick={() => setPanel('reject')}>
            <FiX aria-hidden /> Reject
          </Button>
        </div>
      )}
    </article>
  );
}

/** Flags whose quote could not be found, and the clauses the agent checked and passed. */
export function RunFootnotes({ dropped, cleared }) {
  if (!dropped.length && !cleared.length) return null;
  return (
    <div className={styles.footnotes}>
      {dropped.length > 0 && (
        <details className={styles.details} open>
          <summary>
            {dropped.length} flag{dropped.length === 1 ? '' : 's'} dropped: quote not found in the document
          </summary>
          <ul>
            {dropped.map((flag, index) => (
              <li key={index}>
                <Tag tone="bad">Dropped</Tag> <strong>{ruleById(flag.rule).title}</strong>: “{flag.quote}”
                <span className={styles.dim}> The agent stitched or changed the words, so the flag is not shown as a finding.</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {cleared.length > 0 && (
        <details className={styles.details}>
          <summary>
            {cleared.length} clause{cleared.length === 1 ? '' : 's'} checked and cleared
          </summary>
          <ul>
            {cleared.map(item => (
              <li key={`${item.rule}${item.clause}`}>
                <StatusIcon status="pass" /> <strong>§{item.clause} {ruleById(item.rule).title}</strong>: {item.finding}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// --- golden set -----------------------------------------------------------------------------

/** The eval set: seed labels plus the cases the lawyer's decisions added. */
export function GoldenSet({ cases, fresh }) {
  return (
    <div className={styles.golden}>
      <div className={styles.goldenCount} data-testid="golden-count">
        <span className={styles.goldenNumber}>{LABEL_COUNT + cases.length}</span>
        <span>
          eval cases
          <small>
            {LABEL_COUNT} seed labels + <b>{cases.length}</b> from lawyer review
          </small>
        </span>
      </div>
      {cases.length === 0 ? (
        <p className={styles.goldenEmpty}>
          Accept or reject a flag above. Each decision is saved here as a case every future run is
          checked against.
        </p>
      ) : (
        <ul className={styles.cases}>
          {cases.map(item => (
            <li key={item.id} className={styles.case} data-fresh={fresh === item.id || undefined}>
              <StatusIcon status={item.expect === 'flag' ? 'pass' : 'fail'} variant="solid" />
              <div>
                <p className={styles.caseTitle}>
                  {item.expect === 'flag' ? 'Must flag' : 'Must not flag'}{' '}
                  <strong>{ruleById(item.rule).title}</strong> on {docLabel(item.doc)} §{item.clause}
                  {!item.agrees && <Tag tone="warn">Differs from seed label</Tag>}
                </p>
                {item.reason && <p className={styles.caseNote}>“{item.reason}”</p>}
                {item.redline && <p className={styles.caseNote}>Preferred redline: {item.redline}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <details className={styles.details}>
        <summary>Seed labels ({LABEL_COUNT}), written before any model run</summary>
        <ul>
          {DOCS.map(doc =>
            (LABELS[doc.id] || []).length ? (
              LABELS[doc.id].map(label => (
                <li key={`${doc.id}${label.rule}${label.clause}`}>
                  <strong>
                    {doc.label} §{label.clause} {ruleById(label.rule).title}
                  </strong>
                  : {label.why}
                </li>
              ))
            ) : (
              <li key={doc.id}>
                <strong>{doc.label}</strong>: clean, nothing should be flagged
              </li>
            )
          )}
        </ul>
      </details>
    </div>
  );
}

// --- playbook -------------------------------------------------------------------------------

/** The playbook rules; clarifications added from lawyer feedback are drawn as additions. */
export function PlaybookList({ harness }) {
  const changed = harness?.clarifications || {};
  return (
    <ul className={styles.playbook}>
      {PLAYBOOK.map(rule => (
        <li key={rule.id} data-changed={changed[rule.id] ? '' : undefined}>
          <span className={styles.ruleId}>{rule.id}</span>
          <div>
            <p>
              <strong>{rule.title}.</strong> {rule.text}
            </p>
            {(changed[rule.id] || []).map(text => (
              <p key={text} className={styles.added}>
                <span aria-hidden>+</span> {text}
              </p>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The examples the lawyer's decisions added to the prompt. */
export function ExampleList({ harness }) {
  const examples = harness?.examples || [];
  if (!examples.length) return null;
  return (
    <ul className={styles.examples}>
      {examples.map((example, index) => (
        <li key={index}>
          <Tag tone={example.verdict === 'accept' ? 'ok' : 'bad'}>
            {example.verdict === 'accept' ? 'Flag' : 'Do not flag'}
          </Tag>
          <span>
            <strong>{ruleById(example.rule).title}:</strong> “{example.quote}”
            {example.verdict === 'accept' ? (
              <em> → {example.redline}</em>
            ) : (
              <em> ({example.reason})</em>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

// --- eval results ---------------------------------------------------------------------------

function Delta({ before, after, lowerIsBetter = false }) {
  if (before == null || after == null) return null;
  const diff = after - before;
  if (Math.abs(diff) < 1e-9) return <span className={styles.delta}>no change</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  const text = Number.isInteger(before) && Number.isInteger(after)
    ? `${diff > 0 ? '+' : '−'}${Math.abs(diff)}`
    : `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(diff * 100))} pts`;
  return (
    <span className={styles.delta} data-good={good ? 'yes' : 'no'}>
      {text}
    </span>
  );
}

/** Precision, recall and false positives, before and after the feedback. */
export function ScoreTiles({ before, after }) {
  return (
    <StatGrid columns={3} className={styles.scoreTiles}>
      <StatTile
        tone="accent"
        label="Precision"
        value={percent(after.precision)}
        note={`was ${percent(before.precision)} · ${after.tp} of ${after.tp + after.fp} flags correct`}
        data-testid="precision"
      >
        <Delta before={before.precision} after={after.precision} />
      </StatTile>
      <StatTile
        label="Recall"
        value={percent(after.recall)}
        note={`was ${percent(before.recall)} · ${after.tp} of ${after.tp + after.fn} labelled issues found`}
      >
        <Delta before={before.recall} after={after.recall} />
      </StatTile>
      <StatTile
        label="False alarms"
        value={after.fp}
        note={`was ${before.fp} · flags a lawyer would have to dismiss`}
      >
        <Delta before={before.fp} after={after.fp} lowerIsBetter />
      </StatTile>
    </StatGrid>
  );
}

const cell = score => (
  <span className={styles.counts}>
    <b data-kind="tp">{score.tp}</b> right <b data-kind="fp">{score.fp}</b> wrong{' '}
    <b data-kind="fn">{score.fn}</b> missed
  </span>
);

/** Per-document counts for both versions, and whether the document got lawyer feedback. */
export function DocTable({ before, after, reviewed }) {
  return (
    <div className={styles.docTable} role="table" aria-label="Results per document">
      <div className={styles.docRow} role="row" data-head="">
        <span role="columnheader">Document</span>
        <span role="columnheader">Before (v1)</span>
        <span role="columnheader">After (v2)</span>
      </div>
      {DOCS.map(doc => (
        <div key={doc.id} className={styles.docRow} role="row">
          <span role="cell" className={styles.docName}>
            {doc.label}
            {reviewed.includes(doc.id) ? (
              <Tag soft>Got feedback</Tag>
            ) : (
              <Tag soft>Regression check</Tag>
            )}
          </span>
          <span role="cell" data-label="Before (v1)">
            {cell(before.perDoc[doc.id])}
          </span>
          <span role="cell" data-label="After (v2)">
            {cell(after.perDoc[doc.id])}
          </span>
        </div>
      ))}
    </div>
  );
}

const CHANGE_TEXT = {
  'removed:true': ['No longer flagged', 'correct: it was a false alarm', 'pass'],
  'removed:false': ['No longer flagged', 'regression: a labelled issue is now missed', 'fail'],
  'added:true': ['Newly flagged', 'correct: a labelled issue', 'pass'],
  'added:false': ['Newly flagged', 'a new false alarm', 'fail'],
};

/** Flags that differ between the two runs, each marked right or wrong against the labels. */
export function ChangeList({ changes }) {
  if (!changes.length) {
    return <p className={styles.dim}>No flag changed between the two runs.</p>;
  }
  return (
    <ul className={styles.changes}>
      {changes.map(change => {
        const [what, verdict, status] = CHANGE_TEXT[`${change.kind}:${change.correct}`];
        return (
          <li key={`${change.kind}${change.id}`} data-testid="change">
            <StatusIcon status={status} />
            <p>
              <strong>{what}:</strong> {ruleById(change.rule).title}, {docLabel(change.doc)} §{change.clause}
              <span className={styles.dim}> “{change.quote}”</span>
              <em data-status={status}>{verdict}</em>
              {change.droppedBefore && (
                <span className={styles.dim}>
                  v1 raised this too, but its quote failed the pin check and the flag was dropped. Run-to-run
                  noise, not a harness change.
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** Did the re-run satisfy each lawyer case, and did it use the preferred redline? */
export function CaseResults({ results }) {
  if (!results.length) return null;
  return (
    <ul className={styles.changes}>
      {results.map(result => (
        <li key={result.id}>
          <StatusIcon status={result.pass ? 'pass' : 'fail'} />
          <p>
            <strong>{result.expect === 'flag' ? 'Must flag' : 'Must not flag'}:</strong>{' '}
            {ruleById(result.rule).title}, {docLabel(result.doc)} §{result.clause}
            <em data-status={result.pass ? 'pass' : 'fail'}>{result.pass ? 'holds in v2' : 'fails in v2'}</em>
            {result.redline && (
              <span className={styles.redlineCheck}>
                <Pill tone={result.redlineUsed ? 'ok' : 'warn'}>
                  {result.redlineUsed ? 'Preferred redline used' : 'Preferred redline not used'}
                </Pill>
                {result.newRedline && <span className={styles.dim}>v2 wrote: “{result.newRedline}”</span>}
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
