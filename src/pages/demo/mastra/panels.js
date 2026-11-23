// The Mastra demo's page pieces: the benchmark grid, failure clusters, one trace, a suggestion
// diff and the rollout comparison. Built from demos/ui; all numbers come from agent.js.
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  CheckList,
  CodeView,
  DecisionBadge,
  EmptyState,
  JsonView,
  MiniLabel,
  Pill,
  StatGrid,
  StatTile,
  TraceWaterfall,
} from 'demos/ui';
import { CAUSES, diffText, renderConfig, applyChanges } from './agent';
import { caseById } from './data';
import styles from './Mastra.module.css';

const number = value => Number(value || 0).toLocaleString('en-US');
const seconds = ms => `${(ms / 1000).toFixed(1)} s`;

/** The benchmark as a grid of cases: pass, fail (with its cause), running, waiting. */
export function CaseGrid({ caseIds, results, running = [], active, onPick, compare, label = 'Benchmark cases' }) {
  return (
    <div className={styles.caseGrid} role="list" aria-label={label}>
      {caseIds.map(id => {
        const result = results[id];
        const state = result?.error ? 'error' : result?.grade ? (result.grade.pass ? 'pass' : 'fail') : running.includes(id) ? 'running' : 'idle';
        const cause = result?.grade?.cause;
        const before = compare?.[id]?.grade;
        const change = before && result?.grade ? (before.pass && !result.grade.pass ? 'regressed' : !before.pass && result.grade.pass ? 'fixed' : null) : null;
        const title = `${id}: ${state === 'fail' ? CAUSES[cause].short : state}${change ? `, ${change}` : ''}`;
        return (
          <button
            key={id}
            type="button"
            role="listitem"
            className={styles.cell}
            data-state={state}
            data-active={active === id || undefined}
            data-change={change || undefined}
            title={title}
            aria-label={title}
            disabled={!result?.grade || !onPick}
            onClick={() => onPick?.(id)}
          >
            <span className={styles.cellId}>{id.slice(1)}</span>
            {change === 'regressed' ? (
              <span className={styles.cellCause}>Regressed</span>
            ) : state === 'fail' ? (
              <span className={styles.cellCause}>{CAUSES[cause].short}</span>
            ) : change === 'fixed' ? (
              <span className={styles.cellCause}>Fixed</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Failures grouped by cause, the largest first. */
export function ClusterList({ clusters, active, onPick }) {
  const max = Math.max(1, ...clusters.map(cluster => cluster.caseIds.length));
  if (!clusters.length) return <EmptyState size="s">No failures to group yet.</EmptyState>;
  return (
    <ul className={styles.clusters} aria-label="Failure clusters">
      {clusters.map(cluster => {
        const cause = CAUSES[cluster.cause];
        return (
          <li key={cluster.cause}>
            <button
              type="button"
              className={styles.cluster}
              aria-pressed={active === cluster.cause}
              onClick={() => onPick(cluster.cause)}
            >
              <span className={styles.clusterHead}>
                <span className={styles.clusterName}>{cause.label}</span>
                <span className={styles.clusterCount}>
                  {cluster.caseIds.length} <span>{cluster.caseIds.length === 1 ? 'case' : 'cases'}</span>
                </span>
              </span>
              <span className={styles.clusterTrack} aria-hidden>
                <span style={{ width: `${(cluster.caseIds.length / max) * 100}%` }} />
              </span>
              <span className={styles.clusterSignal}>{cause.signal}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function spanTone(span) {
  if (span.kind === 'tool') return span.status === 'ok' ? 'ok' : span.status === 'refused' ? 'warn' : 'bad';
  if (span.kind === 'memory') return span.dropped ? 'warn' : 'idle';
  if (span.kind === 'model') return span.error ? 'bad' : 'ok';
  return 'idle';
}

/** A recorded trace as waterfall rows. */
export function traceSpans(result) {
  const trace = result.trace;
  return trace.spans.map(span => {
    if (span.kind === 'agent')
      return {
        id: span.id,
        depth: 0,
        kind: 'agent',
        name: span.name,
        start: 0,
        ms: span.ms,
        meta: `${span.steps} of ${span.maxSteps} steps · ${trace.stop === 'answer' ? 'answered' : trace.stop === 'error' ? 'error' : 'step limit'}`,
        tone: result.grade.pass ? 'ok' : 'bad',
      };
    if (span.kind === 'memory')
      return {
        id: span.id,
        depth: 1,
        kind: 'memory',
        name: span.name,
        start: 0,
        ms: 0,
        meta: `kept ${span.kept} of ${span.kept + span.dropped} message${span.kept + span.dropped === 1 ? '' : 's'}`,
        tone: spanTone(span),
      };
    if (span.kind === 'model')
      return {
        id: span.id,
        depth: 1,
        kind: 'model',
        name: span.name,
        start: span.start,
        ms: span.ms,
        meta: span.error ? 'failed' : `${number(span.tokens.input)} in · ${number(span.tokens.output)} out · ${span.finish === 'tool-calls' ? span.calls.join(', ') : 'answer'}`,
        tone: spanTone(span),
        detail: span.text ? <p className={styles.modelText}>{span.text}</p> : null,
      };
    return {
      id: span.id,
      depth: 2,
      kind: 'tool',
      name: span.name,
      start: span.start,
      ms: span.ms,
      meta: span.status === 'ok' ? JSON.stringify(span.args) : span.status === 'refused' ? `refused · ${span.result.reason}` : 'error',
      tone: spanTone(span),
      detail: <JsonView value={{ args: span.args, result: span.result }} clip={900} />,
    };
  });
}

const KINDS = { agent: 'agent', memory: 'memory', model: 'LLM', tool: 'tool' };

/** One case: the thread, the span waterfall, the answer and the checks it was graded on. */
export function TraceView({ caseId, result, siblings = [], onPick }) {
  const testCase = caseById(caseId);
  if (!testCase || !result?.trace) return <EmptyState size="s">Pick a case to see its trace.</EmptyState>;
  const memory = result.trace.spans.find(span => span.kind === 'memory');
  const dropped = memory?.dropped || 0;
  const failedTool = result.trace.spans.find(span => span.kind === 'tool' && span.status === 'error');
  const open = failedTool ? [failedTool.id] : [];
  return (
    <div className={styles.traceView}>
      {siblings.length > 1 && (
        <div className={styles.siblings} role="group" aria-label="Cases in this cluster">
          {siblings.map(id => (
            <button key={id} type="button" aria-pressed={id === caseId} onClick={() => onPick(id)}>
              {id}
            </button>
          ))}
        </div>
      )}
      <ol className={styles.thread} aria-label="Customer thread">
        {testCase.thread.map((message, index) => (
          <li key={index} data-role={message.role} data-dropped={index < dropped || undefined}>
            <span className={styles.who}>
              {message.role === 'user' ? 'Customer' : 'Agent'}
              {index < dropped && <span className={styles.droppedTag}>not in memory</span>}
            </span>
            {message.content}
          </li>
        ))}
      </ol>
      <div className={styles.traceBox} data-trace>
        <div className={styles.traceHead}>
          <MiniLabel>Trace</MiniLabel>
          <span className={styles.traceMeta}>
            {number(result.trace.tokens.input + result.trace.tokens.output)} tokens · {seconds(result.trace.ms)}
          </span>
        </div>
        <TraceWaterfall spans={traceSpans(result)} total={result.trace.ms} open={open} kinds={KINDS} label={`Trace of ${caseId}`} />
      </div>
      <div className={styles.answer} data-empty={!result.trace.final || undefined}>
        <MiniLabel>Answer</MiniLabel>
        <p>{result.trace.final || 'No answer: the run stopped with a tool call pending.'}</p>
      </div>
      <div className={styles.verdict} data-verdict>
        <div className={styles.verdictHead}>
          <MiniLabel>Graded in code</MiniLabel>
          {result.grade.pass ? <Pill tone="ok">Pass</Pill> : <Pill tone="bad">{CAUSES[result.grade.cause].label}</Pill>}
        </div>
        {!result.grade.pass && <p className={styles.signal}>{result.grade.signal}</p>}
        <CheckList items={result.grade.checks} label="Checks" />
      </div>
    </div>
  );
}

/** One suggested change for one cluster, as a diff of the Mastra-style config. */
export function SuggestionCard({ cause, count, suggestion, baseConfig, selected, onToggle, pending }) {
  const info = CAUSES[cause];
  const before = renderConfig(baseConfig);
  const diff = suggestion?.changes?.length
    ? diffText(before, renderConfig(applyChanges(baseConfig, suggestion.changes).config), 1)
    : null;
  return (
    <Card className={styles.suggestion} data-selected={selected || undefined} data-cause={cause}>
      <CardHead
        aside={
          diff && (
            <Button size="s" variant={selected ? 'primary' : 'secondary'} aria-pressed={selected} onClick={onToggle}>
              {selected ? 'Applied' : 'Apply'}
            </Button>
          )
        }
      >
        <div>
          <CardTitle size="s">{info.label}</CardTitle>
          <span className={styles.muted}>
            {count} failing {count === 1 ? 'case' : 'cases'}
          </span>
        </div>
      </CardHead>
      {pending ? (
        <EmptyState size="s" loading>
          The LLM is reading the traces…
        </EmptyState>
      ) : suggestion?.error ? (
        <p className={styles.muted}>{suggestion.error}</p>
      ) : suggestion ? (
        <>
          <p className={styles.diagnosis}>{suggestion.diagnosis}</p>
          {diff ? (
            <CodeView code={diff.text} lang="diff" numbers={false} copy={false} wrap className={styles.diff} />
          ) : (
            <p className={styles.muted}>No change passed the checks.</p>
          )}
          {suggestion.risk && (
            <p className={styles.risk}>
              <span>Could regress</span> {suggestion.risk}
            </p>
          )}
          {suggestion.rejected?.length > 0 && (
            <p className={styles.risk}>
              <span>Rejected in code</span> {suggestion.rejected.map(item => item.why).join('; ')}
            </p>
          )}
        </>
      ) : (
        <EmptyState size="s">Suggestions appear after a benchmark run.</EmptyState>
      )}
    </Card>
  );
}

const VERDICTS = {
  promote: { tone: 'ok', title: 'Promote the candidate', text: 'More cases pass and every case that passed before still passes.' },
  review: { tone: 'warn', title: 'Review before promoting', text: 'More cases pass, but some that passed before now fail.' },
  hold: { tone: 'bad', title: 'Hold: not better', text: 'The candidate does not pass more cases than the current config.' },
};

/** Before / after per cluster, regressions and the gate. */
export function RolloutView({ comparison, total }) {
  const { before, after, clusters, regressions, verdict } = comparison;
  const gate = VERDICTS[verdict];
  return (
    <div className={styles.rollout}>
      <Card tone="accent" className={styles.gate} data-gate>
        <span className={styles.gateLabel}>Rollout gate</span>
        <DecisionBadge tone={gate.tone} size="l">
          {gate.title}
        </DecisionBadge>
        <p className={styles.gateScore}>
          <strong>
            {before.pass} → {after.pass}
          </strong>{' '}
          of {total} cases pass
        </p>
        <p className={styles.gateText}>
          {regressions.length} regression{regressions.length === 1 ? '' : 's'}. {gate.text}
        </p>
        <p className={styles.gateRule}>Rule, in code: promote only if the pass count rises and nothing that passed now fails.</p>
      </Card>

      <Card className={styles.perCluster} data-clusters>
        <CardHead>
          <CardTitle size="s">Per failure cluster</CardTitle>
        </CardHead>
        <ul className={styles.fixRows}>
          {clusters.map(cluster => (
            <li key={cluster.cause} data-cause={cluster.cause}>
              <span className={styles.fixName}>{CAUSES[cluster.cause].label}</span>
              <span className={styles.fixScore}>
                {cluster.fixed.length}/{cluster.caseIds.length} <span>fixed</span>
              </span>
              <span className={styles.fixTrack} aria-hidden>
                <span style={{ width: `${(cluster.fixed.length / cluster.caseIds.length) * 100}%` }} />
              </span>
              {cluster.still.length > 0 && (
                <span className={styles.fixStill}>
                  Still failing:{' '}
                  {cluster.still.map(item => (
                    <span key={item.id}>
                      {item.id} <em>{CAUSES[item.cause].short.toLowerCase()}</em>
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className={styles.regressions} data-regressions>
          <MiniLabel>Regressions</MiniLabel>
          {regressions.length ? (
            <ul>
              {regressions.map(item => (
                <li key={item.id}>
                  <strong>{item.id}</strong> {CAUSES[item.cause].label}: {item.signal}
                </li>
              ))}
            </ul>
          ) : (
            <p>None. All {before.pass} cases that passed before still pass.</p>
          )}
        </div>
      </Card>

      <StatGrid columns={3} className={styles.costs}>
        <StatTile label="Tokens per case" value={number(after.tokens)} note={`was ${number(before.tokens)}`} />
        <StatTile label="Time per case" value={seconds(after.ms)} note={`was ${seconds(before.ms)}`} />
        <StatTile label="Steps per case" value={after.steps} note={`was ${before.steps}`} />
      </StatGrid>
    </div>
  );
}

/** The config being run, as Mastra-style code, with a diff against the baseline when it differs. */
export function ConfigView({ config, baseConfig, showDiff }) {
  const code = renderConfig(config);
  const diff = showDiff ? diffText(renderConfig(baseConfig), code, 1) : null;
  return diff && (diff.added || diff.removed) ? (
    <CodeView code={diff.text} lang="diff" numbers={false} title="support-agent.ts, changes from v1" wrap maxHeight={420} />
  ) : (
    <CodeView code={code} title="support-agent.ts" wrap maxHeight={460} />
  );
}
