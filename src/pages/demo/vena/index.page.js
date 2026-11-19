// Vena demo: a finance-data context engine prototype. A messy trial-balance export becomes a
// validated trial balance on a standard chart of accounts, with model routing (a fast decision
// model for every row, an LLM second look for the unsure ones), checks in code, provenance and a
// trust score per row, and an eval against a hand-made ground truth.
// Live at /demo/vena/ (unlisted, noindex). Without a demo key the page replays a recorded live run
// of the sample; with one, /api/demo/vena/map/ maps the sample or a pasted CSV live. Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  ChoiceChips,
  Notice,
  NoteGrid,
  Pill,
  RunStatus,
  SectionHead,
  SheetGrid,
  Spinner,
  TextArea,
  srOnly,
} from 'demos/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiPlay, FiRefreshCw } from 'react-icons/fi';
import { COA, PASTE_EXAMPLE, SAMPLE_CSV, SAMPLE_NAME } from './data';
import { MAX_CHARS, MAX_ROWS, THRESHOLD, evaluate, profile, statements, trustFor, validate } from './engine';
import { EXAMPLE_EVENTS, EXAMPLE_META } from './example';
import {
  ChecksCard,
  CleanTrialBalance,
  EvalPanel,
  HeroScore,
  MapTable,
  RowTrace,
  RunTimeline,
  Statements,
} from './panels';
import styles from './Vena.module.css';

const API = '/api/demo/vena/map/';
const NAV = [
  { href: '#map', label: 'Map' },
  { href: '#checks', label: 'Checks' },
  { href: '#statements', label: 'Statements' },
  { href: '#eval', label: 'Eval' },
  { href: '#notes', label: 'Design' },
];
const SOURCES = [
  { value: 'sample', label: 'Sample ERP export' },
  { value: 'paste', label: 'Paste a CSV' },
];
const NOTES = [
  {
    title: 'Route by confidence',
    text: `Every row goes to a fast decision model that answers with probabilities over the chart, in about a tenth of a second. Only rows under ${Math.round(
      THRESHOLD * 100
    )}% go to the LLM, in one batch, with the fast model's top three as candidates and a one-line reason back.`,
  },
  {
    title: 'Models propose, code decides',
    text: 'Balance, duplicates, sign conventions, period and currency are plain code, so a mapping that breaks the books is caught no matter which model made it. An override reruns every check instantly.',
  },
  {
    title: 'Every number has a source',
    text: 'Each mapped row keeps its file line and cells, and its trust score is model confidence times what the checks found on it. A wrong sign or a duplicate pulls it down where a reviewer will see it.',
  },
  {
    title: 'Graded, not guessed',
    text: 'The sample ships with a ground-truth mapping written by hand before any run. The eval scores the whole pipeline and each route, so a threshold or prompt change shows up as a number.',
  },
];

const recordedDay = new Date(`${EXAMPLE_META.recorded}T12:00:00Z`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const emptyRun = (kind = 'example') => ({
  kind,
  status: 'idle', // idle | running | done | error
  entries: {},
  routed: [],
  llmPending: false,
  timing: null,
  threshold: THRESHOLD,
  error: '',
  warn: '',
});

function applyEvent(run, event) {
  switch (event.t) {
    case 'fast':
      return {
        ...run,
        entries: {
          ...run.entries,
          [event.id]: {
            account: event.choice,
            fastChoice: event.choice,
            confidence: event.confidence,
            candidates: event.candidates,
            route: 'fast',
            ms: event.ms,
          },
        },
      };
    case 'route':
      return { ...run, routed: event.ids, llmPending: event.ids.length > 0, threshold: event.threshold ?? run.threshold };
    case 'llm': {
      const entries = { ...run.entries };
      event.results.forEach(result => {
        entries[result.id] = { ...entries[result.id], route: 'llm', account: result.account, reason: result.reason };
      });
      return { ...run, entries, llmPending: false };
    }
    case 'warn':
      return { ...run, warn: event.message };
    case 'done':
      return { ...run, status: 'done', timing: event.timing, llmPending: false };
    case 'error':
      return { ...run, status: 'error', error: event.message, llmPending: false };
    default:
      return run;
  }
}

/** The example's model answers in file order, paced so a person can watch rows land. */
async function replayExample(push, isCancelled) {
  const fast = EXAMPLE_EVENTS.filter(event => event.t === 'fast').sort(
    (a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))
  );
  const rest = EXAMPLE_EVENTS.filter(event => event.t !== 'fast');
  const quick = reducedMotion();
  for (const event of fast) {
    if (isCancelled()) return;
    push(event);
    if (!quick) await sleep(48);
  }
  for (const event of rest) {
    if (isCancelled()) return;
    push(event);
    if (!quick && event.t === 'route' && event.ids.length) await sleep(1300);
  }
}

export default function VenaDemo() {
  const [source, setSource] = useState('sample');
  const [pasted, setPasted] = useState(PASTE_EXAMPLE);
  const [run, setRun] = useState(() => emptyRun('example'));
  const [overrides, setOverrides] = useState({});
  const [openRow, setOpenRow] = useState(null);
  const [hasKey, setHasKey] = useState(false);
  const [notice, setNotice] = useState('');
  const [flash, setFlash] = useState(0);
  const token = useRef(0);

  const csv = source === 'sample' ? SAMPLE_CSV : pasted;
  const isSample = source === 'sample';
  const fileName = isSample ? SAMPLE_NAME : 'pasted.csv';
  const prof = useMemo(() => profile(csv), [csv]);
  const rows = useMemo(() => (prof.ok ? prof.rows : []), [prof]);
  const running = run.status === 'running';
  const mapped = run.status === 'done';

  const start = useCallback(
    async (kind, sourceNow = source) => {
      token.current += 1;
      const mine = token.current;
      const cancelled = () => token.current !== mine;
      const push = event => {
        if (!cancelled()) setRun(current => applyEvent(current, event));
      };
      setOverrides({});
      setNotice('');
      setRun({ ...emptyRun(kind), status: 'running' });
      if (kind === 'example') {
        await sleep(reducedMotion() ? 0 : 450);
        await replayExample(push, cancelled);
        return;
      }
      const text = sourceNow === 'sample' ? SAMPLE_CSV : pasted;
      let buffer = '';
      let finished = false;
      const handle = line => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.t === 'done' || event.t === 'error') finished = true;
        push(event);
      };
      try {
        await streamFromApi(API, { csv: text }, chunk => {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop();
          lines.forEach(handle);
        });
        handle(buffer);
        if (!finished) push({ t: 'error', message: 'The run ended early. Try again.' });
      } catch (error) {
        push({ t: 'error', message: error.message });
      }
    },
    [pasted, source]
  );

  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    start('example', 'sample');
    return () => {
      token.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickSource(value) {
    token.current += 1;
    setSource(value);
    setOpenRow(null);
    setOverrides({});
    setNotice('');
    if (value === 'sample') start('example', 'sample');
    else setRun(emptyRun('live'));
  }

  function runNow() {
    if (!hasKey) {
      if (isSample) {
        start('example', 'sample');
        setNotice('Preview mode: replaying the recorded run. The private link from my message runs it live.');
      } else {
        setNotice('Preview mode: mapping a pasted file needs the private link from my message. The profile above is computed here, free.');
      }
      return;
    }
    if (!prof.ok) {
      setNotice(prof.error);
      return;
    }
    start('live');
  }

  const onOverride = useCallback((id, account) => {
    setOverrides(current => {
      const next = { ...current };
      if (!account) delete next[id];
      else next[id] = account;
      return next;
    });
    setFlash(value => value + 1);
  }, []);

  // --- derived: mapping → checks → trust → statements → eval, all in code ---------------------
  const mapping = useMemo(() => {
    const out = {};
    rows.forEach(row => {
      const entry = run.entries[row.id];
      out[row.id] = overrides[row.id] || entry?.account;
    });
    return out;
  }, [rows, run.entries, overrides]);

  const validation = useMemo(() => (mapped && prof.ok ? validate(prof, mapping) : null), [mapped, prof, mapping]);
  const stmt = useMemo(
    () => (validation ? statements(prof, mapping, validation.excluded) : null),
    [validation, prof, mapping]
  );
  const evalResult = useMemo(
    () => (mapped && prof.ok ? evaluate(prof, run.entries, isSample, overrides) : null),
    [mapped, prof, run.entries, isSample, overrides]
  );

  const view = useMemo(() => {
    const out = {};
    rows.forEach(row => {
      const entry = run.entries[row.id];
      const override = overrides[row.id];
      const llmPending = run.llmPending && run.routed.includes(row.id);
      const issues = validation?.rowIssues[row.id] || [];
      const excluded = validation?.excluded.has(row.id);
      const parts = validation && entry ? trustFor({ ...entry, override: Boolean(override) }, issues, excluded) : null;
      out[row.id] = {
        entry: entry && { ...entry, override: Boolean(override) },
        account: override || entry?.account,
        confidence: override ? 1 : entry?.confidence ?? 0,
        override: Boolean(override),
        llmPending,
        excluded,
        fail: issues.some(issue => issue.status === 'fail'),
        issues,
        trust: parts?.score,
        trustParts: parts,
      };
    });
    return out;
  }, [rows, run.entries, run.llmPending, run.routed, overrides, validation]);

  const counts = useMemo(() => {
    const mappedCount = rows.filter(row => run.entries[row.id]).length;
    const routedCount = run.routed.filter(id => run.entries[id]).length;
    return { rows: rows.length, mapped: mappedCount, fast: mappedCount - routedCount, llm: run.routed.length };
  }, [rows, run.entries, run.routed]);
  const fastCount = counts.fast;

  const trustStats = useMemo(() => {
    if (!validation) return null;
    const scored = rows.filter(row => !validation.excluded.has(row.id) && view[row.id].trust != null);
    if (!scored.length) return null;
    const lowest = scored.reduce((low, row) => (view[row.id].trust < view[low.id].trust ? row : low), scored[0]);
    const average = Math.round(scored.reduce((sum, row) => sum + view[row.id].trust, 0) / scored.length);
    return { average, lowest, lowestScore: view[lowest.id].trust };
  }, [validation, rows, view]);

  const overriddenAccounts = useMemo(
    () => new Set(Object.values(overrides).concat(Object.keys(overrides).map(id => run.entries[id]?.account))),
    [overrides, run.entries]
  );

  const stages = useMemo(() => {
    const checks = validation?.checks || [];
    const status = done => (done ? 'done' : running ? 'running' : 'pending');
    const passCount = checks.filter(check => check.status === 'pass').length;
    const fixedCount = checks.filter(check => check.status === 'fixed').length;
    const failCount = checks.filter(check => check.status === 'fail').length;
    const columnNames = prof.ok
      ? Object.entries(prof.columns)
          .filter(([, index]) => index != null)
          .sort((a, b) => a[1] - b[1])
          .map(([key, index]) => `${key} ${String.fromCharCode(65 + index)}`)
          .join(', ')
      : '';
    return [
      {
        id: 'profile',
        title: 'Profile',
        status: prof.ok ? 'done' : 'error',
        tag: prof.ok ? `${prof.rowCount} rows` : 'unreadable',
        text: prof.ok
          ? `Header on line ${prof.headerLine}; columns ${columnNames}. Period ${prof.period}, ${prof.currency}.${prof.truncated ? ` Clipped at ${MAX_ROWS} rows.` : ''}`
          : prof.error,
      },
      {
        id: 'map',
        title: 'Map to the chart',
        status: run.status === 'idle' ? 'pending' : run.status === 'error' ? 'error' : status(mapped),
        tag: run.status === 'idle' ? null : `${fastCount} fast · ${run.routed.length} LLM`,
        ms: run.timing?.totalMs,
        text:
          run.status === 'idle'
            ? 'Waiting for a run.'
            : run.llmPending
            ? `${run.routed.length} row${run.routed.length === 1 ? '' : 's'} under ${Math.round(run.threshold * 100)}% confidence: the LLM is taking a second look.`
            : `${fastCount} rows by the fast model, ${run.routed.length} sent to the LLM for a second look.`,
      },
      {
        id: 'validate',
        title: 'Validate in code',
        status: run.status === 'idle' ? 'pending' : status(Boolean(validation)),
        tag: validation ? `${checks.length} checks` : null,
        text: validation
          ? `${passCount} pass${fixedCount ? `, ${fixedCount} fixed` : ''}${failCount ? `, ${failCount} failing` : ''}. ${
              validation.excluded.size ? `Duplicate line ${[...validation.excluded].map(id => id.slice(1)).join(', ')} left out.` : ''
            }`
          : 'Balance, duplicates, signs, period, currency.',
      },
      {
        id: 'trust',
        title: 'Provenance and trust',
        status: run.status === 'idle' ? 'pending' : status(Boolean(trustStats)),
        tag: trustStats ? `avg ${trustStats.average}` : null,
        text: trustStats
          ? `Every row links to its source cells. Lowest trust ${trustStats.lowestScore}: line ${trustStats.lowest.line}, ${trustStats.lowest.name}.`
          : 'Source cell and a trust score per row.',
      },
      {
        id: 'eval',
        title: 'Eval',
        status: run.status === 'idle' ? 'pending' : status(mapped),
        tag: evalResult ? `${evalResult.correct}/${evalResult.total}` : null,
        text: evalResult
          ? `${evalResult.correct} of ${evalResult.total} rows match the hand-made ground truth.`
          : mapped
          ? 'No ground truth for a pasted file; timing and cost only.'
          : 'Against a hand-made ground truth.',
      },
    ];
  }, [prof, run, mapped, running, validation, trustStats, evalResult, fastCount]);

  const costUnits = prof.ok ? Math.ceil(prof.rowCount / 15) + 1 : 0;
  const overrideCount = Object.keys(overrides).length;

  const runLabel =
    run.kind === 'example'
      ? `Example run · model answers recorded live ${recordedDay}, replayed`
      : running
      ? 'Live run'
      : run.status === 'done'
      ? 'Live run · finished'
      : run.status === 'error'
      ? 'Live run · stopped'
      : 'Ready';

  return (
    <DemoLayout
      company="Vena"
      title="Messy ERP export in. Validated books out."
      tagline="A finance-data context engine, prototyped: a fast decision model maps every trial-balance row onto a standard chart of accounts, unsure rows go to an LLM for a second look, code checks that the books still balance, and every number keeps a link to the cell it came from."
      accent="iris"
      nav={NAV}
      wide
      hero={
        <HeroScore
          evalResult={evalResult}
          counts={counts}
          balanced={validation ? validation.checks.find(check => check.id === 'balance')?.status === 'pass' : null}
          running={running}
          isSample={isSample}
        />
      }
    >
      <div className={styles.page}>
        <section id="map" className={styles.section} aria-labelledby="map-heading">
          <h2 id="map-heading" className={srOnly}>
            Map the trial balance
          </h2>
          <div className={styles.toolbar}>
            <ChoiceChips label="Source file" options={SOURCES} value={source} onChange={pickSource} />
            <RunStatus state={running ? (run.kind === 'live' ? 'live' : 'example') : run.kind === 'example' ? 'example' : 'ended'}>
              {runLabel}
            </RunStatus>
            <div className={styles.toolbarActions}>
              {isSample && (
                <Button variant="secondary" size="s" onClick={() => start('example', 'sample')} disabled={running}>
                  <FiRefreshCw aria-hidden /> Replay
                </Button>
              )}
              <Button size="s" onClick={runNow} disabled={running || !prof.ok}>
                {running && run.kind === 'live' ? (
                  <>
                    <Spinner /> Mapping
                  </>
                ) : (
                  <>
                    <FiPlay aria-hidden /> {isSample ? 'Run live' : 'Map this file'}
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
          {run.error && (
            <Notice kind="error" size="s" className={styles.notice} role="alert">
              {run.error}
            </Notice>
          )}
          {run.warn && (
            <Notice size="s" className={styles.notice} role="status">
              {run.warn}
            </Notice>
          )}

          <div className={styles.mapGrid}>
            <div className={styles.side}>
              <Card className={styles.timelineCard}>
                <CardHead aside={<Pill>{isSample ? SAMPLE_NAME : 'pasted.csv'}</Pill>}>
                  <CardTitle>Run</CardTitle>
                </CardHead>
                <RunTimeline stages={stages} />
              </Card>
              <Card className={styles.fileCard}>
                <CardHead aside={<span className={styles.muted}>{isSample ? 'as the ERP wrote it' : `up to ${MAX_ROWS} rows`}</span>}>
                  <CardTitle>{isSample ? 'The export' : 'Your CSV'}</CardTitle>
                </CardHead>
                {isSample ? (
                  <SheetGrid
                    className={styles.fileSheet}
                    rows={prof.fileRows}
                    struck={validation ? [...validation.excluded].map(id => Number(id.slice(1))) : []}
                    activeLine={openRow ? Number(openRow.slice(1)) : undefined}
                    numeric={[3, 4]}
                    label="The raw trial-balance export"
                  />
                ) : (
                  <>
                    <label className={srOnly} htmlFor="vena-csv">
                      CSV to map
                    </label>
                    <TextArea
                      id="vena-csv"
                      code
                      className={styles.paste}
                      value={pasted}
                      maxLength={MAX_CHARS}
                      spellCheck={false}
                      onChange={event => {
                        setPasted(event.target.value);
                        setRun(emptyRun('live'));
                        setOverrides({});
                      }}
                    />
                    <p className={styles.muted}>
                      Any export with an account name and either debit / credit columns or one signed balance column.
                      Profiled here as you type; mapping runs live with the private link.
                    </p>
                  </>
                )}
              </Card>
            </div>

            <Card className={styles.mapCard}>
              <CardHead
                aside={
                  <span className={styles.legend}>
                    <span data-route="fast">Fast model</span>
                    <span data-route="llm">LLM second look</span>
                  </span>
                }
              >
                <CardTitle>Every row, on the chart of accounts</CardTitle>
              </CardHead>
              <p className={styles.hint}>Click a row to see the cells it came from, why it landed there, and to override it.</p>
              {prof.ok ? (
                <MapTable
                  rows={rows}
                  view={view}
                  openRow={openRow}
                  onToggle={id => setOpenRow(current => (current === id ? null : id))}
                  renderDetail={row => (
                    <RowTrace
                      row={row}
                      prof={prof}
                      fileName={fileName}
                      item={view[row.id]}
                      issues={view[row.id].issues}
                      onOverride={onOverride}
                      threshold={run.threshold}
                    />
                  )}
                />
              ) : (
                <Notice kind="error" size="s">
                  {prof.error}
                </Notice>
              )}
            </Card>
          </div>
        </section>

        <section id="checks" className={styles.section} aria-labelledby="checks-heading">
          <SectionHead
            titleId="checks-heading"
            title="Checks and statements"
            lede="The models only propose. These run in code on every change, including your overrides."
          />
          <div className={styles.checksGrid}>
            <ChecksCard validation={validation} pending={running} />
            <div id="statements" className={styles.statementsWrap}>
              {stmt ? (
                <Statements stmt={stmt} currency={prof.currency} changed={flash ? String(flash) : undefined} key={flash} />
              ) : (
                <Card>
                  <p className={styles.muted}>The balance sheet and P&amp;L build once the rows are mapped.</p>
                </Card>
              )}
            </div>
          </div>
          {stmt && <CleanTrialBalance stmt={stmt} overridden={overriddenAccounts} />}
        </section>

        <section id="eval" className={styles.section} aria-labelledby="eval-heading">
          <SectionHead
            titleId="eval-heading"
            title="Eval against ground truth"
            lede="Accuracy for the whole run and for each route, what the second look changed, and what the run cost."
          />
          {mapped ? (
            <EvalPanel
              evalResult={evalResult}
              entries={run.entries}
              rows={rows}
              timing={run.timing}
              kind={run.kind}
              overrideCount={overrideCount}
              costUnits={costUnits}
            />
          ) : (
            <Card>
              <p className={styles.muted}>Shows once the mapping run finishes.</p>
            </Card>
          )}
        </section>

        <section id="notes" className={styles.section} aria-labelledby="notes-heading">
          <SectionHead titleId="notes-heading" title="Design choices" flush />
          <NoteGrid className={styles.notes} items={NOTES} />
          <p className={styles.footnote}>
            Sample data only: {SAMPLE_NAME} is a fictional SaaS company&apos;s October 2026 trial balance with planted traps (a
            duplicated row, two contra accounts, an accumulated deficit, an ambiguous &quot;Consulting&quot; line). Accounts used:{' '}
            {new Set(Object.values(mapping).filter(Boolean)).size} of {COA.length} chart lines.
          </p>
        </section>
      </div>
    </DemoLayout>
  );
}
