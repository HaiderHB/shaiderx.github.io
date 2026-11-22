// Honeycomb demo: "Alert to answer". An SLO burn alert fires on sample telemetry; three agents
// each claim a hypothesis, query the spans with tools that run in code, and publish findings
// to one shared canvas; code scores the proposed culprits and a coordinator writes the answer.
// Live at /demo/honeycomb/ (unlisted, noindex). Without a demo key the page replays a recorded
// run; with one, runs stream from /api/demo/honeycomb/run/. Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, postJson, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  ChoiceChips,
  EmptyState,
  NoteGrid,
  Notice,
  Pill,
  ProbabilityBars,
  RunStatus,
  SectionHead,
  Spinner,
  StatGrid,
  StatTile,
} from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SKILLS, HYPOTHESES } from './agent';
import { SCENARIOS } from './data';
import { EXAMPLE } from './example';
import styles from './Honeycomb.module.css';
import { AgentLane, BurnChart, EvalTable, QueryList, RootCause, RunButton, SkillsEditor } from './panels';
import { emptyRun, foldRun, reduceRun, replayDelay, skillCitations } from './run';
import { alertFor } from './tools';

const RUN_PATH = '/api/demo/honeycomb/run/';
const EVAL_PATH = '/api/demo/honeycomb/eval/';
const HERO = SCENARIOS[0].id;
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my message.';

const NAV = [
  { href: '#canvas', label: 'Investigation' },
  { href: '#skills', label: 'Skills' },
  { href: '#evals', label: 'Evals' },
  { href: '#how', label: 'How it works' },
];

const NOTES = [
  {
    title: 'Models choose, code computes',
    text: 'The LLM picks a tool and its arguments and writes the finding. Every number comes from code running over the spans: group-bys with percentiles, before and after a marker, an attribute diff, a trace.',
  },
  {
    title: 'One canvas, three agents',
    text: 'Each agent sees the others’ query results and findings before its next turn, so a result one agent paid for is not paid for twice. Three queries each, then it must publish.',
  },
  {
    title: 'No model picks the culprit',
    text: 'Every culprit the agents propose, and their combinations, is scored in code: how much of the damage it explains and how much of what it matches is bad. The best score wins; the LLM only writes it up.',
  },
  {
    title: 'Trust checks',
    text: 'Each figure in a finding is traced back to a tool result and flagged if it is not there. A fast decision model re-ranks the hypotheses after every finding, with probabilities you can see.',
  },
];

const RANK_LABELS = { deploy: 'Deploy', tenant: 'Tenant', infra: 'Pod or region' };

const number = value => Number(value || 0).toLocaleString('en-US');

function parseLines(text, from) {
  const lines = text.split('\n');
  const complete = lines.slice(0, -1);
  const events = [];
  for (let index = from; index < complete.length; index++) {
    if (!complete[index].trim()) continue;
    try {
      events.push(JSON.parse(complete[index]));
    } catch {
      // a partial line: skipped, the stream sends whole lines
    }
  }
  return { events, next: complete.length };
}

export default function HoneycombDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [scenarioId, setScenarioId] = useState(HERO);
  const [skills, setSkills] = useState(() => DEFAULT_SKILLS.map(skill => ({ ...skill, on: true })));
  const [run, setRun] = useState(() => reduceRun(emptyRun(), EXAMPLE.run[0]));
  const [kind, setKind] = useState('example'); // example | live
  const [status, setStatus] = useState('replaying'); // idle | replaying | running | done | error
  const [notice, setNotice] = useState('');
  const [bare, setBare] = useState(() => foldRun(EXAMPLE.runNoSkills)); // the no-skills run
  const [bareKind, setBareKind] = useState('example');
  const [bareStatus, setBareStatus] = useState('done');
  const [evalRows, setEvalRows] = useState(EXAMPLE.eval);
  const [evalKind, setEvalKind] = useState('example');
  const [evalPending, setEvalPending] = useState([]);
  const [evalError, setEvalError] = useState('');
  const token = useRef(0);

  const activeSkills = useMemo(
    () => skills.filter(skill => skill.on && skill.text.trim()).map(({ id, title, text }) => ({ id, title, text })),
    [skills]
  );
  const alert = useMemo(() => run.alert || alertFor(scenarioId), [run.alert, scenarioId]);
  const busy = status === 'running' || status === 'replaying';
  const evalBusy = evalPending.length > 0;

  // The recorded run replays once on load, so the page opens on the investigation happening
  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    replay();
    return () => {
      token.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function replay() {
    const mine = ++token.current;
    setScenarioId(HERO);
    setKind('example');
    setNotice('');
    setStatus('replaying');
    let state = emptyRun();
    for (const event of EXAMPLE.run) {
      const wait = replayDelay(event);
      if (wait) await new Promise(resolve => setTimeout(resolve, wait));
      if (token.current !== mine) return;
      state = reduceRun(state, event);
      setRun(state);
    }
    setStatus('done');
  }

  function showResult() {
    token.current += 1;
    setRun(foldRun(EXAMPLE.run));
    setStatus('done');
  }

  function pickScenario(id) {
    if (busy) return;
    token.current += 1;
    setScenarioId(id);
    setNotice('');
    if (id === HERO) {
      setRun(foldRun(EXAMPLE.run));
      setKind('example');
      setStatus('done');
    } else {
      setRun(emptyRun(alertFor(id)));
      setKind('live');
      setStatus('idle');
      if (!hasKey) setNotice(`${PREVIEW_NOTE} The recorded run covers the first incident.`);
    }
  }

  async function stream(body, onState) {
    let state = emptyRun(alertFor(body.scenario));
    onState(state);
    let seen = 0;
    await streamFromApi(RUN_PATH, body, (_, text) => {
      const { events, next } = parseLines(text, seen);
      seen = next;
      if (!events.length) return;
      state = events.reduce(reduceRun, state);
      onState(state);
    });
    return state;
  }

  async function investigate() {
    if (!hasKey) {
      setNotice(`${PREVIEW_NOTE} Replaying the recorded run instead.`);
      replay();
      return;
    }
    const mine = ++token.current;
    setNotice('');
    setKind('live');
    setStatus('running');
    try {
      const final = await stream({ scenario: scenarioId, skills: activeSkills }, state => {
        if (token.current === mine) setRun(state);
      });
      if (token.current !== mine) return;
      setStatus(final.error || !final.summary ? 'error' : 'done');
      if (!final.summary && !final.error) setRun({ ...final, error: 'The run ended early. Try again in a moment.' });
    } catch (error) {
      if (token.current !== mine) return;
      setRun(current => ({ ...current, error: error.message }));
      setStatus('error');
    }
  }

  async function investigateBare() {
    if (!hasKey) {
      setNotice(PREVIEW_NOTE);
      return;
    }
    setBareKind('live');
    setBareStatus('running');
    try {
      const final = await stream({ scenario: scenarioId, skills: [] }, setBare);
      setBareStatus(final.summary ? 'done' : 'error');
    } catch (error) {
      setBare(current => ({ ...current, error: error.message }));
      setBareStatus('error');
    }
  }

  async function runEval() {
    if (!hasKey) {
      setEvalError(`${PREVIEW_NOTE} The table shows the recorded eval.`);
      return;
    }
    setEvalError('');
    setEvalKind('live');
    setEvalRows([]);
    const jobs = SCENARIOS.flatMap(scenario => [
      { scenario: scenario.id, config: 'skills' },
      { scenario: scenario.id, config: 'none' },
    ]);
    setEvalPending(jobs.map(job => `${job.scenario}|${job.config}`));
    const queue = [...jobs];
    const worker = async () => {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        try {
          const row = await postJson(EVAL_PATH, {
            scenario: job.scenario,
            skills: job.config === 'skills' ? activeSkills : [],
            trial: 1,
          });
          setEvalRows(rows => [...rows, { ...row, config: job.config, trial: 1 }]);
        } catch (error) {
          setEvalError(error.message);
        }
        setEvalPending(pending => pending.filter(id => id !== `${job.scenario}|${job.config}`));
      }
    };
    // Two investigations at a time: six agents, under the provider's concurrency cap
    await Promise.all([worker(), worker()]);
  }

  const latestRank = run.ranks[run.ranks.length - 1];
  const prior = run.ranks[0];
  const allCalls = HYPOTHESES.flatMap(item => run.agents[item.id].calls);
  const findings = HYPOTHESES.filter(item => run.agents[item.id].finding).length;
  const cited = useMemo(() => skillCitations(run), [run]);
  const comparable = bare.alert?.scenario === (run.alert?.scenario || scenarioId);

  const tally = config => {
    const rows = evalRows.filter(row => row.config === config);
    const correct = rows.filter(row => row.result === 'correct').length;
    const average = key => (rows.length ? rows.reduce((sum, row) => sum + row[key], 0) / rows.length : 0);
    return {
      runs: rows.length,
      correct,
      queries: average('queries'),
      untraced: rows.reduce((sum, row) => sum + row.untraced, 0),
      figures: rows.reduce((sum, row) => sum + row.figures, 0),
    };
  };
  const withSkills = tally('skills');
  const without = tally('none');
  const trials = Math.max(1, ...evalRows.map(row => row.trial || 1));
  const evalConfigs = [
    { id: 'skills', label: 'With skills' },
    { id: 'none', label: 'Without skills' },
  ];
  const figures = withSkills.figures + without.figures;
  const untraced = withSkills.untraced + without.untraced;
  const tileNote = item => `${item.queries.toFixed(1)} queries per investigation`;

  const summary = run.summary;

  return (
    <DemoLayout
      company="Honeycomb"
      title="From SLO burn alert to root cause, before anyone opens a laptop"
      tagline="An SLO burn alert fires on sample telemetry. Three agents each claim a hypothesis, query the spans with tools that run in code, and publish findings to one shared canvas. Code scores every culprit they propose; a coordinator writes the answer."
      accent="cobalt"
      nav={NAV}
    >
      <div className={styles.page}>
        <section id="canvas" className={styles.section} aria-labelledby="canvas-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Auto-investigation"
            titleId="canvas-heading"
            title="The alert fires. The agents start."
            lede="Sample data, generated in code: two hours of spans from a small e-commerce system with one planted incident and at least one red herring. Unofficial prototype."
          />

          <div className={styles.top}>
            <Card className={styles.alert} data-kit="alert">
              <div className={styles.alertHead}>
                <div>
                  <span className={styles.alertBadge}>
                    <span className={styles.alertDot} /> SLO burn alert · fired {alert.fired_at} UTC
                  </span>
                  <h3 className={styles.alertTitle}>
                    {alert.slo}: burning {alert.burn_rate}× budget
                  </h3>
                  <p className={styles.alertSub}>
                    {alert.target} of checkouts under {number(alert.threshold_ms)} ms. Since {alert.burn_started},{' '}
                    {alert.bad_since_start} of {alert.checkouts_since_start} missed it.
                  </p>
                </div>
                <dl className={styles.alertStats}>
                  <div>
                    <dt>Spans</dt>
                    <dd>{number(alert.dataset.spans)}</dd>
                  </div>
                  <div>
                    <dt>Tenants</dt>
                    <dd>{alert.dataset.tenants}</dd>
                  </div>
                  <div>
                    <dt>Pods</dt>
                    <dd>{alert.dataset.pods}</dd>
                  </div>
                </dl>
              </div>
              <BurnChart alert={alert} />
              <p className={styles.chartLegend}>
                <span data-key="line" /> checkout p99 <span data-key="threshold" /> SLO threshold{' '}
                <span data-key="marker" />
                {alert.markers.map(marker => `deploy ${marker.service} ${marker.build} at ${marker.at}`).join(', ') || 'no deploys'}
              </p>
              <div className={styles.controls}>
                <ChoiceChips
                  label="Planted incident"
                  options={SCENARIOS.map((scenario, index) => ({ value: scenario.id, label: `${index + 1}. ${scenario.title}` }))}
                  value={scenarioId}
                  onChange={pickScenario}
                />
                <div className={styles.runRow}>
                  <RunButton running={busy} onClick={investigate} data-kit="run">
                    {kind === 'example' && scenarioId === HERO && hasKey ? 'Run it live' : 'Run the investigation'}
                  </RunButton>
                  {status === 'replaying' ? (
                    <Button variant="link" onClick={showResult}>
                      Skip to the result
                    </Button>
                  ) : (
                    kind === 'example' && (
                      <Button variant="link" onClick={replay}>
                        Replay the recorded run
                      </Button>
                    )
                  )}
                  <span className={styles.muted}>
                    {hasKey ? 'Live: under a minute, about 1 cent' : 'Preview: recorded run shown'}
                  </span>
                </div>
              </div>
              {notice && (
                <Notice size="s" className={styles.notice} role="status">
                  {notice}
                </Notice>
              )}
            </Card>

            <Card className={styles.rank} data-kit="rank">
              <CardHead
                aside={
                  kind === 'example' ? (
                    <RunStatus state={status === 'replaying' ? 'live' : 'example'}>
                      {status === 'replaying' ? 'Replaying a recorded run' : 'Recorded run'}
                    </RunStatus>
                  ) : (
                    <RunStatus state={status === 'running' ? 'live' : status === 'done' ? 'ended' : 'idle'}>
                      {status === 'running' ? 'Live' : status === 'done' ? (run.cached ? 'Live run, from cache' : 'Live run') : 'Ready'}
                    </RunStatus>
                  )
                }
              >
                <CardTitle>Hypotheses, ranked</CardTitle>
              </CardHead>
              <ProbabilityBars
                options={HYPOTHESES.map(item => ({ value: item.id, label: RANK_LABELS[item.id], tone: 'accent' }))}
                probabilities={latestRank?.probabilities}
                choice={latestRank?.choice}
                pending={!latestRank}
              />
              <p className={styles.rankNote}>
                {latestRank
                  ? latestRank.stage === 'prior'
                    ? 'Prior from the alert and triage alone. It moves as findings land.'
                    : `After ${findings} of 3 findings${latestRank.stage === 'final' ? ' and the scored culprit' : ''}. Started at ${HYPOTHESES.map(
                        item => `${Math.round((prior?.probabilities?.[item.id] || 0) * 100)}%`
                      ).join(' / ')}.`
                  : 'A fast decision model ranks the three hypotheses when the alert fires, then again after every finding.'}
              </p>
              {summary?.agrees === false && (
                <p className={styles.rankWarn}>
                  The ranking disagrees with the culprit the scores chose. Worth a human look before acting.
                </p>
              )}
              {run.triage && (
                <div className={styles.triage}>
                  <span className={styles.triageLabel}>Triage: own-time p99 by service, before → after</span>
                  {run.triage.slice(0, 5).map(row => (
                    <div key={row.service} className={styles.triageRow} data-hot={row.change >= 3 || undefined}>
                      <span>{row.service}</span>
                      <span>
                        {number(row.before_p99)} → {number(row.after_p99)} ms
                      </span>
                      <b>{row.change}×</b>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className={styles.lanes} aria-live="polite">
            {HYPOTHESES.map(item => (
              <AgentLane
                key={item.id}
                id={item.id}
                lane={run.agents[item.id]}
                probability={latestRank?.probabilities?.[item.id]}
                allCalls={allCalls}
              />
            ))}
          </div>

          {summary ? (
            <RootCause summary={summary} candidates={run.candidates} followUp={run.followUp} />
          ) : run.error ? (
            <Notice kind="error" role="alert" className={styles.rootWait}>
              {run.error}
            </Notice>
          ) : (
            <EmptyState size="s" loading={busy} className={styles.rootWait}>
              {run.coordinating
                ? 'Culprits scored. The coordinator is writing the root cause…'
                : run.followUp
                ? 'Best culprit is too broad: code ran a follow-up query inside it…'
                : busy
                ? `Root cause lands here once the three findings are in (${findings} of 3).`
                : 'Run the investigation: the root cause lands here.'}
            </EmptyState>
          )}
        </section>

        <section id="skills" className={styles.section} aria-labelledby="skills-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Skills"
            titleId="skills-heading"
            title="What the team knows, written down once"
            lede="Each skill is a few lines of this team's knowledge that every agent reads. Edit one, switch one off, and run again: the agents cite the skill that prompted a query."
          />
          <div className={styles.skillsGrid}>
            <Card>
              <CardHead aside={<span className={styles.muted}>{activeSkills.length} of {skills.length} on</span>}>
                <CardTitle>Team skills</CardTitle>
              </CardHead>
              <SkillsEditor skills={skills} onChange={setSkills} cited={cited} disabled={busy} />
              <div className={styles.runRow}>
                <RunButton running={busy} onClick={investigate}>
                  Run with these skills
                </RunButton>
                <span className={styles.muted}>{hasKey ? 'Runs on the canvas above' : 'Preview: editing works, runs need the link'}</span>
              </div>
            </Card>
            <Card className={styles.compare} data-kit="compare">
              <CardHead>
                <CardTitle>Same alert, with and without</CardTitle>
              </CardHead>
              <div className={styles.compareGrid}>
                <QueryList
                  run={run}
                  title="With skills"
                  note={<Pill tone={kind === 'example' ? 'neutral' : 'live'}>{kind === 'example' ? 'Recorded' : 'Live'}</Pill>}
                />
                <QueryList
                  run={comparable ? bare : null}
                  title="Without skills"
                  note={
                    comparable ? (
                      <Pill tone={bareKind === 'example' ? 'neutral' : 'live'}>{bareKind === 'example' ? 'Recorded' : 'Live'}</Pill>
                    ) : null
                  }
                  action={
                    <Button variant="secondary" size="s" disabled={bareStatus === 'running' || busy} onClick={investigateBare}>
                      {bareStatus === 'running' ? (
                        <>
                          <Spinner /> Investigating
                        </>
                      ) : (
                        'Run without skills'
                      )}
                    </Button>
                  }
                />
              </div>
            </Card>
          </div>
        </section>

        <section id="evals" className={styles.section} aria-labelledby="evals-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Evals"
            titleId="evals-heading"
            title="Better, or just different?"
            lede="The same investigator runs five planted incidents with the skills and without. Each answer is graded in code against the planted cause: no model grades a model."
            action={
              <Button onClick={runEval} disabled={evalBusy || busy} data-kit="eval-run">
                {evalBusy ? (
                  <>
                    <Spinner /> {10 - evalPending.length} of 10 done
                  </>
                ) : (
                  'Run the eval live'
                )}
              </Button>
            }
          />
          <StatGrid columns={4} className={styles.evalStats}>
            <StatTile
              tone="accent"
              label="With skills: correct root cause"
              value={`${withSkills.correct}/${withSkills.runs}`}
              note={tileNote(withSkills)}
            />
            <StatTile label="Without skills" value={`${without.correct}/${without.runs}`} note={tileNote(without)} />
            <StatTile
              label="Figures traced to tool output"
              value={`${number(figures - untraced)}/${number(figures)}`}
              note="every number in every finding, checked in code"
            />
            <StatTile
              label="Investigations graded"
              value={withSkills.runs + without.runs}
              note={evalKind === 'example' ? `recorded: 5 incidents × 2 configs × ${trials} trials` : 'live: 5 incidents × 2 configs'}
            />
          </StatGrid>
          <Card className={styles.evalCard}>
            <CardHead
              aside={
                <span className={styles.muted}>
                  {hasKey ? '10 investigations, about 4 minutes, about 10 cents' : 'Preview: recorded eval shown'}
                </span>
              }
            >
              <CardTitle>Per incident</CardTitle>
              <Pill tone={evalKind === 'example' ? 'neutral' : 'live'}>{evalKind === 'example' ? 'Recorded eval' : 'Live eval'}</Pill>
            </CardHead>
            <EvalTable scenarios={SCENARIOS} configs={evalConfigs} results={evalRows} pending={evalPending} />
            <p className={styles.evalFoot}>
              Correct means the answer names the right service and every attribute of the planted cause, and blames nothing
              synthetic. Agents are not deterministic, so the recorded eval repeats every run {trials} times (
              {evalRows.length} investigations); the live eval runs each once, with the skills as edited above.
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
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}
