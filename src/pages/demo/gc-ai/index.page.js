// GC AI demo: a Word-style redlining assistant. Pick a negotiating playbook, review a vendor's
// SaaS agreement, and watch tracked changes stream into the document, each anchored to the
// exact words it replaces, with a Jev decision per flagged clause and a real .docx export.
// Live at /demo/gc-ai/ (unlisted, noindex). Without a demo key the page replays recorded live
// runs; with one, Review streams from /api/demo/gc-ai/review/. Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  DecisionBadge,
  EmptyState,
  EvalTable,
  Input,
  JsonView,
  Meter,
  MiniLabel,
  Notice,
  NoteGrid,
  Pill,
  PipelineStrip,
  ProbabilityBars,
  RunStatus,
  SectionHead,
  SegmentedControl,
  Spinner,
  Tag,
  TrackedText,
  formatMs,
  pct,
  srOnly,
} from 'demos/ui';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCheck,
  FiCornerUpLeft,
  FiDownload,
  FiFileText,
  FiInfo,
  FiPlay,
  FiRotateCcw,
  FiX,
} from 'react-icons/fi';
import { ANCHOR_CASES, anchorEdit } from './anchor';
import { CONTRACT } from './contract';
import { DOCX_MIME, buildDocx } from './docx';
import { EXAMPLES } from './example';
import styles from './GcAi.module.css';
import { HOUSE_RULE_MAX, PLAYBOOKS, playbookById, rulesFor } from './playbooks';
import {
  DECISIONS,
  applyEvent,
  emptyReview,
  isApplied,
  setEditState,
  settleAll,
} from './review';

const REVIEW_PATH = '/api/demo/gc-ai/review/';
const PREVIEW_NOTE = 'Preview mode: live reviews need the private link from my email.';
const NAV = [
  { href: '#review', label: 'Review' },
  { href: '#anchoring', label: 'Anchoring' },
  { href: '#notes', label: 'Design choices' },
];
const DECISION = Object.fromEntries(DECISIONS.map(option => [option.value, option]));
const PLAYBOOK_OPTIONS = PLAYBOOKS.map(playbook => ({ value: playbook.id, label: playbook.short }));
const MARKUP_OPTIONS = [
  { value: 'all', label: 'All markup' },
  { value: 'none', label: 'No markup' },
];
const ANCHOR_LABEL = { anchored: 'Anchored', reanchored: 'Re-anchored', refused: 'Refused' };
const ANCHOR_TONE = { anchored: 'ok', reanchored: 'warn', refused: 'bad' };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Replays recorded events on their own timeline, `speed` times faster (about 11 s in all). */
function replay(example, setReview, { instant = false } = {}) {
  const timers = [];
  const speed = example.speed;
  let previous = 0;
  let clock = 250;
  for (const event of example.events) {
    const at = event.at ?? previous;
    const gap = Math.max(0, (at - previous) / speed);
    // Keep each redline on screen long enough to read before the next one lands
    clock += instant ? 0 : event.t === 'edit' ? Math.max(gap, 260) : gap;
    previous = at;
    const apply = review => applyEvent(review, event);
    timers.push(setTimeout(() => setReview(apply), clock));
  }
  return { cancel: () => timers.forEach(clearTimeout) };
}

/** Streams one live review, calling onEvent per NDJSON event. */
async function streamReview(body, onEvent) {
  let buffer = '';
  let finished = false;
  const handle = line => {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.t === 'done' || event.t === 'error') finished = true;
    onEvent(event);
  };
  await streamFromApi(REVIEW_PATH, body, chunk => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(handle);
  });
  handle(buffer);
  if (!finished) onEvent({ t: 'error', message: 'The review ended early. Try again.' });
}

/** Scrolls a pane (not the page) so `target` sits near the top third of it. */
function scrollPaneTo(pane, target, smooth = true) {
  if (!pane || !target) return;
  const paneBox = pane.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  const top = pane.scrollTop + box.top - paneBox.top - Math.min(120, pane.clientHeight * 0.22);
  pane.scrollTo({ top: Math.max(0, top), behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
}

export default function GcAiDemo() {
  const [playbookId, setPlaybookId] = useState('standard');
  const [houseRule, setHouseRule] = useState('');
  const [review, setReview] = useState(() => emptyReview('example', 'standard'));
  const [hasKey, setHasKey] = useState(false);
  const [notice, setNotice] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [markup, setMarkup] = useState('all');
  const player = useRef(null);
  const follow = useRef(true);
  const docPane = useRef(null);
  const taskPane = useRef(null);
  const runId = useRef(0);
  const windowRef = useRef(null);

  const running = review.status === 'running';
  const playbook = playbookById(review.playbookId || playbookId);

  function playExample(id = playbookId) {
    player.current?.cancel();
    runId.current += 1;
    follow.current = true;
    setActiveId(null);
    setMarkup('all');
    setReview({ ...emptyReview('example', id), status: 'running' });
    player.current = replay(EXAMPLES[id], setReview, { instant: prefersReducedMotion() });
  }

  // The recorded example starts as soon as the document is on screen (at once on desktop; on a
  // phone, when the reader scrolls down to it), unless a review has already been started
  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    const start = () => {
      if (runId.current === 0) playExample('standard');
    };
    const target = windowRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      start();
      return () => player.current?.cancel();
    }
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        start();
      },
      { rootMargin: '0px 0px -30% 0px' }
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      player.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runReview(event) {
    event?.preventDefault();
    if (!hasKey) {
      setNotice({
        kind: 'info',
        text: houseRule.trim()
          ? `${PREVIEW_NOTE} House rules need a live run, so this replays the recorded example for the playbook.`
          : `${PREVIEW_NOTE} Replaying a recorded live run of this playbook.`,
      });
      playExample(playbookId);
      return;
    }
    setNotice(null);
    player.current?.cancel();
    const id = (runId.current += 1);
    follow.current = true;
    setActiveId(null);
    setMarkup('all');
    setReview({ ...emptyReview('live', playbookId), status: 'running' });
    const push = item => {
      if (runId.current === id) setReview(current => applyEvent(current, item));
    };
    try {
      await streamReview({ playbook: playbookId, houseRule: houseRule.trim() }, push);
    } catch (error) {
      push({ t: 'error', message: error.message });
    }
  }

  // Keep the newest redline in view while a review streams (until the reader scrolls)
  const lastEdit = review.edits[review.edits.length - 1];
  const followTarget = lastEdit?.anchor?.clause ?? review.scanning;
  useEffect(() => {
    if (!running || !follow.current || followTarget == null) return;
    const pane = docPane.current;
    const target =
      (lastEdit && pane?.querySelector(`[data-change-id="${lastEdit.id}"]`)) ||
      pane?.querySelector(`[data-clause="${followTarget}"]`);
    scrollPaneTo(pane, target);
    const list = taskPane.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followTarget, review.edits.length, running]);

  function stopFollowing() {
    follow.current = false;
  }

  function select(id, from) {
    setActiveId(id);
    follow.current = false;
    const edit = review.edits.find(item => item.id === id);
    if (!edit) return;
    if (from !== 'doc') {
      scrollPaneTo(docPane.current, docPane.current?.querySelector(`[data-change-id="${id}"]`));
    }
    if (from !== 'task') {
      scrollPaneTo(taskPane.current, taskPane.current?.querySelector(`[data-card-id="${id}"]`));
    }
  }

  function decide(id, state) {
    setReview(current => setEditState(current, id, state));
    setActiveId(id);
  }

  function downloadDocx() {
    const applied = review.edits.filter(isApplied);
    const bytes = buildDocx({
      contract: CONTRACT,
      edits: applied,
      comment: edit => {
        const decision = review.decisions[edit.anchor.clause];
        const jev =
          decision?.choice && DECISION[decision.choice]
            ? ` Jev: ${DECISION[decision.choice].long.toLowerCase()} (${pct(
                decision.probabilities[decision.choice]
              )}).`
            : '';
        return `${edit.rule ? `${edit.rule}: ` : ''}${edit.why || 'Playbook change.'}${jev}`;
      },
    });
    const url = URL.createObjectURL(new Blob([bytes], { type: DOCX_MIME }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Quillstone-Northgate-MSA-redline.docx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return (
    <DemoLayout
      company="GC AI"
      title="Playbook redlines, anchored to the exact words"
      tagline="Pick a negotiating playbook and watch tracked changes stream into a vendor's SaaS agreement. Code pins every edit to the exact words it replaces before drawing it, and Jev decides each flagged clause: accept, negotiate or escalate to counsel."
      accent="cobalt"
      nav={NAV}
      wide
      hero={<ReviewGlance review={review} playbook={playbook} />}
    >
      <div className={styles.page}>
        <section id="review" className={styles.section} aria-labelledby="review-heading">
          <h2 id="review-heading" className={srOnly}>
            Contract review
          </h2>
          <div className={styles.window} ref={windowRef}>
            <WindowBar review={review} markup={markup} onMarkup={setMarkup} />
            <div className={styles.workspace}>
              <DocumentPane
                ref={docPane}
                review={review}
                markup={markup}
                activeId={activeId}
                onSelect={id => select(id, 'doc')}
                onUserScroll={stopFollowing}
              />
              <TaskPane
                ref={taskPane}
                review={review}
                playbookId={playbookId}
                onPlaybook={id => {
                  setPlaybookId(id);
                  setNotice(null);
                }}
                houseRule={houseRule}
                onHouseRule={setHouseRule}
                onReview={runReview}
                onReplay={() => playExample(review.playbookId || playbookId)}
                hasKey={hasKey}
                notice={notice}
                activeId={activeId}
                onSelect={id => select(id, 'task')}
                onDecide={decide}
                onAll={state => setReview(current => settleAll(current, state))}
                onDownload={downloadDocx}
                onUserScroll={stopFollowing}
              />
            </div>
          </div>
        </section>

        <AnchoringSection review={review} activeId={activeId} />
        <DesignNotes />
      </div>
    </DemoLayout>
  );
}

// --- hero ------------------------------------------------------------------------------------

function kindLabel(review) {
  if (review.kind === 'example') return 'Example run';
  return review.cached ? 'Cached replay' : 'Live run';
}

/** The current review in a few numbers, beside the page title. */
function ReviewGlance({ review, playbook }) {
  const applied = review.edits.filter(isApplied);
  const refused = review.edits.length - applied.length;
  const reanchored = applied.filter(edit => edit.anchor.status === 'reanchored').length;
  const reviewed =
    review.status === 'done' ? CONTRACT.clauses.length : review.scanning ? review.scanning - 1 : 0;
  const counts = DECISIONS.map(option => ({
    ...option,
    count: Object.values(review.decisions).filter(decision => decision.choice === option.value)
      .length,
  }));

  return (
    <Card tone="accent" className={styles.glance} aria-label="This review at a glance">
      <div className={styles.glanceTop}>
        <span className={styles.glanceKind}>{kindLabel(review)}</span>
        <span className={styles.glanceClauses}>
          {reviewed} of {CONTRACT.clauses.length} clauses
        </span>
      </div>
      <Meter
        className={styles.glanceMeter}
        value={reviewed / CONTRACT.clauses.length}
        segments={CONTRACT.clauses.length}
        tone="ink"
        size="s"
        label={`${reviewed} of ${CONTRACT.clauses.length} clauses reviewed`}
      />
      <div className={styles.glanceMain}>
        <span className={styles.glanceLabel}>{playbook?.label} playbook</span>
        <strong>
          {applied.length} {applied.length === 1 ? 'redline' : 'redlines'}
        </strong>
        <span className={styles.glanceWhy}>
          {review.edits.length
            ? `${applied.length - reanchored} anchored exactly · ${reanchored} re-anchored · ${refused} refused`
            : review.status === 'running'
            ? 'Reading the agreement…'
            : 'Pick a playbook and run a review.'}
        </span>
      </div>
      <dl className={styles.glanceStats}>
        {counts.map(option => (
          <div key={option.value}>
            <dt>
              <i data-tone={option.tone} aria-hidden />
              {option.label}
            </dt>
            <dd data-empty={!option.count || undefined}>{option.count}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

// --- the add-in window ---------------------------------------------------------------------

function WindowBar({ review, markup, onMarkup }) {
  const pending = review.edits.filter(edit => isApplied(edit) && edit.state === 'pending').length;
  return (
    <div className={styles.windowBar}>
      <span className={styles.fileName}>
        <FiFileText aria-hidden />
        <span>{CONTRACT.file}</span>
      </span>
      <span className={styles.trackOn}>
        <i aria-hidden />
        Track changes on
      </span>
      <span className={styles.windowActions}>
        <span className={styles.pendingCount}>
          {pending} {pending === 1 ? 'suggestion' : 'suggestions'}
        </span>
        <SegmentedControl
          variant="box"
          label="Markup view"
          options={MARKUP_OPTIONS}
          value={markup}
          onChange={onMarkup}
        />
      </span>
    </div>
  );
}

const DocumentPane = forwardRef(function DocumentPane(
  { review, markup, activeId, onSelect, onUserScroll },
  ref
) {
  const byClause = useMemo(() => {
    const map = new Map();
    for (const edit of review.edits) {
      if (!isApplied(edit)) continue;
      const list = map.get(edit.anchor.clause) || [];
      list.push({
        id: edit.id,
        start: edit.anchor.start,
        end: edit.anchor.end,
        insert: edit.insert,
        state: markup === 'none' && edit.state === 'pending' ? 'accepted' : edit.state,
        title: `${edit.rule ? `${edit.rule} · ` : ''}${edit.why}`,
      });
      map.set(edit.anchor.clause, list);
    }
    return map;
  }, [review.edits, markup]);

  return (
    <div
      ref={ref}
      className={styles.docPane}
      onWheel={onUserScroll}
      onTouchStart={onUserScroll}
      tabIndex={-1}
    >
      <article className={styles.paper} aria-label="Contract">
        <h3 className={styles.docTitle}>{CONTRACT.title}</h3>
        <p className={styles.docParties}>{CONTRACT.parties}</p>
        {CONTRACT.clauses.map(clause => {
          const changes = byClause.get(clause.n) || [];
          const pending = changes.some(change => change.state === 'pending');
          return (
            <p
              key={clause.n}
              className={styles.clause}
              data-clause={clause.n}
              data-scanning={review.scanning === clause.n && review.status === 'running' ? '' : undefined}
              data-changed={pending ? '' : undefined}
            >
              <strong className={styles.clauseHead}>
                {clause.n}. {clause.heading}.
              </strong>{' '}
              <TrackedText
                text={clause.text}
                changes={changes}
                activeId={activeId}
                onSelect={onSelect}
                animate={markup === 'all'}
              />
            </p>
          );
        })}
      </article>
    </div>
  );
});

const TaskPane = forwardRef(function TaskPane(
  {
    review,
    playbookId,
    onPlaybook,
    houseRule,
    onHouseRule,
    onReview,
    onReplay,
    hasKey,
    notice,
    activeId,
    onSelect,
    onDecide,
    onAll,
    onDownload,
    onUserScroll,
  },
  ref
) {
  const running = review.status === 'running';
  const liveBusy = running && review.kind === 'live';
  const playbook = playbookById(playbookId);
  const rules = rulesFor(playbook, houseRule);
  const applied = review.edits.filter(isApplied);
  const refused = review.edits.filter(edit => !isApplied(edit));
  const pending = applied.filter(edit => edit.state === 'pending').length;
  const clauses = [...new Set(applied.map(edit => edit.anchor.clause))].sort((a, b) => a - b);
  const reviewed =
    review.status === 'done' ? CONTRACT.clauses.length : review.scanning ? review.scanning - 1 : 0;

  return (
    <aside className={styles.taskPane} aria-label="Redline assistant">
      <div className={styles.taskHead}>
        <span className={styles.taskTitle}>
          <strong>Redline assistant</strong>
          <span>Unofficial prototype by Haider</span>
        </span>
        <RunBadge review={review} />
      </div>

      <div
        ref={ref}
        className={styles.taskBody}
        onWheel={onUserScroll}
        onTouchStart={onUserScroll}
      >
        <form className={styles.setup} onSubmit={onReview}>
          <MiniLabel as="p">Negotiating playbook</MiniLabel>
          <SegmentedControl
            className={styles.playbooks}
            label="Negotiating playbook"
            options={PLAYBOOK_OPTIONS}
            value={playbookId}
            onChange={onPlaybook}
            disabled={liveBusy}
          />
          <details className={styles.rules}>
            <summary>
              <span>
                <strong>{playbook.label}:</strong> {playbook.hint.toLowerCase()}
              </span>
              <span className={styles.rulesCount}>{rules.length} rules</span>
            </summary>
            <ul>
              {rules.map(rule => (
                <li key={rule.id}>
                  <Tag soft>{rule.id}</Tag>
                  <span>
                    <strong>{rule.topic}.</strong> {rule.rule}
                  </span>
                </li>
              ))}
            </ul>
            {playbook.note && <p className={styles.rulesNote}>{playbook.note}</p>}
          </details>
          <label className={styles.houseLabel} htmlFor="house-rule">
            House rule <span>(optional, live only)</span>
          </label>
          <Input
            id="house-rule"
            className={styles.houseInput}
            value={houseRule}
            maxLength={HOUSE_RULE_MAX}
            placeholder="e.g. Payment within 45 days of invoice"
            onChange={event => onHouseRule(event.target.value)}
          />
          <div className={styles.runRow}>
            <Button type="submit" disabled={liveBusy}>
              {liveBusy ? (
                <>
                  <Spinner /> Reviewing
                </>
              ) : (
                <>
                  <FiPlay aria-hidden /> Review
                </>
              )}
            </Button>
            <span className={styles.hint}>
              {hasKey ? 'Live: about 3 cents; repeats are cached' : 'Preview: recorded live runs'}
            </span>
          </div>
          {notice && (
            <Notice size="s" kind={notice.kind} className={styles.notice} role="status">
              {notice.text}
            </Notice>
          )}
        </form>

        <div className={styles.progress}>
          <RunStatus state={statusState(review)}>
            {statusText(review, reviewed)}
          </RunStatus>
          <Meter
            value={reviewed / CONTRACT.clauses.length}
            segments={CONTRACT.clauses.length}
            size="s"
            label={`${reviewed} of ${CONTRACT.clauses.length} clauses reviewed`}
          />
          {review.kind === 'example' && review.playbookId && EXAMPLES[review.playbookId] && (
            <p className={styles.exampleNote}>
              <FiInfo aria-hidden />
              <span>
                Recorded live run ({EXAMPLES[review.playbookId].model},{' '}
                {formatMs(EXAMPLES[review.playbookId].totalMs)}), replayed at{' '}
                {EXAMPLES[review.playbookId].speed}x. Accept, reject and the .docx export work
                for real.
              </span>
            </p>
          )}
          {review.error && (
            <Notice kind="error" size="s" role="alert">
              {review.error}
            </Notice>
          )}
        </div>

        {clauses.length === 0 && refused.length === 0 ? (
          <EmptyState size="s" loading={running}>
            {running ? 'Waiting for the first redline…' : 'Redlines appear here, one card per clause.'}
          </EmptyState>
        ) : (
          <ol className={styles.groups}>
            {clauses.map(n => (
              <ClauseGroup
                key={n}
                n={n}
                edits={applied.filter(edit => edit.anchor.clause === n)}
                decision={review.decisions[n]}
                running={running}
                activeId={activeId}
                onSelect={onSelect}
                onDecide={onDecide}
              />
            ))}
          </ol>
        )}

        {refused.length > 0 && <RefusedList edits={refused} />}

        {review.kind === 'example' && review.status === 'done' && (
          <Button variant="ghost" className={styles.replay} onClick={onReplay}>
            <FiRotateCcw aria-hidden /> Replay the example
          </Button>
        )}
      </div>

      <div className={styles.taskFoot}>
        <Button
          size="s"
          onClick={() => onAll('accepted')}
          disabled={!pending || running}
        >
          <FiCheck aria-hidden /> Accept all
        </Button>
        <Button
          size="s"
          variant="secondary"
          onClick={() => onAll('rejected')}
          disabled={!pending || running}
        >
          Reject all
        </Button>
        <Button
          size="s"
          variant="secondary"
          className={styles.download}
          onClick={onDownload}
          disabled={!applied.length || running}
        >
          <FiDownload aria-hidden /> .docx
        </Button>
      </div>
    </aside>
  );
});

function statusState(review) {
  if (review.status === 'running') return review.kind === 'live' ? 'live' : 'wait';
  if (review.status === 'done') return 'ended';
  return 'idle';
}

function statusText(review, reviewed) {
  if (review.status === 'running') {
    const clause = CONTRACT.clauses.find(item => item.n === review.scanning);
    return clause ? `Reviewing §${clause.n} ${clause.heading}` : 'Reading the agreement';
  }
  if (review.status === 'done') {
    return `Reviewed ${reviewed} clauses${review.ms ? ` in ${formatMs(review.ms)}` : ''}`;
  }
  if (review.status === 'error') return 'Stopped';
  return 'Not run yet';
}

function RunBadge({ review }) {
  if (review.kind === 'example') return <Pill>Example run</Pill>;
  if (review.status === 'idle') return null;
  return (
    <Pill tone="live">
      {review.cached ? 'Cached' : 'Live'}
      {review.model ? ` · ${review.model.split('/').pop()}` : ''}
    </Pill>
  );
}

function ClauseGroup({ n, edits, decision, running, activeId, onSelect, onDecide }) {
  const clause = CONTRACT.clauses.find(item => item.n === n);
  const option = decision?.choice ? DECISION[decision.choice] : null;
  return (
    <li className={styles.group} data-active={edits.some(edit => edit.id === activeId) || undefined}>
      <div className={styles.groupHead}>
        <span className={styles.clauseNo}>§{n}</span>
        <strong>{clause.heading}</strong>
        {option ? (
          <DecisionBadge tone={option.tone}>{option.long}</DecisionBadge>
        ) : decision?.error ? (
          <Pill tone="bad">No decision</Pill>
        ) : (
          <span className={styles.deciding}>
            {running ? (
              <>
                <Spinner /> Jev
              </>
            ) : (
              'Pending'
            )}
          </span>
        )}
      </div>
      {option && (
        <div className={styles.jev}>
          <ProbabilityBars
            className={styles.bars}
            options={DECISIONS}
            probabilities={decision.probabilities}
            choice={decision.choice}
          />
          <span className={styles.jevMeta}>
            Jev · 1 typed question{decision.ms != null ? ` · ${formatMs(decision.ms)}` : ''}
          </span>
        </div>
      )}
      {decision?.error && <p className={styles.jevMeta}>{decision.error}</p>}
      <ul className={styles.changes}>
        {edits.map(edit => (
          <ChangeCard
            key={edit.id}
            edit={edit}
            active={edit.id === activeId}
            onSelect={onSelect}
            onDecide={onDecide}
          />
        ))}
      </ul>
    </li>
  );
}

function ChangeCard({ edit, active, onSelect, onDecide }) {
  const { anchor } = edit;
  return (
    <li
      className={styles.change}
      data-card-id={edit.id}
      data-active={active || undefined}
      data-state={edit.state}
    >
      <button type="button" className={styles.changeMain} onClick={() => onSelect(edit.id)}>
        <span className={styles.changeTags}>
          {edit.rule && <Tag soft>{edit.rule}</Tag>}
          <span className={styles.anchorStatus} data-tone={ANCHOR_TONE[anchor.status]}>
            {anchor.status === 'anchored' ? <FiCheck aria-hidden /> : <FiCornerUpLeft aria-hidden />}
            {ANCHOR_LABEL[anchor.status]}
          </span>
          <span className={styles.changeId}>{edit.id}</span>
        </span>
        <span className={styles.why}>{edit.why || 'Playbook change.'}</span>
        <span className={styles.diff}>
          <del>{anchor.original}</del>
          {edit.insert && <ins>{edit.insert}</ins>}
        </span>
        {anchor.status === 'reanchored' && <span className={styles.anchorNote}>{anchor.note}</span>}
      </button>
      <div className={styles.changeActions}>
        {edit.state === 'pending' ? (
          <>
            <Button size="s" variant="secondary" onClick={() => onDecide(edit.id, 'accepted')}>
              <FiCheck aria-hidden /> Accept
            </Button>
            <Button size="s" variant="ghost" onClick={() => onDecide(edit.id, 'rejected')}>
              <FiX aria-hidden /> Reject
            </Button>
          </>
        ) : (
          <>
            <span className={styles.settled} data-state={edit.state}>
              {edit.state === 'accepted' ? 'Accepted' : 'Rejected'}
            </span>
            <Button size="s" variant="ghost" onClick={() => onDecide(edit.id, 'pending')}>
              Undo
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function RefusedList({ edits }) {
  return (
    <div className={styles.refused}>
      <MiniLabel as="p">Not applied: quote did not anchor</MiniLabel>
      <ul>
        {edits.map(edit => (
          <li key={edit.id}>
            <span className={styles.changeTags}>
              <span className={styles.anchorStatus} data-tone="bad">
                <FiX aria-hidden /> Refused
              </span>
              <span className={styles.changeId}>
                {edit.id} · §{edit.c ?? '?'}
              </span>
            </span>
            <q className={styles.refusedQuote}>{edit.quote}</q>
            <span className={styles.anchorNote}>{edit.anchor.note} The document was not changed.</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- anchoring ---------------------------------------------------------------------------------

const FLOW = [
  { label: 'Stream', what: 'DeepSeek returns edits as JSON that quote the text', cost: '1 call' },
  { label: 'Anchor', what: 'Exact, then normalised, then other clause; else refuse', cost: 'code, free' },
  { label: 'Decide', what: 'Jev per flagged clause: accept, negotiate, escalate', cost: '~0.2 s each' },
  { label: 'Export', what: '.docx with w:ins / w:del revisions and comments', cost: 'in browser' },
];

function AnchoringSection({ review, activeId }) {
  const rows = useMemo(
    () =>
      ANCHOR_CASES.map(item => {
        const result = anchorEdit(item.edit, CONTRACT.clauses);
        return {
          id: item.id,
          label: (
            <span className={styles.caseLabel}>
              {item.label}
              <q>{item.edit.quote}</q>
              <small>model said §{item.edit.c}</small>
            </span>
          ),
          expected: ANCHOR_LABEL[item.expect],
          actual: (
            <span className={styles.caseActual}>
              {ANCHOR_LABEL[result.status]}
              <small>{result.note}</small>
            </span>
          ),
          pass: result.status === item.expect,
        };
      }),
    []
  );
  const passed = rows.filter(row => row.pass).length;
  const edit =
    review.edits.find(item => item.id === activeId) ||
    review.edits.find(item => item.anchor?.status === 'reanchored') ||
    review.edits[0];

  return (
    <section id="anchoring" className={styles.section} aria-labelledby="anchoring-heading">
      <SectionHead
        titleId="anchoring-heading"
        title="Every edit is anchored before it is drawn"
        lede="The model never sends positions. It quotes the words it wants to change, and code finds that quote in the clause: exactly first, then with quote marks, dashes and spacing normalised, then in another clause if the model cited the wrong number. Anything that can't be pinned to exactly one place is refused, never guessed. The six checks below run the same code in your browser."
      />
      <PipelineStrip steps={FLOW} label="How a review works" />
      <div className={styles.anchorGrid}>
        <Card>
          <CardHead aside={<Pill tone={passed === rows.length ? 'ok' : 'bad'}>{passed}/{rows.length} pass</Pill>}>
            <CardTitle>Anchoring checks</CardTitle>
          </CardHead>
          <EvalTable rows={rows} columns={['Model output', 'Expected', 'Actual']} />
        </Card>
        <Card>
          <CardHead aside={edit ? <Tag soft>{edit.id}</Tag> : null}>
            <CardTitle>One edit, as the model sent it</CardTitle>
          </CardHead>
          {edit ? (
            <>
              <MiniLabel as="p">Structured output</MiniLabel>
              <JsonView
                value={{ c: edit.c, quote: edit.quote, insert: edit.insert, rule: edit.rule, why: edit.why }}
              />
              <MiniLabel as="p" className={styles.jsonGap}>
                Anchor (computed by code)
              </MiniLabel>
              <JsonView value={edit.anchor} />
            </>
          ) : (
            <EmptyState size="s">Run a review, then pick a change to see its raw edit.</EmptyState>
          )}
        </Card>
      </div>
    </section>
  );
}

// --- notes -------------------------------------------------------------------------------------

const NOTES = [
  {
    title: 'Quote, then anchor',
    text: 'Character offsets from a model drift. Quotes can be checked: each one must match exactly one place, or the edit is refused and listed, so a redline never lands on the wrong words.',
  },
  {
    title: 'Stream only what is verified',
    text: 'Edits are cut out of the token stream as each JSON object closes and anchored on the spot, so redlines land one by one while the model is still reading.',
  },
  {
    title: 'Probabilities, not adjectives',
    text: 'Jev answers one typed question per flagged clause with a distribution over accept, negotiate and escalate, so a legal team can set its own bar for pulling in counsel.',
  },
  {
    title: 'Word-native output',
    text: 'The .docx carries real w:del / w:ins revisions with the playbook reason as a comment. In an Office.js add-in the same anchors become ranges edited with change tracking on.',
  },
];

function DesignNotes() {
  return (
    <section id="notes" className={styles.section} aria-labelledby="notes-heading">
      <SectionHead titleId="notes-heading" title="Design choices" flush />
      <NoteGrid className={styles.notes} items={NOTES} />
    </section>
  );
}
