// Presentational pieces of the Honeycomb demo page: the alert chart, agent lanes, finding
// cards, the candidate scores, the root-cause card, the skills editor and the eval table.
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  Dot,
  JsonView,
  MiniLabel,
  Pill,
  Spinner,
  StatusIcon,
  Tag,
  TextArea,
  srOnly,
} from 'demos/ui';
import { HYPOTHESES } from './agent';
import styles from './Honeycomb.module.css';

const hypothesisById = id => HYPOTHESES.find(item => item.id === id);
const number = value => Number(value || 0).toLocaleString('en-US');
const VERDICTS = {
  supported: { label: 'Supported', tone: 'ok' },
  ruled_out: { label: 'Ruled out', tone: 'bad' },
  inconclusive: { label: 'Inconclusive', tone: 'warn' },
};

/** p99 of checkout over the two hours: threshold line, deploy markers, the burn shaded. */
export function BurnChart({ alert }) {
  const width = 640;
  const height = 150;
  const pad = { left: 44, right: 10, top: 12, bottom: 22 };
  const series = alert.series;
  const max = Math.max(alert.threshold_ms * 1.6, ...series) * 1.05;
  const x = index => pad.left + (index / (series.length - 1)) * (width - pad.left - pad.right);
  const xMinute = minute => x(minute / 2);
  const y = value => pad.top + (1 - value / max) * (height - pad.top - pad.bottom);
  const path = series.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const ticks = [0, alert.threshold_ms, Math.round(max / 1000) * 1000].filter((value, index, list) => list.indexOf(value) === index && value <= max);
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Checkout p99 over two hours. It crosses the ${number(alert.threshold_ms)} ms threshold at ${alert.burn_started}.`}
    >
      <rect
        className={styles.chartBurn}
        x={xMinute(alert.burn_start_minute)}
        y={pad.top}
        width={width - pad.right - xMinute(alert.burn_start_minute)}
        height={height - pad.top - pad.bottom}
      />
      {ticks.map(value => (
        <g key={value}>
          <line className={styles.chartGrid} x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} />
          <text className={styles.chartTick} x={pad.left - 6} y={y(value) + 3.5} textAnchor="end">
            {value >= 1000 ? `${value / 1000}s` : value}
          </text>
        </g>
      ))}
      <line
        className={styles.chartThreshold}
        x1={pad.left}
        x2={width - pad.right}
        y1={y(alert.threshold_ms)}
        y2={y(alert.threshold_ms)}
      />
      {alert.markers.map(marker => (
        <g key={marker.id}>
          <line className={styles.chartMarker} x1={xMinute(marker.minute)} x2={xMinute(marker.minute)} y1={pad.top} y2={height - pad.bottom} />
          <path className={styles.chartMarkerHead} d={`M${xMinute(marker.minute) - 4},${pad.top} h8 l-4,6 z`} />
        </g>
      ))}
      <path className={styles.chartLine} d={path} />
      <text className={styles.chartTick} x={pad.left} y={height - 6}>
        12:21
      </text>
      <text className={styles.chartTick} x={xMinute(alert.burn_start_minute)} y={height - 6} textAnchor="middle">
        {alert.burn_started}
      </text>
      <text className={styles.chartTick} x={width - pad.right} y={height - 6} textAnchor="end">
        {alert.fired_at}
      </text>
    </svg>
  );
}

function argChips(args) {
  const chips = [];
  const pairs = filter =>
    Object.entries(filter || {})
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join('|') : value}`)
      .join(', ');
  if (args.group_by) chips.push(['group by', [].concat(args.group_by).join(', ')]);
  if (args.where) chips.push(['where', pairs(args.where)]);
  if (args.exclude) chips.push(['exclude', pairs(args.exclude)]);
  if (args.attributes) chips.push(['attributes', [].concat(args.attributes).join(', ')]);
  if (args.pivot) chips.push(['pivot', args.pivot]);
  if (args.slower_than_ms) chips.push(['slower than', `${args.slower_than_ms} ms`]);
  if (args.window && args.window !== 'incident') chips.push(['window', args.window]);
  if (args.prefix) chips.push(['prefix', args.prefix]);
  return chips;
}

/** "S2: check flags, building on T1" with the skill and result ids as chips. */
function Because({ text }) {
  const parts = String(text || '').split(/\b(S\d|[DTI]\d)\b/);
  return (
    <span className={styles.because}>
      {parts.map((part, index) =>
        /^S\d$/.test(part) ? (
          <span key={index} className={styles.skillRef} title="A team skill prompted this query">
            {part}
          </span>
        ) : /^[DTI]\d$/.test(part) ? (
          <span key={index} className={styles.callRef} title="Builds on another agent's result">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}

function CallRow({ call }) {
  const failed = Boolean(call.result?.error);
  return (
    <li className={styles.call} data-kit-call={call.id}>
      <details>
        <summary>
          <span className={styles.callId}>{call.id}</span>
          <span className={styles.callMain}>
            <span className={styles.callName}>
              <code>{call.name}</code>
              {argChips(call.args).map(([label, value]) => (
                <span key={label} className={styles.arg}>
                  <span>{label}</span> {value}
                </span>
              ))}
            </span>
            {call.because && <Because text={call.because} />}
            <span className={styles.callResult} data-pending={!call.result || undefined} data-failed={failed || undefined}>
              {call.result ? (
                <>
                  <Dot tone={failed ? 'warn' : 'ok'} /> {call.summary}
                </>
              ) : (
                <>
                  <Spinner /> running over the spans
                </>
              )}
            </span>
          </span>
        </summary>
        {call.result && (
          <div className={styles.callDetail}>
            <MiniLabel>Result, computed in code{call.ms != null ? ` in ${call.ms} ms` : ''}</MiniLabel>
            <JsonView value={call.result} tall />
          </div>
        )}
      </details>
    </li>
  );
}

/** The top rows of the tool result a finding cites, as small bars. */
function Evidence({ call }) {
  if (!call?.result || call.result.error) return null;
  const { name, result } = call;
  let rows = [];
  if (name === 'attribute_diff') {
    rows = (result.top_differences || []).slice(0, 3).map(item => ({
      label: `${item.attribute} = ${item.value}`,
      value: `${item.slow_pct}% of slow vs ${item.baseline_pct}%`,
      bar: item.slow_pct / 100,
      ghost: item.baseline_pct / 100,
    }));
  } else if (name === 'query') {
    const max = Math.max(...result.groups.map(group => group.p99_ms), 1);
    rows = result.groups.slice(0, 3).map(group => ({
      label: group.group,
      value: `p99 ${number(group.p99_ms)} ms`,
      bar: group.p99_ms / max,
    }));
  } else if (name === 'before_after') {
    const max = Math.max(...result.groups.map(group => group.after.p99_ms || 0), 1);
    rows = result.groups
      .filter(group => group.after.p99_ms != null)
      .slice(0, 3)
      .map(group => ({
        label: group.group,
        value: `${group.before.p99_ms != null ? number(group.before.p99_ms) : 'new'} → ${number(group.after.p99_ms)} ms`,
        bar: group.after.p99_ms / max,
        ghost: group.before.p99_ms != null ? group.before.p99_ms / max : undefined,
      }));
  } else if (name === 'get_trace') {
    const max = Math.max(...result.spans.map(span => span.self_ms), 1);
    rows = [...result.spans]
      .sort((a, b) => b.self_ms - a.self_ms)
      .slice(0, 3)
      .map(span => ({ label: `${span.service} ${span.build}`, value: `${number(span.self_ms)} ms own time`, bar: span.self_ms / max }));
  }
  if (!rows.length) return null;
  return (
    <div className={styles.evidence}>
      <MiniLabel>
        Evidence {call.id} · {name}
      </MiniLabel>
      {rows.map(row => (
        <div key={row.label} className={styles.evidenceRow}>
          <span className={styles.evidenceLabel} title={row.label}>
            {row.label}
          </span>
          <span className={styles.evidenceTrack}>
            {row.ghost != null && <span className={styles.evidenceGhost} style={{ width: `${Math.max(1, row.ghost * 100)}%` }} />}
            <span className={styles.evidenceFill} style={{ width: `${Math.max(2, row.bar * 100)}%` }} />
          </span>
          <span className={styles.evidenceValue}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function Grounded({ check }) {
  if (!check || !check.checked) return null;
  const ok = check.missing.length === 0;
  return (
    <span className={styles.grounded} data-ok={ok || undefined}>
      <StatusIcon status={ok ? 'pass' : 'warn'} />
      {ok
        ? `${check.traced} of ${check.checked} figures traced to tool output`
        : `${check.missing.length} figure${check.missing.length > 1 ? 's' : ''} not in any tool output: ${check.missing.join(', ')}`}
    </span>
  );
}

/** One agent: its hypothesis, the queries it ran and the finding it published. */
export function AgentLane({ id, lane, probability, allCalls }) {
  const hypothesis = hypothesisById(id);
  const finding = lane.finding;
  const verdict = finding && VERDICTS[finding.verdict];
  const cited = finding && allCalls.find(call => call.id === finding.evidence);
  return (
    <Card className={styles.lane} data-kit-lane={id} data-verdict={finding?.verdict}>
      <div className={styles.laneHead} data-kit-lanehead={id}>
        <span className={styles.laneLetter}>{hypothesis.letter}</span>
        <div className={styles.laneTitle}>
          <h3>{hypothesis.title}</h3>
          <span>
            {probability != null ? `${Math.round(probability * 100)}% likely` : 'not ranked yet'}
          </span>
        </div>
        {verdict ? (
          <Tag tone={verdict.tone}>{verdict.label}</Tag>
        ) : lane.claimed ? (
          <Pill tone="live">Investigating</Pill>
        ) : (
          <Pill>Waiting</Pill>
        )}
      </div>
      {lane.calls.length > 0 ? (
        <ul className={styles.calls} aria-label={`${hypothesis.title} queries`}>
          {lane.calls.map(call => (
            <CallRow key={call.id} call={call} />
          ))}
        </ul>
      ) : (
        <p className={styles.laneEmpty}>{lane.claimed ? 'Choosing a first query…' : 'Claims this hypothesis when the alert fires.'}</p>
      )}
      {finding && (
        <div className={styles.finding} data-verdict={finding.verdict} data-kit-finding={id}>
          <MiniLabel>Finding {finding.id}, published to the canvas</MiniLabel>
          <p className={styles.findingHead}>{finding.headline}</p>
          {finding.detail && <p className={styles.findingDetail}>{finding.detail}</p>}
          <Evidence call={cited} />
          <Grounded check={finding.grounded} />
        </div>
      )}
    </Card>
  );
}

const culpritText = culprit =>
  Object.entries(culprit || {})
    .map(([key, value]) => `${key} = ${value}`)
    .join('  ·  ');

/** Every proposed culprit, scored in code: coverage of the bad checkouts and precision. */
export function Candidates({ candidates }) {
  if (!candidates?.length) return null;
  return (
    <div className={styles.candidates} data-kit="candidates">
      <div className={styles.candidateHead}>
        <span>Culprit proposed by the agents</span>
        <span>Explains bad checkouts</span>
        <span>Of what it matches, bad</span>
      </div>
      {candidates.map((item, index) => (
        <div key={`${item.from}-${index}`} className={styles.candidate} data-chosen={index === 0 || undefined}>
          <span className={styles.candidateName}>
            <code>{item.service}</code>
            <span>{culpritText(item.culprit)}</span>
            {index === 0 && <Tag tone="ok">Chosen</Tag>}
          </span>
          <span className={styles.scoreCell}>
            <span className={styles.scoreTrack}>
              <span style={{ width: `${item.coverage}%` }} />
            </span>
            <b>{item.coverage}%</b>
          </span>
          <span className={styles.scoreCell}>
            <span className={styles.scoreTrack}>
              <span style={{ width: `${item.precision}%` }} />
            </span>
            <b>{item.precision}%</b>
          </span>
        </div>
      ))}
    </div>
  );
}

/** An exemplar trace as indented duration bars; the culprit's span stands out. */
export function TraceView({ trace, service }) {
  if (!trace) return null;
  const total = Math.max(trace.duration_ms, 1);
  return (
    <div className={styles.trace}>
      <MiniLabel>
        Exemplar trace {trace.trace_id} · {trace.at} · {number(trace.duration_ms)} ms
      </MiniLabel>
      {trace.spans.map((span, index) => (
        <div key={index} className={styles.traceRow} data-hot={span.service === service || undefined}>
          <span className={styles.traceName} style={{ paddingLeft: `${span.depth * 12}px` }}>
            {span.service}
            <em>{span.build}</em>
          </span>
          <span className={styles.traceTrack}>
            <span style={{ width: `${Math.max(1.5, (span.duration_ms / total) * 100)}%` }} />
          </span>
          <span className={styles.traceMs}>{number(span.duration_ms)} ms</span>
        </div>
      ))}
    </div>
  );
}

const GRADE = {
  correct: { label: 'Matches the planted cause', status: 'pass' },
  partial: { label: 'Partly right: misses part of the planted cause', status: 'warn' },
  wrong: { label: 'Does not match the planted cause', status: 'fail' },
};

/** The coordinator's answer with the code-side proof. */
export function RootCause({ summary, candidates, followUp }) {
  const { answer, proof, confidence, totals, grade, exemplar, grounded } = summary;
  const hypothesis = hypothesisById(answer.hypothesis);
  const maxP99 = Math.max(proof.matching.p99_ms, proof.everything_else.p99_ms, 1);
  const graded = GRADE[grade.result];
  return (
    <Card tone="tint" className={styles.root} data-kit="root-cause">
      <CardHead
        aside={
          <span className={styles.rootMeta}>
            {totals.queries} queries · {(totals.ms / 1000).toFixed(0)} s · {number(totals.spans)} spans
          </span>
        }
      >
        <CardTitle>Root cause</CardTitle>
        <Pill tone="ok">{hypothesis.title}</Pill>
        {confidence != null && (
          <Pill tone={confidence < 0.6 ? 'warn' : 'neutral'}>
            Evidence score {Math.round(confidence * 100)}/100{confidence < 0.6 ? ': a lead, not an answer' : ''}
          </Pill>
        )}
      </CardHead>
      <div className={styles.rootGrid}>
        <div data-kit="root-left">
          <p className={styles.rootStatement}>{answer.statement}</p>
          <div className={styles.culprit}>
            <code>{answer.service}</code>
            {Object.entries(answer.culprit).map(([key, value]) => (
              <code key={key}>
                {key} = {value}
              </code>
            ))}
          </div>
          <dl className={styles.rootFacts}>
            <div>
              <dt>Next step</dt>
              <dd>{answer.next_step}</dd>
            </div>
            <div>
              <dt>Ruled out</dt>
              <dd>{answer.ruled_out}</dd>
            </div>
          </dl>
          <div className={styles.rootChecks}>
            <Grounded check={grounded} />
            <span className={styles.grounded} data-ok={grade.result === 'correct' || undefined}>
              <StatusIcon status={graded.status} />
              {graded.label}
            </span>
          </div>
        </div>
        <div className={styles.proof} data-kit="root-proof">
          <div className={styles.proofTiles}>
            <div>
              <b>{proof.explained_pct}%</b>
              <span>
                of bad checkouts explained ({proof.bad_explained} of {proof.bad_checkouts})
              </span>
            </div>
            <div>
              <b>{proof.matching.bad_pct}%</b>
              <span>of the {proof.matching.checkouts} checkouts it matches are bad</span>
            </div>
          </div>
          <MiniLabel>Checkout p99 since the burn began, computed in code</MiniLabel>
          {[
            ['Matches the culprit', proof.matching, true],
            ['Everything else', proof.everything_else, false],
          ].map(([label, stats, hot]) => (
            <div key={label} className={styles.proofRow} data-hot={hot || undefined}>
              <span>{label}</span>
              <span className={styles.proofTrack}>
                <span style={{ width: `${Math.max(2, (stats.p99_ms / maxP99) * 100)}%` }} />
              </span>
              <b>{number(stats.p99_ms)} ms</b>
            </div>
          ))}
          <TraceView trace={exemplar} service={answer.service} />
        </div>
      </div>
      <details className={styles.rootMore}>
        <summary>
          How the culprit was chosen: top {candidates?.length || 0} candidates, scored in code
          {followUp ? ', after one follow-up query' : ''}
        </summary>
        {followUp && (
          <ul className={styles.calls} aria-label="Coordinator follow-up">
            <CallRow call={followUp} />
          </ul>
        )}
        <Candidates candidates={candidates} />
      </details>
    </Card>
  );
}

/** Editable team skills, each with how often this run cited it. */
export function SkillsEditor({ skills, onChange, cited, disabled }) {
  const update = (id, patch) => onChange(skills.map(skill => (skill.id === id ? { ...skill, ...patch } : skill)));
  return (
    <ul className={styles.skills}>
      {skills.map(skill => (
        <li key={skill.id} className={styles.skill} data-off={!skill.on || undefined} data-kit-skill={skill.id}>
          <div className={styles.skillHead}>
            <label className={styles.skillToggle}>
              <input
                type="checkbox"
                checked={skill.on}
                disabled={disabled}
                onChange={event => update(skill.id, { on: event.target.checked })}
              />
              <span className={styles.skillId}>{skill.id}</span>
              <span className={styles.skillTitle}>{skill.title}</span>
            </label>
            <span className={styles.skillCited} data-zero={!cited[skill.id] || undefined}>
              {cited[skill.id] ? `cited ${cited[skill.id]}× in this run` : 'not cited in this run'}
            </span>
          </div>
          <label className={srOnly} htmlFor={`skill-${skill.id}`}>
            {skill.title}
          </label>
          <TextArea
            id={`skill-${skill.id}`}
            className={styles.skillText}
            value={skill.text}
            maxLength={320}
            rows={5}
            disabled={disabled || !skill.on}
            onChange={event => update(skill.id, { text: event.target.value })}
          />
        </li>
      ))}
    </ul>
  );
}

/** The queries of one run as a compact list, for the with / without comparison. */
export function QueryList({ run, title, note, action }) {
  const calls = run ? HYPOTHESES.flatMap(item => run.agents[item.id].calls) : [];
  const summary = run?.summary;
  const graded = summary && GRADE[summary.grade.result];
  return (
    <div className={styles.compareCol} data-kit-compare={title}>
      <div className={styles.compareHead}>
        <h3>{title}</h3>
        {note}
      </div>
      {calls.length ? (
        <ul className={styles.compareCalls}>
          {calls.map(call => (
            <li key={call.id}>
              <span className={styles.callId}>{call.id}</span>
              <span>
                <code>{call.name}</code>
                {argChips(call.args)
                  .filter(([label]) => label === 'exclude' || label === 'attributes')
                  .map(([label, value]) => (
                    <span key={label} className={styles.arg} data-strong>
                      <span>{label}</span> {value}
                    </span>
                  ))}
                <Because text={call.because} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.laneEmpty}>No run yet.</p>
      )}
      {summary && (
        <div className={styles.compareResult}>
          <span className={styles.grounded} data-ok={summary.grade.result === 'correct' || undefined}>
            <StatusIcon status={graded.status} />
            {graded.label}
          </span>
          <code>
            {summary.answer.service} · {culpritText(summary.answer.culprit)}
          </code>
          <span className={styles.compareMeta}>
            {summary.totals.queries} queries · explains {summary.proof.explained_pct}% of bad checkouts
          </span>
        </div>
      )}
      {action}
    </div>
  );
}

const RESULT_ICON = { correct: 'pass', partial: 'warn', wrong: 'fail' };

function EvalCell({ rows, pending, label }) {
  if (!rows.length) {
    return (
      <div className={styles.evalCell} data-label={label}>
        {pending ? (
          <span className={styles.evalPending}>
            <Spinner /> investigating
          </span>
        ) : (
          <span className={styles.evalPending}>not run</span>
        )}
      </div>
    );
  }
  const correct = rows.filter(row => row.result === 'correct').length;
  const average = key => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
  return (
    <div className={styles.evalCell} data-label={label}>
      <span className={styles.evalScore}>
        <b>
          {correct}/{rows.length}
        </b>
        <span className={styles.evalIcons}>
          {rows.map((row, index) => (
            <span
              key={index}
              title={`Trial ${index + 1}: ${row.result}. Answer: ${row.answer ? `${row.answer.service} ${culpritText(row.answer.culprit)}` : 'none'}`}
            >
              <StatusIcon status={RESULT_ICON[row.result]} variant="solid" />
            </span>
          ))}
          {pending && <Spinner />}
        </span>
      </span>
      <span className={styles.evalNote}>
        {average('queries').toFixed(1)} queries · {average('llmCalls').toFixed(0)} LLM calls
      </span>
    </div>
  );
}

/** Scenarios down, the configs across; every cell graded in code. */
export function EvalTable({ scenarios, configs, results, pending }) {
  const cell = (scenario, config) => results.filter(row => row.scenario === scenario && row.config === config);
  return (
    <div
      className={styles.evalTable}
      role="table"
      aria-label="Eval results per planted incident"
      data-kit="eval-table"
      style={{ '--evalConfigs': configs.length }}
    >
      <div className={styles.evalRow} data-head role="row">
        <span role="columnheader">Planted incident</span>
        {configs.map(config => (
          <span key={config.id} role="columnheader">
            {config.label}
          </span>
        ))}
      </div>
      {scenarios.map(scenario => (
        <div key={scenario.id} className={styles.evalRow} role="row" data-kit-evalrow={scenario.id}>
          <div role="cell">
            <b>{scenario.title}</b>
            <span className={styles.evalTruth}>{scenario.truth.text}</span>
          </div>
          {configs.map(config => (
            <EvalCell
              key={config.id}
              label={config.label}
              rows={cell(scenario.id, config.id)}
              pending={pending.includes(`${scenario.id}|${config.id}`)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function RunButton({ running, children, ...rest }) {
  return (
    <Button disabled={running} {...rest}>
      {running ? (
        <>
          <Spinner /> Investigating
        </>
      ) : (
        children
      )}
    </Button>
  );
}
