// Panels for the Ashby demo page: requirement chips, the shortlist, one candidate's evidence,
// the ranking breakdown, overrides, guardrail checks and the eval table.
import {
  Avatar,
  Button,
  CheckList,
  EmptyState,
  MiniLabel,
  Notice,
  Pill,
  ProbabilityBars,
  SegmentedControl,
  Spinner,
  Tag,
} from 'demos/ui';
import { useState } from 'react';
import styles from './Ashby.module.css';
import { FIT_OPTIONS } from './agent';
import { REASON_LABELS, candidateById, evidenceLines, formatMonth, lastApplication, monthsBetween, redactedProfile, yearsAt } from './data';
import { quoteSpan } from './rank';

const FIT_TONE = { reach_out: 'ok', maybe: 'warn', not_now: 'bad' };
const FIT_LABEL = { reach_out: 'Reach out', maybe: 'Maybe', not_now: 'Not now' };
const pct = value => `${Math.round((Number(value) || 0) * 100)}%`;
const signed = value => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`;
const firstName = name => name.split(' ')[0];

const ago = date => {
  const months = monthsBetween(date);
  if (months < 18) return `${months} months ago`;
  return `${Math.round(months / 12 * 2) / 2} years ago`.replace('.5 years', '½ years');
};

/** Line text with the quoted span marked. */
export function Highlight({ text, quote, tone }) {
  const span = quoteSpan(text, quote);
  if (!span) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, span[0])}
      <mark className={styles.mark} data-tone={tone}>
        {text.slice(span[0], span[1])}
      </mark>
      {text.slice(span[1])}
    </span>
  );
}

// --- Requirements --------------------------------------------------------------------------

export function RequirementChips({ requirements, modes, busy }) {
  if (!requirements) {
    return (
      <EmptyState size="s" loading={busy}>
        {busy ? 'Reading the job description…' : 'Run it: the must-haves and nice-to-haves land here.'}
      </EmptyState>
    );
  }
  const groups = [
    ['must', 'Must-haves'],
    ['nice', 'Nice to have'],
  ];
  return (
    <div className={styles.reqs} data-kit="reqs">
      {groups.map(([kind, title]) => {
        const items = requirements.items.filter(item => (modes?.[item.id] || item.kind) === kind);
        return (
          <div key={kind} className={styles.reqGroup} data-kit={`reqs-${kind}`}>
            <MiniLabel>{title}</MiniLabel>
            <div className={styles.chipRow}>
              {kind === 'must' && requirements.years && (
                <span className={styles.reqChip} data-kind="years" title={`“${requirements.years.quote}”. Counted in code from role dates, not by a model.`}>
                  {requirements.years.label}
                  <span className={styles.reqNote}>from dates</span>
                </span>
              )}
              {items.map(item => (
                <span
                  key={item.id}
                  className={styles.reqChip}
                  data-kind={kind}
                  data-moved={(modes?.[item.id] && modes[item.id] !== item.kind) || undefined}
                  title={`“${item.quote}”: found word for word in the job description`}
                >
                  <span className={styles.tick} aria-hidden>✓</span>
                  {item.label}
                </span>
              ))}
              {!items.length && <span className={styles.muted}>None</span>}
            </div>
          </div>
        );
      })}
      {requirements.items.some(item => modes?.[item.id] === 'off') && (
        <div className={styles.reqGroup}>
          <MiniLabel>Switched off by you</MiniLabel>
          <div className={styles.chipRow}>
            {requirements.items
              .filter(item => modes?.[item.id] === 'off')
              .map(item => (
                <span key={item.id} className={styles.reqChip} data-kind="off">
                  {item.label}
                </span>
              ))}
          </div>
        </div>
      )}
      {requirements.dropped.length > 0 && (
        <div className={styles.reqGroup} data-kit="reqs-dropped">
          <MiniLabel>Removed by a guardrail</MiniLabel>
          {requirements.dropped.map(item => (
            <div key={item.quote || item.label} className={styles.dropped}>
              <del>“{item.quote || item.label}”</del>
              <span>{item.why}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Shortlist -----------------------------------------------------------------------------

export function Shortlist({ rows, run, selected, onSelect, deltas, busy, label }) {
  if (!rows.length) {
    const read = run?.screened || 0;
    return (
      <EmptyState size="s" loading={busy}>
        {busy
          ? run?.pool?.length
            ? `Reading ${run.pool.length} profiles in full and checking every quote…`
            : run?.requirements
            ? `Screening past candidates: ${read} of ${run.total} read…`
            : 'Starting…'
          : 'The shortlist lands here.'}
      </EmptyState>
    );
  }
  return (
    <ol className={styles.list} aria-label={label}>
      {rows.map((row, index) => {
        const candidate = candidateById(row.id);
        const verdict = run.verdicts?.[row.id];
        const application = lastApplication(candidate);
        const delta = deltas?.[row.id];
        return (
          <li key={row.id}>
            <button
              type="button"
              className={styles.row}
              data-selected={selected === row.id || undefined}
              onClick={() => onSelect(row.id)}
              data-kit={`row-${index + 1}`}
            >
              <span className={styles.rank}>{index + 1}</span>
              <Avatar name={candidate.name} size="s" tone={selected === row.id ? 'accent' : 'neutral'} />
              <span className={styles.who}>
                <span className={styles.name}>{candidate.name}</span>
                <span className={styles.role}>
                  {candidate.roles[0].title} · {yearsAt(candidate)} yrs
                </span>
              </span>
              <span className={styles.past}>
                {application && (
                  <>
                    <span>{REASON_LABELS[application.reason]}</span>
                    <span className={styles.faint}>{formatMonth(application.date)}</span>
                  </>
                )}
              </span>
              <span className={styles.verdict}>
                {verdict?.fit?.choice ? (
                  <span className={styles.fit} data-tone={FIT_TONE[verdict.fit.choice]}>
                    {FIT_LABEL[verdict.fit.choice]} <b>{pct(verdict.fit.probabilities?.[verdict.fit.choice])}</b>
                  </span>
                ) : (
                  <span className={styles.faint}>
                    <Spinner />
                  </span>
                )}
              </span>
              <span className={styles.score}>
                {row.total.toFixed(1)}
                {delta != null && delta !== 0 && (
                  <span className={styles.delta} data-dir={delta > 0 ? 'up' : 'down'}>
                    {delta > 0 ? '▲' : '▼'}
                    {Math.abs(delta)}
                  </span>
                )}
                {delta === null && <span className={styles.delta} data-dir="up">new</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// --- One candidate -------------------------------------------------------------------------

function PastApplication({ candidate, verdict }) {
  const application = lastApplication(candidate);
  if (!application) return null;
  const then = yearsAt(candidate, application.date);
  const now = yearsAt(candidate);
  const fresh = candidate.roles.filter(role => role.start > application.date);
  const concern = verdict?.concern;
  return (
    <div className={styles.pastCard} data-kit="past">
      <div className={styles.pastHead}>
        <MiniLabel>Last time</MiniLabel>
        <span className={styles.faint}>
          {application.job} · {formatMonth(application.date)} ({ago(application.date)}) · reached {application.stage}
        </span>
      </div>
      <p className={styles.pastReason}>
        <Tag soft>{REASON_LABELS[application.reason]}</Tag> {application.detail.replace(new RegExp(`^${REASON_LABELS[application.reason]}:\\s*`, 'i'), '')}
      </p>
      <div className={styles.pastFacts}>
        <span>
          <MiniLabel>Then</MiniLabel>
          <b>{then} yrs</b>
        </span>
        <span>
          <MiniLabel>Now</MiniLabel>
          <b>{now} yrs</b>
        </span>
        <span>
          <MiniLabel>New roles since</MiniLabel>
          <b>{fresh.length ? fresh.map(role => role.title).join(', ') : 'none'}</b>
        </span>
        <span className={styles.concern} data-kit="concern">
          <MiniLabel>Does that reason still apply?</MiniLabel>
          {concern == null ? (
            <b className={styles.faint}>–</b>
          ) : (
            <b data-tone={concern >= 0.5 ? 'bad' : concern >= 0.3 ? 'warn' : 'ok'}>
              {concern >= 0.5 ? 'Likely still applies' : concern >= 0.3 ? 'Maybe' : 'Probably not'} · {pct(concern)}
            </b>
          )}
        </span>
      </div>
    </div>
  );
}

function EvidenceList({ candidate, evidence, requirements, modes }) {
  const lines = evidenceLines(candidate);
  const byId = new Map(lines.map(line => [line.id, line]));
  const active = requirements.items.filter(item => (modes?.[item.id] || item.kind) !== 'off');
  return (
    <div className={styles.evidence} data-kit="evidence">
      {active.map(item => {
        const found = (evidence?.items || []).filter(entry => entry.req === item.id);
        return (
          <div key={item.id} className={styles.evReq} data-kit={`ev-${item.id}`}>
            <div className={styles.evHead}>
              <span className={styles.evLabel}>{item.label}</span>
              <span className={styles.evKind}>{(modes?.[item.id] || item.kind) === 'must' ? 'must' : 'nice'}</span>
            </div>
            {found.length ? (
              found.map(entry => {
                const line = byId.get(entry.line);
                return (
                  <div key={`${entry.line}-${entry.quote}`} className={styles.quote} data-tone={entry.strength}>
                    <span className={styles.source}>
                      {line.source === 'resume' ? 'Resume' : 'Interview note'} · {line.label}
                      {line.fresh && <span className={styles.fresh}>new since last time</span>}
                      {entry.strength === 'against' && <span className={styles.against}>against</span>}
                    </span>
                    <Highlight text={line.text} quote={entry.quote} tone={entry.strength} />
                  </div>
                );
              })
            ) : (
              <div className={styles.noEvidence}>No evidence in the profile or notes</div>
            )}
          </div>
        );
      })}
      {evidence?.dropped?.length > 0 && (
        <div className={styles.evReq}>
          <MiniLabel>Quotes dropped by the check</MiniLabel>
          {evidence.dropped.map(entry => (
            <div key={entry.quote} className={styles.dropped}>
              <del>“{entry.quote}”</del>
              <span>{entry.why}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** What drove this ranking: one row per requirement and adjustment, points as a signed bar. */
export function Drivers({ parts, total }) {
  const max = Math.max(3, ...parts.map(part => Math.abs(part.points)));
  return (
    <div className={styles.drivers} data-kit="drivers">
      {parts.map(part => (
        <div key={part.id} className={styles.driver}>
          <span className={styles.driverLabel}>
            {part.label}
            <span className={styles.faint}>
              {part.kind === 'must' ? 'must ×3' : part.kind === 'nice' ? 'nice ×1' : ''} {part.note}
            </span>
          </span>
          <span className={styles.driverBar}>
            <span
              className={styles.driverFill}
              data-sign={part.points >= 0 ? 'plus' : 'minus'}
              style={{ width: `${(Math.abs(part.points) / max) * 50}%` }}
            />
          </span>
          <span className={styles.driverValue}>{signed(part.points)}</span>
        </div>
      ))}
      <div className={styles.driverTotal}>
        <span>Score</span>
        <b>{total.toFixed(1)}</b>
      </div>
    </div>
  );
}

export function CandidateDetail({ id, run, row, modes, email, onEmail }) {
  const [view, setView] = useState('evidence');
  if (!id || !row) return <EmptyState size="s">Pick a candidate to see the evidence.</EmptyState>;
  const candidate = candidateById(id);
  const evidence = run.evidence?.[id];
  const verdict = run.verdicts?.[id];
  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <Avatar name={candidate.name} size="m" tone="accent" />
        <div>
          <h3 className={styles.detailName}>{candidate.name}</h3>
          <p className={styles.faint}>
            {candidate.roles[0].title} · {yearsAt(candidate)} yrs · {candidate.id}
          </p>
        </div>
      </div>
      {evidence?.summary && <p className={styles.summary}>{evidence.summary}</p>}

      <div className={styles.verdictBox} data-kit="fit">
        <MiniLabel>Fit verdict from a fast decision model</MiniLabel>
        <ProbabilityBars
          options={FIT_OPTIONS.map(option => ({ ...option, tone: FIT_TONE[option.value] }))}
          probabilities={verdict?.fit?.probabilities}
          choice={verdict?.fit?.choice}
          pending={!verdict}
        />
      </div>

      <PastApplication candidate={candidate} verdict={verdict} />

      <SegmentedControl
        className={styles.detailTabs}
        label="Detail view"
        variant="pill"
        options={[
          { value: 'evidence', label: 'Evidence' },
          { value: 'drivers', label: 'What drove the rank' },
          { value: 'redacted', label: 'What the models read' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'evidence' && <EvidenceList candidate={candidate} evidence={evidence} requirements={run.requirements} modes={modes} />}
      {view === 'drivers' && <Drivers parts={row.parts} total={row.total} />}
      {view === 'redacted' && (
        <div>
          <p className={styles.faint}>
            Exactly what the LLM and the decision model saw: no name, school, employer, location or dates.
          </p>
          <pre className={styles.redacted}>{redactedProfile(candidate)}</pre>
        </div>
      )}

      <EmailBox candidate={candidate} email={email} onEmail={onEmail} />
    </div>
  );
}

function EmailBox({ candidate, email, onEmail }) {
  return (
    <div className={styles.emailBox} data-kit="email">
      <div className={styles.emailHead}>
        <MiniLabel>Re-engagement note</MiniLabel>
        {email?.kind === 'example' && <Pill>Example draft, recorded</Pill>}
        {email?.kind === 'live' && <Pill tone="live">Live draft</Pill>}
      </div>
      {email?.draft ? (
        <>
          <p className={styles.subject}>{email.draft.subject}</p>
          <p className={styles.emailBody}>{email.draft.body}</p>
          <CheckList className={styles.emailChecks} items={email.draft.checks} label="Checks on the draft" />
        </>
      ) : email?.error ? (
        <Notice size="s" kind={email.preview ? 'info' : 'error'}>
          {email.error}
        </Notice>
      ) : null}
      {!email?.draft && (
        <Button variant="secondary" size="s" onClick={onEmail} disabled={email?.busy}>
          {email?.busy ? (
            <>
              <Spinner /> Drafting
            </>
          ) : (
            `Draft a note to ${firstName(candidate.name)}`
          )}
        </Button>
      )}
    </div>
  );
}

// --- Hero: the second look -------------------------------------------------------------------

/**
 * The best-ranked candidate who was passed on for level or skills and whose old reason probably
 * no longer applies: the "you already met them" moment, beside the page title.
 */
export function SecondLook({ rows, run, label, onOpen }) {
  const pick = rows.find(row => {
    const application = lastApplication(candidateById(row.id));
    const verdict = run.verdicts?.[row.id];
    return ['level', 'skills'].includes(application?.reason) && verdict && verdict.concern < 0.35;
  });
  if (!pick) {
    return (
      <div className={styles.hero} data-kit="hero">
        <MiniLabel>Worth a second look</MiniLabel>
        <EmptyState size="s" loading={!run.done}>
          {run.done
            ? 'No one passed on for level or skills made this shortlist.'
            : run.pool?.length
            ? `Reading ${run.pool.length} profiles in full, checking every quote…`
            : run.requirements
            ? `Screening past candidates: ${run.screened || 0} of ${run.total}…`
            : 'Reading the job description…'}
        </EmptyState>
      </div>
    );
  }
  const candidate = candidateById(pick.id);
  const application = lastApplication(candidate);
  const verdict = run.verdicts[pick.id];
  const lines = evidenceLines(candidate);
  const items = run.evidence[pick.id]?.items || [];
  const best = items.find(item => item.strength === 'strong' && lines.find(line => line.id === item.line)?.fresh) || items.find(item => item.strength === 'strong');
  const line = best && lines.find(entry => entry.id === best.line);
  return (
    <button type="button" className={styles.hero} data-kit="hero" onClick={() => onOpen(pick.id)}>
      <span className={styles.heroTop}>
        <MiniLabel>Worth a second look</MiniLabel>
        <span className={styles.faint}>{label}</span>
      </span>
      <span className={styles.heroWho}>
        <Avatar name={candidate.name} size="m" tone="accent" />
        <span>
          <span className={styles.heroName}>{candidate.name}</span>
          <span className={styles.faint}>
            {candidate.roles[0].title} · #{rows.indexOf(pick) + 1} on the shortlist
          </span>
        </span>
      </span>
      <span className={styles.heroThen} data-kit="hero-then">
        <span>
          Passed on for <b>{REASON_LABELS[application.reason].toLowerCase()}</b>, {formatMonth(application.date)}
        </span>
        <span className={styles.heroYears}>
          {yearsAt(candidate, application.date)} → <b>{yearsAt(candidate)} yrs</b>
        </span>
      </span>
      {line && (
        <span className={styles.heroQuote}>
          <span className={styles.source}>
            {line.source === 'resume' ? 'Resume' : 'Interview note'}
            {line.fresh && <span className={styles.fresh}>new since last time</span>}
          </span>
          <Highlight text={line.text} quote={best.quote} />
        </span>
      )}
      <span className={styles.heroFoot} data-kit="hero-verdict">
        <span className={styles.fit} data-tone={FIT_TONE[verdict.fit.choice]}>
          {FIT_LABEL[verdict.fit.choice]} <b>{pct(verdict.fit.probabilities?.[verdict.fit.choice])}</b>
        </span>
        <span className={styles.faint}>
          old reason still applies: <b>{pct(verdict.concern)}</b>
        </span>
      </span>
    </button>
  );
}

// --- Overrides -----------------------------------------------------------------------------

export function Overrides({ requirements, modes, onChange, onReset }) {
  if (!requirements) return <EmptyState size="s">Run a role first.</EmptyState>;
  return (
    <div className={styles.overrides}>
      {requirements.items.map(item => (
        <div key={item.id} className={styles.override} data-kit={`ov-${item.id}`}>
          <span className={styles.overrideLabel}>
            {item.label}
            {modes[item.id] && modes[item.id] !== item.kind && <span className={styles.faint}>was {item.kind === 'must' ? 'must' : 'nice'}</span>}
          </span>
          <SegmentedControl
            label={`${item.label}: how much it matters`}
            variant="box"
            options={[
              { value: 'must', label: 'Must' },
              { value: 'nice', label: 'Nice' },
              { value: 'off', label: 'Off' },
            ]}
            value={modes[item.id] || item.kind}
            onChange={value => onChange(item.id, value)}
          />
        </div>
      ))}
      <Button variant="link" onClick={onReset} disabled={!Object.keys(modes).length}>
        Reset to the job description
      </Button>
    </div>
  );
}

// --- Eval ----------------------------------------------------------------------------------

function Bar({ value, tone }) {
  return (
    <span className={styles.evalBar}>
      <span className={styles.evalFill} data-tone={tone} style={{ width: `${Math.max(2, value * 100)}%` }} />
    </span>
  );
}

export function EvalRows({ rows, pending }) {
  return (
    <div className={styles.evalTable} role="table" aria-label="Precision and recall per role">
      <div className={styles.evalRow} data-head role="row">
        <span role="columnheader">Role</span>
        <span role="columnheader">Agent</span>
        <span role="columnheader">Keyword search</span>
      </div>
      {rows.map(row => (
        <div key={row.job.id} className={styles.evalRow} role="row" data-kit={`eval-${row.job.id}`}>
          <span role="cell" className={styles.evalRole}>
            <b>{row.job.title}</b>
            <span className={styles.faint}>{row.labels.length} hand-labelled reach-outs in the pool</span>
            <span className={styles.labelChips}>
              {row.labels.map(id => {
                const agent = row.agent?.found.includes(id);
                const keyword = row.keyword.found.includes(id);
                return (
                  <span key={id} className={styles.labelChip} title={candidateById(id).name}>
                    {firstName(candidateById(id).name)}
                    <span data-hit={agent || undefined} title="agent">A</span>
                    <span data-hit={keyword || undefined} title="keyword search">K</span>
                  </span>
                );
              })}
            </span>
          </span>
          <span role="cell" className={styles.evalCell}>
            {row.agent ? (
              <>
                <span className={styles.evalMetric}>
                  <MiniLabel>Precision@10</MiniLabel> <b>{row.agent.precision.toFixed(1)}</b>
                </span>
                <Bar value={row.agent.precision} tone="accent" />
                <span className={styles.evalMetric}>
                  <MiniLabel>Recall@10</MiniLabel> <b>{row.agent.recall.toFixed(2)}</b>
                </span>
                <Bar value={row.agent.recall} tone="accent" />
              </>
            ) : (
              <span className={styles.faint}>{pending?.includes(row.job.id) ? <Spinner /> : 'not run'}</span>
            )}
          </span>
          <span role="cell" className={styles.evalCell}>
            <span className={styles.evalMetric}>
              <MiniLabel>Precision@10</MiniLabel> <b>{row.keyword.precision.toFixed(1)}</b>
            </span>
            <Bar value={row.keyword.precision} />
            <span className={styles.evalMetric}>
              <MiniLabel>Recall@10</MiniLabel> <b>{row.keyword.recall.toFixed(2)}</b>
            </span>
            <Bar value={row.keyword.recall} />
          </span>
        </div>
      ))}
    </div>
  );
}

