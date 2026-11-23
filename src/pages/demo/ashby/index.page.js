// Ashby demo: "Rediscover the candidate you already met". Paste a new job description; an agent
// reads every past candidate's resume and interview notes, cites the exact lines that match,
// and says whether the reason they were passed on still applies. Code checks every quote and
// does the ranking; a recruiter can override a requirement and watch the shortlist move.
// Live at /demo/ashby/ (unlisted, noindex). Without a key the page replays recorded runs.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, postJson, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  CheckList,
  ChoiceChips,
  MiniLabel,
  NoteGrid,
  Notice,
  Pill,
  PipelineStrip,
  RunStatus,
  SectionHead,
  Spinner,
  StatGrid,
  StatTile,
  TextArea,
  srOnly,
} from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Ashby.module.css';
import { emptyRun, reduceRun } from './agent';
import { CANDIDATES, IGNORED_FIELDS, JOBS, LABELS, jobById } from './data';
import { EXAMPLE } from './example';
import { CandidateDetail, EvalRows, Overrides, RequirementChips, SecondLook, Shortlist } from './panels';
import { SHORTLIST, invariance, keywordRank, leakScan, metrics, orderOf, rankRun } from './rank';

const RUN_PATH = '/api/demo/ashby/run/';
const EMAIL_PATH = '/api/demo/ashby/email/';
const HERO = 'spe';
const NO_MODES = {};
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my message.';

const NAV = [
  { href: '#rediscover', label: 'Rediscover' },
  { href: '#fairness', label: 'Why this order' },
  { href: '#eval', label: 'Eval' },
  { href: '#how', label: 'How it works' },
];

const FLOW = [
  { label: 'Requirements', what: 'The LLM lists must-haves and nice-to-haves; code keeps those quoted word for word and drops proxies', cost: '1 LLM call' },
  { label: 'Screen', what: `Every past candidate, redacted, rated against each requirement in three parallel batches`, cost: '3 LLM calls' },
  { label: 'Read in full', what: 'The best 14: the LLM cites lines, code drops any quote not found verbatim', cost: '3 LLM calls' },
  { label: 'Verdicts', what: 'A fast decision model: reach out or not, and does the old reason still apply', cost: '14 decisions' },
  { label: 'Rank', what: 'Code scores the checked evidence; overrides re-rank instantly', cost: 'code, free' },
];

const NOTES = [
  {
    title: 'Every claim has a line behind it',
    text: 'A match is only as good as the words that support it. The model must cite a line id and copy the words; code finds them in that line or drops the quote. The page highlights the exact span.',
  },
  {
    title: 'Old reasons get re-checked, not inherited',
    text: '“Too junior” in 2023 is a fact about 2023. Code computes years then and now and lists roles started since; the decision model weighs whether the reason still holds, with a probability you can see.',
  },
  {
    title: 'Blind by construction',
    text: 'The models read a redacted profile: no name (replaced inside notes too), school, employer, location or dates, so no gap can show. Code scans every profile for leaks and re-runs the ranking with those fields shuffled.',
  },
  {
    title: 'Measured, not asserted',
    text: 'Three roles, hand-labelled: who a recruiter would actually reach out to. Precision and recall at 10 for the agent and for a keyword search over the same resumes and notes, computed in code.',
  },
];

function parseLines(text, from) {
  const lines = text.split('\n');
  const complete = lines.slice(0, -1);
  const events = [];
  for (let index = from; index < complete.length; index++) {
    if (!complete[index].trim()) continue;
    try {
      events.push(JSON.parse(complete[index]));
    } catch {
      // a partial line: the stream sends whole lines
    }
  }
  return { events, next: complete.length };
}

const REPLAY_DELAY = { start: 200, requirements: 800, screen: 450, pool: 300, evidence: 190, verdict: 35, done: 100 };

const exampleRun = jobId => (EXAMPLE.runs[jobId] || []).reduce(reduceRun, emptyRun());

const initialRuns = () =>
  Object.fromEntries(JOBS.map(job => [job.id, { state: exampleRun(job.id), kind: 'example', status: EXAMPLE.runs[job.id] ? 'done' : 'idle' }]));

export default function AshbyDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [jobId, setJobId] = useState(HERO);
  const [jdText, setJdText] = useState(jobById(HERO).text);
  const [runs, setRuns] = useState(initialRuns);
  const [modes, setModes] = useState({});
  const [selected, setSelected] = useState(null);
  const [emails, setEmails] = useState({});
  const [notice, setNotice] = useState('');
  const [evalPending, setEvalPending] = useState([]);
  const [evalError, setEvalError] = useState('');
  const token = useRef(0);

  const current = runs[jobId] || { state: emptyRun(), kind: 'live', status: 'idle' };
  const run = current.state;
  const busy = current.status === 'running' || current.status === 'replaying';
  const jobModes = modes[jobId] || NO_MODES;

  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    replay(HERO);
    return () => {
      token.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRun = (id, patch) => setRuns(all => ({ ...all, [id]: { ...(all[id] || {}), ...patch } }));

  async function replay(id) {
    const events = EXAMPLE.runs[id];
    if (!events) return;
    const mine = ++token.current;
    setSelected(null);
    let state = emptyRun();
    setRun(id, { state, kind: 'example', status: 'replaying' });
    for (const event of events) {
      const wait = REPLAY_DELAY[event.t] || 0;
      if (wait) await new Promise(resolve => setTimeout(resolve, wait));
      if (token.current !== mine) return;
      state = reduceRun(state, event);
      setRun(id, { state });
    }
    setRun(id, { status: 'done' });
  }

  function skip() {
    token.current += 1;
    setRun(jobId, { state: exampleRun(jobId), status: 'done' });
  }

  function pickJob(id) {
    if (busy) skip();
    setNotice('');
    setSelected(null);
    setJobId(id);
    if (id === 'custom') {
      setJdText('');
      setRun('custom', { state: emptyRun(), kind: 'live', status: 'idle' });
      if (!hasKey) setNotice(`${PREVIEW_NOTE} Pasting your own role needs a live run.`);
    } else {
      setJdText(jobById(id).text);
    }
  }

  async function stream(id, jd) {
    let state = emptyRun();
    setRun(id, { state, kind: 'live', status: 'running' });
    let seen = 0;
    await streamFromApi(RUN_PATH, { jd }, (_, text) => {
      const { events, next } = parseLines(text, seen);
      seen = next;
      if (!events.length) return;
      state = events.reduce(reduceRun, state);
      setRun(id, { state });
    });
    setRun(id, { status: state.error || !state.done ? 'error' : 'done', state: state.done || state.error ? state : { ...state, error: 'The run ended early. Try again in a moment.' } });
    return state;
  }

  async function runIt() {
    setNotice('');
    if (!hasKey) {
      if (jobId === 'custom') {
        setNotice(`${PREVIEW_NOTE} The three preset roles show recorded runs.`);
        return;
      }
      setNotice(`${PREVIEW_NOTE} Replaying the recorded run instead.`);
      replay(jobId);
      return;
    }
    if (jdText.trim().length < 80) {
      setNotice('Paste a fuller job description: a few lines at least.');
      return;
    }
    token.current += 1;
    setSelected(null);
    setModes(all => ({ ...all, [jobId]: {} }));
    try {
      await stream(jobId, jdText);
    } catch (error) {
      setRun(jobId, { status: 'error', state: { ...emptyRun(), error: error.message } });
    }
  }

  async function runEval() {
    if (!hasKey) {
      setEvalError(`${PREVIEW_NOTE} The table shows the recorded runs.`);
      return;
    }
    setEvalError('');
    setEvalPending(JOBS.map(job => job.id));
    for (const job of JOBS) {
      try {
        await stream(job.id, job.text);
      } catch (error) {
        setEvalError(error.message);
      }
      setEvalPending(pending => pending.filter(id => id !== job.id));
    }
  }

  async function draftEmail(id) {
    const key = `${jobId}:${id}`;
    const example = current.kind === 'example' && EXAMPLE.emails[key];
    if (example) {
      setEmails(all => ({ ...all, [key]: { draft: example, kind: 'example' } }));
      return;
    }
    if (!hasKey) {
      setEmails(all => ({ ...all, [key]: { error: `${PREVIEW_NOTE} Recorded drafts exist for the top candidates of each preset role.`, preview: true } }));
      return;
    }
    setEmails(all => ({ ...all, [key]: { busy: true } }));
    try {
      const draft = await postJson(EMAIL_PATH, { jd: jdText, candidateId: id });
      setEmails(all => ({ ...all, [key]: { draft, kind: 'live' } }));
    } catch (error) {
      setEmails(all => ({ ...all, [key]: { error: error.message } }));
    }
  }

  // --- Derived -------------------------------------------------------------------------------

  const ranked = useMemo(() => rankRun(run, jobModes), [run, jobModes]);
  const base = useMemo(() => rankRun(run, {}), [run]);
  const rows = ranked.pool.slice(0, SHORTLIST);
  const overridden = Object.keys(jobModes).length > 0;
  const deltas = useMemo(() => {
    if (!overridden) return null;
    const before = base.pool.slice(0, SHORTLIST).map(row => row.id);
    return Object.fromEntries(rows.map((row, index) => [row.id, before.includes(row.id) ? before.indexOf(row.id) - index : null]));
  }, [overridden, base, rows]);
  const selectedId = selected && ranked.pool.some(row => row.id === selected) ? selected : rows[0]?.id;
  const selectedRow = ranked.pool.find(row => row.id === selectedId);

  const scan = useMemo(() => leakScan(), []);
  const blind = useMemo(() => (run.done ? invariance(run, jobModes) : null), [run, jobModes]);
  const leakCount = key => scan.leaks[key].length;

  const evalRows = useMemo(
    () =>
      JOBS.map(job => {
        const state = runs[job.id]?.state;
        const agent = state?.done ? metrics(orderOf(rankRun(state)), LABELS[job.id]) : null;
        return { job, labels: LABELS[job.id], agent, keyword: metrics(keywordRank(job).map(row => row.id), LABELS[job.id]) };
      }),
    [runs]
  );
  const mean = (key, method) => {
    const list = evalRows.filter(row => row[method]).map(row => row[method][key]);
    return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null;
  };
  const evalKind = JOBS.every(job => runs[job.id]?.kind === 'example') ? 'example' : 'live';
  const fmt = value => (value == null ? '–' : value.toFixed(2));

  const quotes = run.done?.quotes;
  const guardrails = [
    {
      id: 'redact',
      label: 'Models never see a name, school, employer, place or date',
      status: ['name', 'school', 'employer', 'location', 'date', 'pronoun'].every(key => !leakCount(key)) ? 'pass' : 'fail',
      detail: `${scan.people} redacted profiles scanned in code: ${['name', 'school', 'employer', 'location', 'date', 'pronoun'].reduce((sum, key) => sum + leakCount(key), 0)} leaks`,
    },
    {
      id: 'shuffle',
      label: 'Same shortlist with names, schools and places shuffled',
      status: blind ? (blind.shuffled ? 'pass' : 'fail') : 'na',
      detail: blind ? `ranking re-run on a pool with those fields rotated across all ${CANDIDATES.length}: top ${blind.size} identical, in order` : 'after a run',
    },
    {
      id: 'gaps',
      label: 'Same shortlist with every career gap closed',
      status: blind ? (blind.closed ? 'pass' : 'fail') : 'na',
      detail: blind ? 'roles slid together, lengths kept: top 10 identical' : 'after a run',
    },
    {
      id: 'proxies',
      label: 'Proxy requirements removed from the job description',
      status: run.requirements ? (run.requirements.dropped.some(item => item.rule === 'proxy') ? 'fixed' : 'pass') : 'na',
      detail: run.requirements
        ? run.requirements.dropped.filter(item => item.rule === 'proxy').map(item => item.why).join('; ') || 'none found'
        : 'after a run',
      removed: run.requirements?.dropped.filter(item => item.rule === 'proxy').map(item => item.quote),
    },
    {
      id: 'quotes',
      label: 'Every quote found word for word',
      status: quotes ? (quotes.dropped ? 'fixed' : 'pass') : 'na',
      detail: quotes ? `${quotes.kept} kept, ${quotes.dropped} dropped` : 'after a run',
    },
  ];

  const runLabel =
    current.kind === 'example'
      ? current.status === 'replaying'
        ? 'Replaying a recorded run'
        : `Example run, recorded ${EXAMPLE.recorded}`
      : current.status === 'running'
      ? 'Live'
      : current.status === 'done'
      ? run.cached
        ? 'Live run, from cache'
        : 'Live run'
      : current.status === 'error'
      ? 'Run failed'
      : 'Ready';

  const jobOptions = [...JOBS.map(job => ({ value: job.id, label: job.short })), { value: 'custom', label: 'Paste your own' }];
  const progress = run.requirements
    ? `${run.screened || 0} of ${run.total} screened · ${Object.keys(run.evidence).length} of ${run.pool.length || 14} read in full`
    : '';

  return (
    <DemoLayout
      company="Ashby"
      title="Rediscover the candidate you already met"
      tagline="A new role opens. An agent reads every past candidate’s resume and interview notes, cites the exact lines that match, and checks whether the reason you passed on them still applies. Code verifies every quote and does the ranking."
      accent="iris"
      nav={NAV}
      hero={
        <SecondLook
          rows={rows}
          run={run}
          label={current.kind === 'example' ? 'Example run' : runLabel}
          onOpen={id => {
            setSelected(id);
            document.querySelector('[data-kit="detail"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      }
    >
      <div className={styles.page}>
        <section id="rediscover" className={styles.section} aria-labelledby="rediscover-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Talent rediscovery"
            titleId="rediscover-heading"
            title="New role. Who have we already met?"
            lede={`${CANDIDATES.length} past candidates with resumes, ${run.notes} interview notes and the reasons they were passed on. All invented. Unofficial prototype.`}
          />

          <div className={styles.top}>
            <Card className={styles.jdCard} data-kit="jd">
              <CardHead aside={<span className={styles.muted}>{jobId === 'custom' ? 'your own' : 'sample role'}</span>}>
                <CardTitle>Job description</CardTitle>
              </CardHead>
              <ChoiceChips label="Role" options={jobOptions} value={jobId} onChange={pickJob} />
              <label className={srOnly} htmlFor="ashby-jd">
                Job description
              </label>
              <TextArea
                id="ashby-jd"
                className={styles.jd}
                value={jdText}
                maxLength={4000}
                placeholder="Paste a job description: title on the first line, then what the role needs."
                onChange={event => {
                  setJdText(event.target.value);
                  if (jobId !== 'custom') {
                    setJobId('custom');
                    setRun('custom', { state: emptyRun(), kind: 'live', status: 'idle' });
                  }
                }}
              />
              <div className={styles.runRow}>
                <Button onClick={runIt} disabled={current.status === 'running'} data-kit="run">
                  {current.status === 'running' ? (
                    <>
                      <Spinner /> Rediscovering
                    </>
                  ) : current.kind === 'example' && hasKey ? (
                    'Run it live'
                  ) : (
                    'Rediscover candidates'
                  )}
                </Button>
                {current.status === 'replaying' ? (
                  <Button variant="link" onClick={skip}>
                    Skip to the result
                  </Button>
                ) : (
                  current.kind === 'example' && (
                    <Button variant="link" onClick={() => replay(jobId)}>
                      Replay
                    </Button>
                  )
                )}
                <span className={styles.muted}>{hasKey ? 'Live: about a minute, about 3 cents' : 'Preview: recorded runs'}</span>
              </div>
              {notice && (
                <Notice size="s" className={styles.notice} role="status">
                  {notice}
                </Notice>
              )}
            </Card>

            <Card className={styles.reqCard} data-kit="req-card">
              <CardHead aside={<RunStatus state={busy ? 'live' : current.kind === 'example' ? 'example' : current.status === 'done' ? 'ended' : 'idle'}>{runLabel}</RunStatus>}>
                <CardTitle>What the role needs</CardTitle>
              </CardHead>
              <RequirementChips requirements={run.requirements} modes={jobModes} busy={busy} />
              {progress && (
                <p className={styles.progress} data-kit="progress">
                  {progress}
                  {quotes && ` · ${quotes.kept} quotes checked, ${quotes.dropped} dropped`}
                </p>
              )}
              {run.error && (
                <Notice kind="error" size="s" role="alert" className={styles.notice}>
                  {run.error}
                </Notice>
              )}
            </Card>
          </div>

          <div className={styles.results} aria-live="polite">
            <Card className={styles.listCard} data-kit="shortlist">
              <CardHead aside={overridden ? <Pill tone="warn">Your overrides</Pill> : <span className={styles.muted}>ranked in code</span>}>
                <CardTitle>Shortlist</CardTitle>
              </CardHead>
              <div className={styles.listHead} aria-hidden>
                <span>#</span>
                <span>Candidate</span>
                <span>Passed on for</span>
                <span>Verdict</span>
                <span>Score</span>
              </div>
              <Shortlist rows={rows} run={run} selected={selectedId} onSelect={setSelected} deltas={deltas} busy={busy} label="Shortlist" />
            </Card>
            <Card className={styles.detailCard} data-kit="detail">
              <CandidateDetail
                id={selectedId}
                run={run}
                row={selectedRow}
                modes={jobModes}
                email={emails[`${jobId}:${selectedId}`]}
                onEmail={() => draftEmail(selectedId)}
              />
            </Card>
          </div>
        </section>

        <section id="fairness" className={styles.section} aria-labelledby="fairness-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Fairness and explainability"
            titleId="fairness-heading"
            title="Why this order, and what it ignores"
            lede="The ranking is code over checked evidence, so you can change what matters and watch it move. The guardrails below are computed on this page, not promised."
          />
          <div className={styles.fairGrid}>
            <Card data-kit="overrides">
              <CardHead aside={<span className={styles.muted}>re-ranks instantly, no model call</span>}>
                <CardTitle>Change what matters</CardTitle>
              </CardHead>
              <Overrides
                requirements={run.requirements}
                modes={jobModes}
                onChange={(id, value) =>
                  setModes(all => {
                    const next = { ...(all[jobId] || {}) };
                    const original = run.requirements.items.find(item => item.id === id)?.kind;
                    if (value === original) delete next[id];
                    else next[id] = value;
                    return { ...all, [jobId]: next };
                  })
                }
                onReset={() => setModes(all => ({ ...all, [jobId]: {} }))}
              />
              <div className={styles.miniList} data-kit="mini-list">
                <MiniLabel>Top 5 {overridden ? 'with your changes' : 'now'}</MiniLabel>
                <Shortlist rows={rows.slice(0, 5)} run={run} selected={selectedId} onSelect={setSelected} deltas={deltas} busy={busy} label="Top five" />
              </div>
            </Card>
            <Card data-kit="guardrails">
              <CardHead>
                <CardTitle>Guardrails, checked in code</CardTitle>
              </CardHead>
              <CheckList items={guardrails} label="Guardrail checks" statusLabels={{ fixed: 'Caught', na: 'Waiting' }} />
              <div className={styles.ignored}>
                <MiniLabel>Never read by the ranking or the models</MiniLabel>
                <div className={styles.chipRow}>
                  {IGNORED_FIELDS.map(field => (
                    <span key={field.id} className={styles.ignoredChip} title={field.why}>
                      {field.label}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="eval" className={styles.section} aria-labelledby="eval-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Eval"
            titleId="eval-heading"
            title="Better than a keyword search? Measured."
            lede="For each role I hand-labelled who a recruiter would actually reach out to, by reading every profile. Both methods rank the same 92 people; code computes precision and recall at 10."
            action={
              <Button onClick={runEval} disabled={evalPending.length > 0 || busy} data-kit="eval-run">
                {evalPending.length ? (
                  <>
                    <Spinner /> {JOBS.length - evalPending.length} of {JOBS.length} roles
                  </>
                ) : (
                  'Run the eval live'
                )}
              </Button>
            }
          />
          <StatGrid columns={4} className={styles.evalStats}>
            <StatTile tone="accent" label="Agent precision@10" value={fmt(mean('precision', 'agent'))} note="mean of 3 roles" data-kit="tile-agent" />
            <StatTile label="Keyword search precision@10" value={fmt(mean('precision', 'keyword'))} note="same resumes and notes" data-kit="tile-keyword" />
            <StatTile label="Agent recall@10" value={fmt(mean('recall', 'agent'))} note="share of labelled people found" />
            <StatTile label="Keyword search recall@10" value={fmt(mean('recall', 'keyword'))} note="share of labelled people found" />
          </StatGrid>
          <Card className={styles.evalCard} data-kit="eval-table">
            <CardHead aside={<Pill tone={evalKind === 'example' ? 'neutral' : 'live'}>{evalKind === 'example' ? `Recorded runs, ${EXAMPLE.recorded}` : 'Includes live runs'}</Pill>}>
              <CardTitle>Per role</CardTitle>
            </CardHead>
            <EvalRows rows={evalRows} pending={evalPending} />
            <p className={styles.evalFoot}>
              A = in the agent’s top 10, K = in the keyword search’s top 10. The keyword search counts how many of the recruiter’s
              terms appear in a resume and its notes ({jobById(HERO).keywords.join(', ')} for the first role), then how often.
              It cannot tell “built it in React” from “could not explain React”. Precision@10 tops out at labels ÷ 10 when a role
              has fewer than 10 labelled people.
            </p>
            {evalError && (
              <Notice size="s" kind={hasKey ? 'error' : 'info'} role="status" className={styles.notice}>
                {evalError}
              </Notice>
            )}
          </Card>
        </section>

        <section id="how" className={styles.section} aria-labelledby="how-heading">
          <SectionHead titleId="how-heading" title="How it works" flush />
          <PipelineStrip steps={FLOW} className={styles.flow} />
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}
