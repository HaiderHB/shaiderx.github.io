// Blackletter demo: an agent reviews a deal document against the firm playbook, a lawyer accepts
// or rejects each flag, and the feedback becomes harness changes that are scored against labels.
// Live at /demo/blackletter/ (unlisted, noindex). Without a demo key the page shows a recorded
// run; with one, reviews stream from /api/demo/blackletter/review/ and the re-run from
// /api/demo/blackletter/learn/. Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  ChoiceChips,
  EmptyState,
  MiniLabel,
  Notice,
  NoteGrid,
  Pill,
  PipelineStrip,
  SectionHead,
  Spinner,
  StatGrid,
  StatTile,
} from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiPlay, FiRefreshCw } from 'react-icons/fi';
import styles from './Blackletter.module.css';
import { DISCLAIMER, DOCS, LABEL_COUNT, docById } from './data';
import { EXAMPLE } from './example';
import { casePasses, diffRuns, scoreRun, toCase, wordOverlap } from './harness';
import {
  CaseResults,
  ChangeList,
  DocTable,
  DocumentPane,
  ExampleList,
  FlagCard,
  GoldenSet,
  PlaybookList,
  RunFootnotes,
  ScoreTiles,
} from './panels';

const REVIEW_PATH = '/api/demo/blackletter/review/';
const LEARN_PATH = '/api/demo/blackletter/learn/';
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my message.';

const NAV = [
  { href: '#review', label: 'Review' },
  { href: '#learn', label: 'Learn' },
  { href: '#evals', label: 'Evals' },
  { href: '#how', label: 'How it works' },
];

const FLOW = [
  { label: 'Review', what: 'The LLM checks each clause against the playbook and writes its finding before its verdict', cost: '1 call per document' },
  { label: 'Pin', what: 'Code finds every quote in the document, word for word, or drops the flag', cost: 'code, free' },
  { label: 'Confidence', what: 'A fast decision model scores each flag: real issue, judgement call or false alarm', cost: '~100 ms per flag' },
  { label: 'Lawyer', what: 'Accept, edit the redline or reject with one line. Each decision is saved as an eval case', cost: 'a person' },
  { label: 'Learn', what: 'Rejections become rule clarifications, decisions become examples in the prompt', cost: '1 short call' },
  { label: 'Score', what: 'Every document is reviewed again and both versions are scored against the labels', cost: 'code, free' },
];

const NOTES = [
  {
    title: 'A flag has to point at real words',
    text: 'The agent must quote the clause. Code looks the quote up in the document and highlights the document\'s own text, so a paraphrased or stitched quote is dropped instead of shown as a finding.',
  },
  {
    title: 'Finding first, verdict second',
    text: 'For each clause a rule covers, the agent states what the clause provides before it decides. Cleared clauses are kept, so a lawyer can see what was checked, not only what was flagged.',
  },
  {
    title: 'Feedback changes the harness, not the weights',
    text: 'A rejection adds one clarification under the rule and a "do not flag" example. An accept adds a "flag" example with the lawyer\'s wording. Every change is plain text a lawyer can read and undo.',
  },
  {
    title: 'Scored against labels, in code',
    text: `${LABEL_COUNT} labelled issues across ${DOCS.length} documents, written before any model run. Precision and recall are counted in code. Documents with no feedback act as the regression check for a tightened rule.`,
  },
  {
    title: 'What the numbers do not show',
    text: 'One run per version on a small set, and the model is not fully deterministic, so a single flag can move between runs. With real matters I would run each version several times and report the spread.',
  },
  {
    title: 'Cost',
    text: 'A review is one LLM call and a few decision calls. A re-run is one short call plus one review per document. Baseline runs are stored for the day and reused.',
  },
];

const emptyRun = () => ({ status: 'idle', flags: [], dropped: [], cleared: [], confidence: {} });
const percent = value => (value == null ? '–' : `${Math.round(value * 100)}%`);

/** POSTs and feeds each NDJSON line of the streamed reply to onEvent. */
async function streamEvents(path, body, onEvent) {
  let seen = 0;
  const feed = (text, final) => {
    const lines = text.split('\n');
    const complete = final ? lines.length : lines.length - 1;
    for (; seen < complete; seen += 1) {
      const line = lines[seen].trim();
      if (!line) continue;
      try {
        onEvent(JSON.parse(line));
      } catch {
        // a torn line is skipped
      }
    }
  };
  const text = await streamFromApi(path, body, (_, full) => feed(full, false));
  feed(text, true);
}

/** Everything the eval panel shows, computed from the two runs and the lawyer's cases. */
function evaluate(learn) {
  if (!learn?.v1 || !learn?.v2) return null;
  const ready = DOCS.every(doc => learn.v1[doc.id] && learn.v2[doc.id]);
  if (!ready) return null;
  const flags = runs => Object.fromEntries(DOCS.map(doc => [doc.id, runs[doc.id].flags]));
  const v1 = flags(learn.v1);
  const v2 = flags(learn.v2);
  const cases = learn.cases || [];
  const results = cases.map(item => {
    const now = v2[item.doc].find(flag => flag.rule === item.rule && flag.clause === item.clause);
    return {
      ...item,
      pass: casePasses(item, v2),
      redlineUsed: item.redline ? wordOverlap(item.redline, now?.redline) >= 0.7 : null,
      newRedline: item.redline && now && wordOverlap(item.redline, now.redline) < 0.7 ? now.redline : '',
    };
  });
  return {
    before: scoreRun(v1),
    after: scoreRun(v2),
    changes: diffRuns(v1, v2).map(change => ({
      ...change,
      // A flag v1 also raised, but whose quote failed the pin check, is not a harness win
      droppedBefore:
        change.kind === 'added' && learn.v1[change.doc].dropped.some(flag => flag.rule === change.rule),
    })),
    results,
    reviewed: [...new Set(cases.map(item => item.doc))],
    dropped: DOCS.reduce((sum, doc) => sum + learn.v2[doc.id].dropped.length, 0),
  };
}

export default function BlackletterDemo() {
  const [mode, setMode] = useState('example'); // example (recorded run) | live
  const [docId, setDocId] = useState(EXAMPLE.doc);
  const [runs, setRuns] = useState(EXAMPLE.runs);
  const [feedback, setFeedback] = useState(EXAMPLE.feedback);
  const [learn, setLearn] = useState(EXAMPLE.learn);
  const [activeId, setActiveId] = useState(null);
  const [freshCase, setFreshCase] = useState(null);
  const [notice, setNotice] = useState('');
  const [learnNotice, setLearnNotice] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const live = useRef(false);

  useEffect(() => setHasKey(Boolean(getDemoKey())), []);

  const doc = docById(docId);
  const run = runs[docId] || emptyRun();
  const reviewing = run.status === 'running';
  const learning = learn?.status === 'running';

  const cases = useMemo(() => Object.values(feedback).map(toCase), [feedback]);
  const results = useMemo(() => evaluate(learn), [learn]);
  const stale =
    learn?.status === 'done' &&
    JSON.stringify(learn.cases.map(item => [item.id, item.expect, item.reason, item.redline])) !==
      JSON.stringify(cases.map(item => [item.id, item.expect, item.reason, item.redline]));

  const updateRun = (id, change) =>
    setRuns(current => ({ ...current, [id]: change(current[id] || emptyRun()) }));

  // The first live action clears the recorded example so the two never mix
  function goLive() {
    if (live.current) return;
    live.current = true;
    setMode('live');
    setRuns({});
    setFeedback({});
    setLearn(null);
    setActiveId(null);
  }

  function showExample() {
    live.current = false;
    setMode('example');
    setDocId(EXAMPLE.doc);
    setRuns(EXAMPLE.runs);
    setFeedback(EXAMPLE.feedback);
    setLearn(EXAMPLE.learn);
    setActiveId(null);
    setNotice('');
    setLearnNotice('');
  }

  async function review(fresh = false) {
    if (!hasKey) {
      setNotice(`${PREVIEW_NOTE} The page shows a recorded run instead.`);
      return;
    }
    setNotice('');
    goLive();
    const id = docId;
    // A new review of a document replaces its flags, so decisions on the old ones go too
    setFeedback(current => Object.fromEntries(Object.entries(current).filter(([, item]) => item.doc !== id)));
    updateRun(id, () => ({ ...emptyRun(), status: 'running' }));
    try {
      await streamEvents(REVIEW_PATH, { doc: id, ...(fresh && { fresh: true }) }, event => {
        if (event.t === 'meta') updateRun(id, current => ({ ...current, cached: event.cached }));
        else if (event.t === 'flag') updateRun(id, current => ({ ...current, flags: [...current.flags, event.flag] }));
        else if (event.t === 'dropped') updateRun(id, current => ({ ...current, dropped: [...current.dropped, event.flag] }));
        else if (event.t === 'cleared') updateRun(id, current => ({ ...current, cleared: [...current.cleared, event.item] }));
        else if (event.t === 'confidence') {
          const { id: flagId, ...rest } = event;
          delete rest.t;
          updateRun(id, current => ({ ...current, confidence: { ...current.confidence, [flagId]: rest } }));
        } else if (event.t === 'done') updateRun(id, current => ({ ...current, status: 'done', ms: event.ms }));
        else if (event.t === 'error') updateRun(id, current => ({ ...current, status: 'error', error: event.message }));
      });
      updateRun(id, current => (current.status === 'running' ? { ...current, status: 'done' } : current));
    } catch (error) {
      updateRun(id, current => ({ ...current, status: 'error', error: error.message }));
    }
  }

  function decide(flag, decision) {
    setFeedback(current => ({
      ...current,
      [flag.id]: {
        id: flag.id,
        doc: flag.doc,
        rule: flag.rule,
        clause: flag.clause,
        quote: flag.quote,
        reason: '',
        redline: flag.redline,
        edited: false,
        ...decision,
      },
    }));
    setFreshCase(flag.id);
  }

  function undo(id) {
    setFeedback(current => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function rerun() {
    if (!hasKey) {
      setLearnNotice(`${PREVIEW_NOTE} The results below are from the recorded run.`);
      return;
    }
    const items = Object.values(feedback);
    if (!items.length) {
      setLearnNotice('Accept or reject at least one flag first.');
      return;
    }
    setLearnNotice('');
    goLive();
    const snapshot = items.map(toCase);
    setLearn({ status: 'running', kind: 'live', cases: snapshot, v1: {}, v2: {}, harness: null });
    try {
      await streamEvents(LEARN_PATH, { feedback: items }, event => {
        if (event.t === 'harness') setLearn(current => ({ ...current, harness: event.harness, written: event.written }));
        else if (event.t === 'run') {
          setLearn(current => ({
            ...current,
            [event.version]: {
              ...current[event.version],
              [event.doc]: { flags: event.flags, dropped: event.dropped, cleared: event.cleared || [] },
            },
          }));
        } else if (event.t === 'done') setLearn(current => ({ ...current, status: 'done', ms: event.ms }));
        else if (event.t === 'error') setLearn(current => ({ ...current, status: 'error', error: event.message }));
      });
      setLearn(current => (current.status === 'running' ? { ...current, status: 'error', error: 'The re-run ended early. Try again.' } : current));
    } catch (error) {
      setLearn(current => ({ ...current, status: 'error', error: error.message }));
    }
  }

  const decided = run.flags.filter(flag => feedback[flag.id]).length;
  const progress = learning
    ? `${Object.keys(learn.v1).length + Object.keys(learn.v2).length} of ${DOCS.length * 2} reviews done`
    : '';

  const hero = (
    <StatGrid columns={2} className={styles.heroStats}>
      <StatTile
        tone="accent"
        label="Precision after feedback"
        value={results ? percent(results.after.precision) : '–'}
        note={
          results
            ? `${learn.kind === 'example' ? 'Example run: ' : ''}was ${percent(results.before.precision)} before`
            : 'Review, decide, then re-run'
        }
      />
      <StatTile
        label="Eval cases"
        value={LABEL_COUNT + cases.length}
        note={`${LABEL_COUNT} labels + ${cases.length} from lawyer review`}
      />
    </StatGrid>
  );

  return (
    <DemoLayout
      company="Blackletter"
      title="Review the document, then learn from the lawyer"
      tagline="An agent checks a term sheet, side letter or offer letter against the firm playbook and pins every flag to the exact words. The lawyer's accept or reject becomes an eval case and a change to the harness, and the next run is scored against labels."
      accent="cobalt"
      nav={NAV}
      hero={hero}
      wide
    >
      <div className={styles.page}>
        <p className={styles.disclaimer}>{DISCLAIMER}</p>

        <section id="review" className={styles.section} aria-labelledby="review-heading">
          <SectionHead
            variant="numbered"
            index="1"
            titleId="review-heading"
            title="Review against the playbook"
            lede="Pick a document. Each flag carries its severity, the rule, a redline and the quoted words, highlighted where they stand."
          />
          <div className={styles.toolbar}>
            <ChoiceChips
              label="Sample documents"
              options={DOCS.map(item => ({ value: item.id, label: item.label }))}
              value={docId}
              onChange={id => {
                setDocId(id);
                setActiveId(null);
              }}
            />
            <div className={styles.runRow}>
              {mode === 'example' ? <Pill>Example run, recorded {EXAMPLE.recorded}</Pill> : run.cached ? <Pill>Replayed from today&apos;s run</Pill> : <Pill tone="live">Live</Pill>}
              <Button
                onClick={() => review(mode === 'live' && run.status === 'done')}
                disabled={reviewing || learning}
                data-testid="review"
              >
                {reviewing ? (
                  <>
                    <Spinner /> Reviewing
                  </>
                ) : (
                  <>
                    <FiPlay aria-hidden /> {mode === 'live' && run.status === 'done' ? 'Review again, fresh' : 'Review this document'}
                  </>
                )}
              </Button>
            </div>
          </div>
          {notice && (
            <Notice size="s" className={styles.notice} role="status">
              {notice}
            </Notice>
          )}

          <div className={styles.grid}>
            <Card className={styles.docCard}>
              <DocumentPane
                doc={doc}
                flags={run.flags}
                cleared={run.cleared}
                activeId={activeId}
                feedback={feedback}
                onSelect={setActiveId}
              />
            </Card>

            <div className={styles.flags} aria-live="polite">
              <div className={styles.flagsHead}>
                <CardTitle as="h3">Flags</CardTitle>
                <span className={styles.muted} data-testid="run-summary">
                  {run.status === 'idle'
                    ? 'Not reviewed yet'
                    : `${run.flags.length} pinned · ${run.dropped.length} dropped · ${run.cleared.length} cleared${
                        run.ms ? ` · ${(run.ms / 1000).toFixed(1)} s` : ''
                      }${run.flags.length ? ` · ${decided} of ${run.flags.length} decided` : ''}`}
                </span>
              </div>
              {run.flags.map(flag => (
                <FlagCard
                  key={flag.id}
                  flag={flag}
                  confidence={run.confidence[flag.id]}
                  decision={feedback[flag.id]}
                  active={activeId === flag.id}
                  onSelect={setActiveId}
                  onDecide={decide}
                  onUndo={undo}
                />
              ))}
              {run.status === 'idle' && (
                <EmptyState size="s">
                  {mode === 'example'
                    ? 'This document is not part of the recorded run. With the private link, review it live.'
                    : 'Click “Review this document” to run the agent on it.'}
                </EmptyState>
              )}
              {reviewing && !run.flags.length && (
                <EmptyState size="s" loading>
                  Reading the clauses against the playbook
                </EmptyState>
              )}
              {run.status === 'done' && !run.flags.length && (
                <EmptyState size="s">No clause breaches the playbook.</EmptyState>
              )}
              {run.status === 'error' && (
                <Notice kind="error" size="s" role="alert">
                  {run.error}
                </Notice>
              )}
              <RunFootnotes dropped={run.dropped} cleared={run.cleared} />
            </div>
          </div>
        </section>

        <section id="learn" className={styles.section} aria-labelledby="learn-heading">
          <SectionHead
            variant="numbered"
            index="2"
            titleId="learn-heading"
            title="Lawyer review becomes the eval set"
            lede="Every accept or reject above is saved as a case. A rejection also needs one line of reasoning, which is what the harness learns from."
          />
          <div className={styles.learnGrid}>
            <Card>
              <CardHead>
                <CardTitle>Golden set</CardTitle>
              </CardHead>
              <GoldenSet cases={cases} fresh={freshCase} />
            </Card>
            <Card tone="tint">
              <CardHead>
                <CardTitle>Apply the feedback</CardTitle>
              </CardHead>
              <p className={styles.learnText}>
                Turns {cases.filter(item => item.expect === 'no_flag').length} rejection
                {cases.filter(item => item.expect === 'no_flag').length === 1 ? '' : 's'} into rule clarifications and{' '}
                {cases.length} decision{cases.length === 1 ? '' : 's'} into prompt examples, then reviews all{' '}
                {DOCS.length} documents with the old and the new harness and scores both.
              </p>
              <div className={styles.runRow}>
                <Button onClick={rerun} disabled={learning || reviewing} data-testid="rerun">
                  {learning ? (
                    <>
                      <Spinner /> Re-running
                    </>
                  ) : (
                    <>
                      <FiRefreshCw aria-hidden /> Apply feedback and re-run evals
                    </>
                  )}
                </Button>
                <span className={styles.muted} data-testid="learn-progress">
                  {learning ? progress : hasKey ? 'Live: about 20 seconds' : 'Preview: recorded results below'}
                </span>
              </div>
              {learnNotice && (
                <Notice size="s" className={styles.notice} role="status">
                  {learnNotice}
                </Notice>
              )}
              {mode === 'live' && (
                <p className={styles.exampleLink}>
                  <Button variant="link" onClick={showExample}>
                    Show the recorded example run instead
                  </Button>
                </p>
              )}
            </Card>
          </div>
        </section>

        <section id="evals" className={styles.section} aria-labelledby="evals-heading">
          <SectionHead
            variant="numbered"
            index="3"
            titleId="evals-heading"
            title="Before and after, scored against the labels"
            lede={`Precision and recall are counted in code against ${LABEL_COUNT} labelled issues across ${DOCS.length} sample documents.`}
          />
          {!learn && (
            <EmptyState>Decide on a few flags, then apply the feedback. The scores appear here.</EmptyState>
          )}
          {learn && (
            <div className={styles.evals} data-testid="evals">
              <div className={styles.evalHead}>
                {learn.kind === 'example' ? <Pill>Example run, recorded {EXAMPLE.recorded}</Pill> : <Pill tone="live">Live</Pill>}
                {learn.status === 'done' && learn.ms && (
                  <span className={styles.muted}>
                    {DOCS.length * 2} reviews in {(learn.ms / 1000).toFixed(0)} s
                  </span>
                )}
                {stale && <Pill tone="warn">Feedback changed since this run</Pill>}
              </div>
              {learn.status === 'error' && (
                <Notice kind="error" size="s" role="alert">
                  {learn.error}
                </Notice>
              )}

              <div className={styles.evalGrid}>
                <Card>
                  <CardHead aside={learn.harness ? <Pill tone="ok">Harness v2</Pill> : <Pill>Writing</Pill>}>
                    <CardTitle>What changed in the harness</CardTitle>
                  </CardHead>
                  {learn.harness ? (
                    <>
                      <MiniLabel>Playbook, with clarifications from the lawyer</MiniLabel>
                      <PlaybookList harness={learn.harness} />
                      {learn.harness.examples.length > 0 && (
                        <>
                          <MiniLabel className={styles.gapTop}>Examples added to the prompt</MiniLabel>
                          <ExampleList harness={learn.harness} />
                        </>
                      )}
                    </>
                  ) : (
                    <EmptyState size="s" loading>
                      Turning the rejections into rule clarifications
                    </EmptyState>
                  )}
                </Card>

                <div className={styles.scores}>
                  {results ? (
                    <>
                      <ScoreTiles before={results.before} after={results.after} />
                      <Card>
                        <CardHead>
                          <CardTitle>Per document</CardTitle>
                        </CardHead>
                        <DocTable before={results.before} after={results.after} reviewed={results.reviewed} />
                      </Card>
                      <Card>
                        <CardHead>
                          <CardTitle>Flags that changed</CardTitle>
                        </CardHead>
                        <ChangeList changes={results.changes} />
                        <MiniLabel className={styles.gapTop}>Lawyer cases on the re-run</MiniLabel>
                        <CaseResults results={results.results} />
                      </Card>
                      <p className={styles.caveat}>
                        One run per version on {DOCS.length} sample documents. The model is not fully
                        deterministic, so a single flag can move between runs. Documents that got
                        feedback are in-sample; the others show whether a tightened rule broke anything.
                      </p>
                    </>
                  ) : (
                    learn.status !== 'error' && (
                      <EmptyState loading>
                        Reviewing every document with both versions. {progress}
                      </EmptyState>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section id="how" className={styles.section} aria-labelledby="how-heading">
          <SectionHead titleId="how-heading" title="How it works" flush />
          <PipelineStrip steps={FLOW} className={styles.flow} />
          <NoteGrid className={styles.notes} items={NOTES} />
          <p className={styles.disclaimer}>{DISCLAIMER}</p>
        </section>
      </div>
    </DemoLayout>
  );
}
