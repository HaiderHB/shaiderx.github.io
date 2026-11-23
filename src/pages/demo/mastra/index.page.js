// Mastra demo: "Traces in, fixes out". A support agent (Mastra-style config: instructions, four
// tools, memory, a step budget) runs a 40-case benchmark; code grades every trace and groups the
// failures by cause; the LLM proposes one config change per cause, shown as a diff; the chosen
// changes make a candidate that re-runs the benchmark, and code gates the rollout on before /
// after scores and regressions. Live at /demo/mastra/ (unlisted, noindex). Without a demo key the
// page replays a recorded run; with one, a 10-case subset runs live. Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  NoteGrid,
  Notice,
  Pill,
  RunStatus,
  SectionHead,
  SegmentedControl,
  Spinner,
  StatGrid,
  StatTile,
} from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyChanges,
  CAUSES,
  clusterResults,
  compareRuns,
  condense,
  summarize,
  workingCalls,
} from './agent';
import { BASELINE_CONFIG, caseById, CASES, SUBSET } from './data';
import { EXAMPLE } from './example';
import styles from './Mastra.module.css';
import { CaseGrid, ClusterList, ConfigView, RolloutView, SuggestionCard, TraceView } from './panels';

const BENCH_PATH = '/api/demo/mastra/bench/';
const SUGGEST_PATH = '/api/demo/mastra/suggest/';
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my message.';
const ALL_IDS = CASES.map(testCase => testCase.id);
const BATCH = 10;

const NAV = [
  { href: '#bench', label: 'Benchmark' },
  { href: '#traces', label: 'Traces' },
  { href: '#fixes', label: 'Suggestions' },
  { href: '#rollout', label: 'Rollout' },
];

const MODES = [
  { value: 'example', label: 'Example run · 40 cases' },
  { value: 'live', label: 'Live · 10 cases' },
];

const NOTES = [
  {
    title: 'Code grades, the LLM proposes',
    text: 'Every case has an expected outcome: the tools to call, their arguments, the facts the answer must state. Code grades each trace and names the failure cause from its spans. The LLM only writes the fix.',
  },
  {
    title: 'Causes from spans, not vibes',
    text: 'A memory span that dropped the message holding the email, a tool call that failed its schema, a run that hit its step budget with a call pending, a date no tool returned. Each cluster is a rule over the trace.',
  },
  {
    title: 'Fixes are typed config changes',
    text: 'Five kinds: an instruction line, a tool description, a parameter schema, the memory window, the step budget. Code checks each one (known tool, regex compiles, numbers in range) before it can be applied.',
  },
  {
    title: 'Better, not just different',
    text: 'The candidate re-runs the same cases. The gate promotes it only if the pass count rises and no case that passed before now fails; cases that still fail show their new cause.',
  },
];

const pick = (results, ids) => Object.fromEntries(ids.filter(id => results[id]).map(id => [id, results[id]]));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function parseLines(text, from) {
  const lines = text.split('\n');
  const complete = lines.slice(0, -1);
  const events = [];
  for (let index = from; index < complete.length; index++) {
    if (!complete[index].trim()) continue;
    try {
      events.push(JSON.parse(complete[index]));
    } catch {
      // whole lines only
    }
  }
  return { events, next: complete.length };
}

const EXAMPLE_CMP = compareRuns(EXAMPLE.baseline, EXAMPLE.candidate);
const EXAMPLE_CLUSTERS = clusterResults(EXAMPLE.baseline);
const recordedSelection = () => Object.fromEntries(EXAMPLE.selected.map(cause => [cause, true]));

function candidateFrom(suggestions, selected) {
  let config = { ...BASELINE_CONFIG, version: 'v2' };
  for (const [cause, on] of Object.entries(selected)) {
    if (on && suggestions[cause]?.changes?.length) config = applyChanges(config, suggestions[cause].changes).config;
  }
  return config;
}

export default function MastraDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [mode, setMode] = useState('example');
  const [base, setBase] = useState({ results: EXAMPLE.baseline, running: [], status: 'done', kind: 'example' });
  const [sugs, setSugs] = useState({ items: EXAMPLE.suggestions, status: 'done', kind: 'example' });
  const [selected, setSelected] = useState(recordedSelection);
  const [cand, setCand] = useState({ results: EXAMPLE.candidate, running: [], status: 'done', kind: 'example' });
  const [activeCause, setActiveCause] = useState(EXAMPLE_CLUSTERS[0]?.cause);
  const [activeCase, setActiveCase] = useState(EXAMPLE_CLUSTERS[0]?.caseIds[0]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const token = useRef(0);

  const caseIds = mode === 'example' ? ALL_IDS : SUBSET;
  const baseResults = useMemo(() => pick(base.results, caseIds), [base.results, caseIds]);
  const clusters = useMemo(() => clusterResults(baseResults), [baseResults]);
  const candidateConfig = useMemo(() => candidateFrom(sugs.items, selected), [sugs.items, selected]);
  const baseDone = base.status === 'done' && Object.keys(baseResults).length === caseIds.length;
  const candDone = cand.status === 'done' && caseIds.every(id => cand.results[id]?.grade);
  const comparison = useMemo(
    () => (baseDone && candDone ? compareRuns(baseResults, pick(cand.results, caseIds)) : null),
    [baseDone, candDone, baseResults, cand.results, caseIds]
  );
  const baseStats = summarize(baseResults);
  const busy = [base.status, sugs.status, cand.status].includes('running');
  const activeCluster = clusters.find(cluster => cluster.cause === activeCause) || clusters[0];
  const shownCase = activeCluster?.caseIds.includes(activeCase) ? activeCase : activeCluster?.caseIds[0];
  const selectedCount = Object.values(selected).filter(Boolean).length;

  // The recorded baseline replays once on load: the grid fills, then the clusters appear
  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    replayBase();
    return () => {
      token.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reveal(source, setter, step = 55) {
    const mine = ++token.current;
    let results = {};
    setter({ results, running: [], status: 'running', kind: 'example' });
    for (const id of ALL_IDS) {
      await sleep(step);
      if (token.current !== mine) return false;
      results = { ...results, [id]: source[id] };
      setter({ results, running: [], status: 'running', kind: 'example' });
    }
    setter({ results, running: [], status: 'done', kind: 'example' });
    return true;
  }

  async function replayBase() {
    setNotice('');
    await reveal(EXAMPLE.baseline, setBase);
  }

  function switchMode(next) {
    if (busy || next === mode) return;
    token.current += 1;
    setMode(next);
    setError('');
    if (next === 'example') {
      setNotice('');
      setBase({ results: EXAMPLE.baseline, running: [], status: 'done', kind: 'example' });
      setSugs({ items: EXAMPLE.suggestions, status: 'done', kind: 'example' });
      setSelected(recordedSelection());
      setCand({ results: EXAMPLE.candidate, running: [], status: 'done', kind: 'example' });
      setActiveCause(EXAMPLE_CLUSTERS[0]?.cause);
      setActiveCase(EXAMPLE_CLUSTERS[0]?.caseIds[0]);
    } else {
      setBase({ results: {}, running: [], status: 'idle', kind: 'live' });
      setSugs({ items: {}, status: 'idle', kind: 'live' });
      setSelected({});
      setCand({ results: {}, running: [], status: 'idle', kind: 'live' });
      setNotice(hasKey ? '' : `${PREVIEW_NOTE} The example run shows a full recorded benchmark.`);
    }
  }

  /** Streams one benchmark run of `ids` with `config`, in batches the route accepts. */
  async function stream(config, ids, setter) {
    const mine = ++token.current;
    let state = { results: {}, running: [], status: 'running', kind: 'live' };
    setter(state);
    for (let start = 0; start < ids.length; start += BATCH) {
      let seen = 0;
      await streamFromApi(BENCH_PATH, { config, cases: ids.slice(start, start + BATCH) }, (_, text) => {
        const { events, next } = parseLines(text, seen);
        seen = next;
        for (const event of events) {
          if (event.t === 'start') state = { ...state, running: [...state.running, event.caseId] };
          if (event.t === 'result' || event.t === 'error')
            state = {
              ...state,
              running: state.running.filter(id => id !== event.caseId),
              results: { ...state.results, [event.caseId]: event.t === 'result' ? { trace: event.trace, grade: event.grade } : { error: event.message } },
            };
        }
        if (token.current === mine) setter(state);
      });
    }
    state = { ...state, running: [], status: 'done' };
    if (token.current === mine) setter(state);
    return state;
  }

  async function runBench() {
    setError('');
    if (mode === 'example') {
      setNotice('');
      await replayBase();
      return;
    }
    if (!hasKey) {
      setNotice(`${PREVIEW_NOTE} Switch to the example run to see a recorded benchmark.`);
      return;
    }
    setNotice('');
    setSugs({ items: {}, status: 'idle', kind: 'live' });
    setSelected({});
    setCand({ results: {}, running: [], status: 'idle', kind: 'live' });
    try {
      const final = await stream(BASELINE_CONFIG, SUBSET, setBase);
      const first = clusterResults(final.results)[0];
      if (first) {
        setActiveCause(first.cause);
        setActiveCase(first.caseIds[0]);
      }
      if (Object.values(final.results).some(result => result.error)) setError('Some cases hit a model error. Run again to retry them (finished cases replay from cache).');
    } catch (err) {
      setError(err.message);
      setBase(current => ({ ...current, running: [], status: 'done' }));
    }
  }

  async function suggestFixes() {
    setError('');
    if (mode === 'example') {
      const mine = ++token.current;
      setNotice('');
      setSugs({ items: {}, status: 'running', kind: 'example' });
      await sleep(700);
      if (token.current !== mine) return;
      setSugs({ items: EXAMPLE.suggestions, status: 'done', kind: 'example' });
      setSelected(recordedSelection());
      return;
    }
    if (!hasKey) {
      setNotice(PREVIEW_NOTE);
      return;
    }
    const mine = ++token.current;
    const payload = clusters.map(cluster => ({
      cause: cluster.cause,
      count: cluster.caseIds.length,
      examples: cluster.caseIds.slice(0, 3).map(id => condense(caseById(id), baseResults[id])),
      working: workingCalls(baseResults, cluster.caseIds),
    }));
    let items = {};
    setSugs({ items, status: 'running', kind: 'live' });
    try {
      let seen = 0;
      await streamFromApi(SUGGEST_PATH, { config: BASELINE_CONFIG, clusters: payload }, (_, text) => {
        const { events, next } = parseLines(text, seen);
        seen = next;
        for (const event of events) {
          if (event.t === 'suggestion') items = { ...items, [event.cause]: event };
          if (event.t === 'error') items = { ...items, [event.cause]: { error: event.message } };
        }
        if (token.current === mine) setSugs({ items, status: 'running', kind: 'live' });
      });
      if (token.current !== mine) return;
      setSugs({ items, status: 'done', kind: 'live' });
      setSelected(Object.fromEntries(Object.entries(items).filter(([, item]) => item.changes?.length).map(([cause]) => [cause, true])));
    } catch (err) {
      setError(err.message);
      setSugs({ items, status: 'done', kind: 'live' });
    }
  }

  async function rollout() {
    setError('');
    if (mode === 'example') {
      const same =
        EXAMPLE.selected.length === selectedCount && EXAMPLE.selected.every(cause => selected[cause]);
      if (!same) {
        setNotice(
          hasKey
            ? 'The recorded rollout applies every suggestion. To try another pick, switch to Live and run the 10-case subset.'
            : `${PREVIEW_NOTE} The recorded rollout applies every suggestion.`
        );
        return;
      }
      setNotice('');
      await reveal(EXAMPLE.candidate, setCand, 45);
      return;
    }
    if (!hasKey) {
      setNotice(PREVIEW_NOTE);
      return;
    }
    try {
      await stream(candidateConfig, SUBSET, setCand);
    } catch (err) {
      setError(err.message);
      setCand(current => ({ ...current, running: [], status: 'done' }));
    }
  }

  function pickCase(id) {
    const cause = baseResults[id]?.grade?.cause;
    if (!cause) return;
    setActiveCause(cause);
    setActiveCase(id);
    document.getElementById('traces')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const hero = (
    <StatGrid columns={1} className={styles.heroStats}>
      <StatTile tone="accent" label="Pass rate, example run" value={`${EXAMPLE_CMP.before.pass} → ${EXAMPLE_CMP.after.pass}`} unit={` of ${ALL_IDS.length}`} note="Five config fixes, one re-run" />
      <div className={styles.heroPair}>
        <StatTile label="Failure causes" value={EXAMPLE_CLUSTERS.length} note="found from traces" />
        <StatTile label="Regressions" value={EXAMPLE_CMP.regressions.length} note="gate: must be 0" />
      </div>
    </StatGrid>
  );

  const runLabel = kind => (kind === 'example' ? `Example run, recorded ${EXAMPLE.recordedOn}` : 'Live');

  return (
    <DemoLayout
      company="Mastra"
      title="Traces in, fixes out"
      tagline="A support agent runs a 40-case benchmark. Code grades every trace and groups the failures by cause; the LLM proposes a config fix for each group; the candidate re-runs the benchmark and ships only if it is better, not just different."
      accent="iris"
      nav={NAV}
      hero={hero}
      wide
    >
      <div className={styles.page}>
        {notice && (
          <Notice size="s" className={styles.topNotice} role="status">
            {notice}
          </Notice>
        )}
        {error && (
          <Notice kind="error" size="s" className={styles.topNotice} role="alert">
            {error}
          </Notice>
        )}

        <section id="bench" className={styles.section} aria-labelledby="bench-heading">
          <SectionHead
            variant="eyebrow"
            step="1"
            kicker="Benchmark"
            titleId="bench-heading"
            title="Run the agent over the dataset"
            lede="An order-support agent for an invented outdoor store, with four tools over sample orders. Each case is a customer thread with an expected outcome."
          />
          <div className={styles.benchGrid}>
            <Card className={styles.configCard}>
              <CardHead aside={<Pill>v1, in production</Pill>}>
                <CardTitle size="s">The agent</CardTitle>
              </CardHead>
              <ConfigView config={BASELINE_CONFIG} />
            </Card>
            <Card className={styles.runCard} data-run>
              <div className={styles.runBar}>
                <SegmentedControl options={MODES} value={mode} onChange={switchMode} label="Run mode" disabled={busy} />
                <Button onClick={runBench} disabled={busy}>
                  {base.status === 'running' ? (
                    <>
                      <Spinner /> Running
                    </>
                  ) : mode === 'example' ? (
                    'Replay the benchmark'
                  ) : (
                    'Run 10 cases live'
                  )}
                </Button>
              </div>
              <RunStatus state={base.kind === 'example' ? 'example' : base.status === 'running' ? 'live' : base.status === 'done' ? 'ended' : 'idle'}>
                {base.kind === 'example'
                  ? runLabel('example')
                  : base.status === 'running'
                  ? 'Live: three cases at a time'
                  : base.status === 'done'
                  ? 'Live run finished'
                  : hasKey
                  ? 'Ten cases, one per kind of question, about 10 cents'
                  : 'Live runs need the private link'}
              </RunStatus>
              <div data-grid>
                <CaseGrid caseIds={caseIds} results={baseResults} running={base.running} active={shownCase} onPick={pickCase} />
              </div>
              <div className={styles.runStats}>
                <span>
                  <strong>
                    {baseStats.pass}/{caseIds.length}
                  </strong>{' '}
                  pass
                </span>
                <span>
                  <strong>{clusters.reduce((sum, cluster) => sum + cluster.caseIds.length, 0)}</strong> fail
                </span>
                <span>
                  <strong>{baseStats.n ? baseStats.tokens.toLocaleString('en-US') : '–'}</strong> tokens per case
                </span>
                <span>
                  <strong>{baseStats.n ? `${(baseStats.ms / 1000).toFixed(1)} s` : '–'}</strong> per case
                </span>
              </div>
              <p className={styles.legend}>
                <span data-state="pass" /> pass <span data-state="fail" /> fail, labelled with its cause <span data-state="idle" /> not run. Tap a failed case to open its trace.
              </p>
            </Card>
          </div>
        </section>

        <section id="traces" className={styles.section} aria-labelledby="traces-heading">
          <SectionHead
            variant="eyebrow"
            step="2"
            kicker="Trace intelligence"
            titleId="traces-heading"
            title="Failures grouped by cause"
            lede="Each failed trace gets one cause, from rules over its spans. Open a cluster to see example traces: model steps, tool calls with their arguments and results, latency and tokens."
          />
          <div className={styles.traceGrid}>
            <div data-clusterlist>
              <ClusterList clusters={clusters} active={activeCluster?.cause} onPick={cause => setActiveCause(cause)} />
            </div>
            <Card className={styles.traceCard} data-tracecard>
              {activeCluster ? (
                <>
                  <CardHead aside={<Pill tone="bad">{CAUSES[activeCluster.cause].short}</Pill>}>
                    <CardTitle size="s">Example traces</CardTitle>
                  </CardHead>
                  <TraceView
                    caseId={shownCase}
                    result={baseResults[shownCase]}
                    siblings={activeCluster.caseIds}
                    onPick={setActiveCase}
                  />
                </>
              ) : (
                <p className={styles.muted}>Run the benchmark to see traces.</p>
              )}
            </Card>
          </div>
        </section>

        <section id="fixes" className={styles.section} aria-labelledby="fixes-heading">
          <SectionHead
            variant="eyebrow"
            step="3"
            kicker="Suggestions"
            titleId="fixes-heading"
            title="One config change per cluster"
            lede="The LLM reads up to three failing traces per cluster, plus calls that worked, and proposes a typed change. Code validates it and shows it as a diff of the agent's config."
            action={
              <Button variant="secondary" onClick={suggestFixes} disabled={busy || !baseDone || !clusters.length}>
                {sugs.status === 'running' ? (
                  <>
                    <Spinner /> Reading traces
                  </>
                ) : (
                  'Suggest fixes'
                )}
              </Button>
            }
          />
          <div className={styles.sugGrid}>
            {clusters.map(cluster => (
              <SuggestionCard
                key={cluster.cause}
                cause={cluster.cause}
                count={cluster.caseIds.length}
                suggestion={sugs.items[cluster.cause]}
                pending={sugs.status === 'running' && !sugs.items[cluster.cause]}
                baseConfig={BASELINE_CONFIG}
                selected={Boolean(selected[cluster.cause])}
                onToggle={() => setSelected(current => ({ ...current, [cluster.cause]: !current[cluster.cause] }))}
              />
            ))}
          </div>
        </section>

        <section id="rollout" className={styles.section} aria-labelledby="rollout-heading">
          <SectionHead
            variant="eyebrow"
            step="4"
            kicker="Rollout"
            titleId="rollout-heading"
            title="Re-run with the candidate, then gate it"
            lede={`The applied changes make config v2. It runs the same ${caseIds.length} cases; scores per cluster and regressions are computed in code.`}
            action={
              <Button onClick={rollout} disabled={busy || !baseDone || !selectedCount}>
                {cand.status === 'running' ? (
                  <>
                    <Spinner /> Re-running
                  </>
                ) : (
                  `Re-run with ${selectedCount} change${selectedCount === 1 ? '' : 's'}`
                )}
              </Button>
            }
          />
          <div className={styles.rolloutGrid}>
            <Card className={styles.candCard} data-cand>
              <CardHead aside={cand.kind === 'example' ? <Pill>{runLabel('example')}</Pill> : cand.status === 'running' ? <Pill tone="live">Live</Pill> : null}>
                <CardTitle size="s">Candidate v2</CardTitle>
              </CardHead>
              <CaseGrid caseIds={caseIds} results={pick(cand.results, caseIds)} running={cand.running} compare={baseResults} label="Candidate results" />
              <ConfigView config={candidateConfig} baseConfig={BASELINE_CONFIG} showDiff />
            </Card>
            {comparison ? (
              <RolloutView comparison={comparison} total={caseIds.length} />
            ) : (
              <Card className={styles.rolloutEmpty}>
                <p className={styles.muted}>
                  {cand.status === 'running' ? 'Re-running the benchmark with the candidate…' : 'Pick suggestions above, then re-run the benchmark to see before and after.'}
                </p>
              </Card>
            )}
          </div>
        </section>

        <section id="how" className={styles.section} aria-labelledby="how-heading">
          <SectionHead titleId="how-heading" title="How it works" flush />
          <NoteGrid className={styles.notes} items={NOTES} />
          <p className={styles.footnote}>
            Unofficial prototype in the spirit of Mastra&rsquo;s agent, tool, memory and tracing model, run by a small runner written for this page. Sample store and orders only. Example runs were recorded through the same routes the live mode uses; the live subset runs 10 cases, three at a time.
          </p>
        </section>
      </div>
    </DemoLayout>
  );
}
