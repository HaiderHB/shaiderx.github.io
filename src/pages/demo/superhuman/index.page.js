// Superhuman demo: an inbox agent that works a sample inbox through an MCP-style tool server
// with permission scopes and an approval gate for every send, plus an eval suite.
// Live at /demo/superhuman/ (unlisted, noindex). Without a demo key the page replays recorded live
// runs (the model's tool calls and the judge's answers; every tool result, gate decision and check
// is computed in the browser). With one, runs hit /api/demo/superhuman/run/ and /eval/.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  McpToolPanel,
  NoteGrid,
  Notice,
  PipelineStrip,
  SectionHead,
  SegmentedControl,
  srOnly,
} from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiPlay, FiRotateCcw } from 'react-icons/fi';
import {
  EVAL_TASKS,
  PRESETS,
  applyEvent,
  emptyRun,
  outOfScope,
  presetById,
  runAgent,
  scoreEval,
} from './agent';
import { EVAL_RUN, EXAMPLE_META, RUNS } from './example';
import {
  GRANTS,
  GRANT_IDS,
  TOOLS,
  approveSend,
  callTool,
  initialWorld,
  rejectSend,
} from './mcp';
import {
  CallsCard,
  EvalRow,
  EvalRunLine,
  EvalSummary,
  GateCard,
  InboxCard,
  RunGlance,
  SummaryCard,
  TaskCard,
  threadOfCall,
} from './panels';
import styles from './Superhuman.module.css';

const RUN_PATH = '/api/demo/superhuman/run/';
const EVAL_PATH = '/api/demo/superhuman/eval/';
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my email.';
const NAV = [
  { href: '#agent', label: 'Agent' },
  { href: '#evals', label: 'Evals' },
  { href: '#tools', label: 'Tools' },
  { href: '#how', label: 'How it works' },
];

// Replays show each model turn at about a third of its live time, and calls at a readable pace
const REPLAY_SPEED = 0.32;
const PACE = { call: 240, turn_done: 90, final: 160, judge: 200 };
const LIVE_PACE = { call: 120, judge: 120 };
const EVAL_CONCURRENCY = 2;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Shows events one at a time at a readable pace (tool calls finish in microseconds). */
function createPlayer(onEvent, { instant = false, pace = PACE } = {}) {
  const queue = [];
  let cancelled = false;
  let draining = false;
  async function drain() {
    draining = true;
    while (queue.length && !cancelled) {
      const event = queue.shift();
      onEvent(event);
      const wait = instant ? 0 : pace[event.t] || 0;
      if (wait) await sleep(wait);
    }
    draining = false;
  }
  return {
    push(event) {
      if (cancelled) return;
      queue.push(event);
      if (!draining) drain();
    },
    cancel() {
      cancelled = true;
      queue.length = 0;
    },
  };
}

/** Streams NDJSON events from a route. Resolves when the stream ends. */
async function streamEvents(path, body, onEvent) {
  let buffer = '';
  let finished = false;
  const handle = line => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.t === 'done' || event.t === 'error') finished = true;
    onEvent(event);
  };
  await streamFromApi(path, body, chunk => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(handle);
  });
  handle(buffer);
  if (!finished) onEvent({ t: 'error', message: 'The run ended early. Try again.' });
}

/** Re-runs a recorded run through the real loop: recorded model turns and judge answers only. */
function replayRecorded(rec, { task, grant, judgeMode = 'drafts' }, emit, { instant = true } = {}) {
  return runAgent(
    { task, grant, judgeMode },
    {
      turn: async ({ n }) => {
        const turn = rec.turns[n - 1] || { content: rec.final, toolCalls: [] };
        if (!instant) await sleep(clamp((turn.ms || 2000) * REPLAY_SPEED, 450, 1800));
        return turn;
      },
      judge: async target => {
        const answers = rec.judges?.[target.key];
        if (!answers) throw new Error('not recorded');
        return answers;
      },
      msFor: n => rec.turns[n - 1]?.ms,
      emit: event => {
        if (event.t === 'done') emit({ ...event, ms: rec.ms ?? event.ms });
        else if (event.t === 'judge') emit({ ...event, ms: rec.judgeMs?.[event.key] ?? event.ms });
        else emit(event);
      },
    }
  );
}

// --- evals --------------------------------------------------------------------------------

function entryFrom(task, run) {
  const sends = run.calls.filter(c => c.name === 'send');
  return {
    status: run.status === 'error' ? 'error' : 'done',
    run,
    score: scoreEval(task, run),
    outOfScope: outOfScope(run.calls, task.grant).length,
    blocked: run.calls.filter(c => c.status === 'blocked').length,
    unapproved: run.world.sent.length + sends.filter(c => c.status === 'allowed').length,
    held: sends.filter(c => c.status === 'awaiting').length,
    grounded: Object.values(run.judges)
      .map(answers => Number(answers?.grounded?.noul))
      .filter(Number.isFinite),
  };
}

async function recordedEvalEntries() {
  const entries = {};
  if (!EVAL_RUN) return entries;
  for (const task of EVAL_TASKS) {
    const rec = EVAL_RUN.tasks[task.id];
    if (!rec) continue;
    let run = {
      ...emptyRun('example', { task: task.task, grant: task.grant }),
      status: 'running',
      model: EVAL_RUN.model,
    };
    await replayRecorded(rec, task, event => {
      run = applyEvent(run, event);
    });
    entries[task.id] = entryFrom(task, run);
  }
  return entries;
}

// --- the page -----------------------------------------------------------------------------

const firstPreset = PRESETS[0];
const recordedFor = (task, grant) =>
  Object.values(RUNS).find(rec => rec.task === task.trim() && rec.grant === grant) || null;

export default function SuperhumanDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [grant, setGrant] = useState(firstPreset.grant);
  const [task, setTask] = useState(firstPreset.task);
  const [presetId, setPresetId] = useState(firstPreset.id);
  const [run, setRun] = useState(() =>
    emptyRun('example', { task: firstPreset.task, grant: firstPreset.grant })
  );
  const [replayNote, setReplayNote] = useState('');
  const [notice, setNotice] = useState('');
  const [openThread, setOpenThread] = useState(null);
  const [evals, setEvals] = useState({ kind: 'example', status: 'idle', entries: {} });
  const [openEvals, setOpenEvals] = useState(() => new Set(['e4']));
  const [evalNotice, setEvalNotice] = useState('');
  const player = useRef(null);

  const busy = run.status === 'running';

  function playRecorded(rec) {
    player.current?.cancel();
    const instant = prefersReducedMotion();
    const current = createPlayer(event => setRun(r => applyEvent(r, event)), { instant });
    player.current = current;
    setOpenThread(null);
    setRun({
      ...emptyRun('example', { task: rec.task, grant: rec.grant }),
      status: 'running',
      model: EXAMPLE_META.model,
    });
    setReplayNote(
      `Recorded live${EXAMPLE_META.recorded ? ` on ${EXAMPLE_META.recorded}` : ''} in ${(
        rec.ms / 1000
      ).toFixed(1)} s; replayed faster.`
    );
    replayRecorded(rec, rec, current.push, { instant }).catch(error =>
      current.push({ t: 'error', message: error.message })
    );
  }

  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    const first = RUNS[firstPreset.id];
    if (first) playRecorded(first);
    recordedEvalEntries().then(entries =>
      setEvals(current =>
        current.kind === 'example' ? { ...current, status: 'done', entries } : current
      )
    );
    return () => player.current?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickPreset(id) {
    const preset = presetById(id);
    setPresetId(id);
    setTask(preset.task);
    setGrant(preset.grant);
    setNotice('');
  }

  async function runTask(event) {
    event?.preventDefault();
    const text = task.trim();
    if (!text || busy) return;
    if (!hasKey) {
      const rec = recordedFor(text, grant);
      if (rec) {
        playRecorded(rec);
        setNotice(`${PREVIEW_NOTE} Replaying the recorded live run of this task.`);
      } else {
        const preset = PRESETS.find(item => item.task === text);
        setNotice(
          preset
            ? `${PREVIEW_NOTE} This task was recorded with "${
                GRANTS[preset.grant].label
              }"; pick that to replay it.`
            : `${PREVIEW_NOTE} In preview, the four example tasks replay recorded live runs.`
        );
      }
      return;
    }
    setNotice('');
    player.current?.cancel();
    const current = createPlayer(e => setRun(r => applyEvent(r, e)), { pace: LIVE_PACE });
    player.current = current;
    setOpenThread(null);
    setReplayNote('');
    setRun({ ...emptyRun('live', { task: text, grant }), status: 'running' });
    try {
      await streamEvents(RUN_PATH, { task: text, grant }, current.push);
    } catch (error) {
      current.push({ t: 'error', message: error.message });
    }
  }

  function decide(approvalId, approve) {
    setRun(current => ({
      ...current,
      world: approve
        ? approveSend(current.world, approvalId)
        : rejectSend(current.world, approvalId),
    }));
  }

  async function runEvalsLive() {
    if (!hasKey) {
      setEvalNotice(`${PREVIEW_NOTE} The scores above are a recorded run of all eight tasks.`);
      return;
    }
    if (evals.status === 'running' && evals.kind === 'live') return;
    setEvalNotice('');
    const fresh = Object.fromEntries(
      EVAL_TASKS.map(item => [
        item.id,
        {
          status: 'running',
          run: {
            ...emptyRun('live', { task: item.task, grant: item.grant }),
            status: 'running',
          },
        },
      ])
    );
    setEvals({ kind: 'live', status: 'running', entries: fresh });
    const queue = [...EVAL_TASKS];
    const update = (id, fn) =>
      setEvals(current => ({
        ...current,
        entries: { ...current.entries, [id]: fn(current.entries[id]) },
      }));
    async function worker() {
      while (queue.length) {
        const item = queue.shift();
        let local = fresh[item.id].run;
        try {
          await streamEvents(EVAL_PATH, { taskId: item.id }, event => {
            local = applyEvent(local, event);
            const snapshot = local;
            update(item.id, entry => ({ ...entry, run: snapshot }));
          });
          const finished = local;
          update(item.id, () => entryFrom(item, finished));
        } catch (error) {
          const failed = applyEvent(local, { t: 'error', message: error.message });
          update(item.id, () => ({ status: 'error', run: failed, error: error.message }));
          setEvalNotice(error.message);
        }
      }
    }
    await Promise.all(Array.from({ length: EVAL_CONCURRENCY }, worker));
    setEvals(current => ({ ...current, status: 'done' }));
  }

  const latest = run.calls[run.calls.length - 1];
  const activeThread = busy ? threadOfCall(latest, run.world) : null;
  const scored = EVAL_TASKS.map(item => {
    const entry = evals.entries[item.id];
    return entry?.score ? entry : null;
  });

  return (
    <DemoLayout
      company="Superhuman"
      title="An inbox agent that asks before it sends."
      tagline="An agent works a sample inbox through an MCP-style tool server. Every tool has a scope, the server refuses calls you did not grant, and every send waits for your approval. Eight eval tasks score each change."
      accent="iris"
      nav={NAV}
      wide
      hero={<RunGlance run={run} replay={run.kind === 'example' ? replayNote : ''} />}
    >
      <div className={styles.page}>
        <section id="agent" className={styles.section} aria-labelledby="agent-heading">
          <h2 id="agent-heading" className={srOnly}>
            The agent
          </h2>
          <TaskCard
            grant={grant}
            onGrant={value => {
              setGrant(value);
              setNotice('');
            }}
            task={task}
            onTask={value => {
              setTask(value);
              setPresetId(PRESETS.find(item => item.task === value)?.id || 'custom');
              setNotice('');
            }}
            presetId={presetId}
            onPreset={pickPreset}
            onRun={runTask}
            busy={busy}
            hasKey={hasKey}
            notice={notice}
          />
          <div className={styles.workspace}>
            <div className={styles.inboxCol}>
              <InboxCard
                run={run}
                activeThread={activeThread}
                openThread={openThread}
                onOpen={setOpenThread}
              />
            </div>
            <div className={styles.callsCol}>
              <CallsCard run={run} active={busy ? latest?.id : undefined} />
            </div>
            <div className={styles.sideCol}>
              <GateCard
                run={run}
                onApprove={id => decide(id, true)}
                onReject={id => decide(id, false)}
              />
              <SummaryCard run={run} />
            </div>
          </div>
        </section>

        <section id="evals" className={styles.section} aria-labelledby="evals-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Evals"
            titleId="evals-heading"
            title="Eight tasks, scored on every change"
            lede="Each task runs the same agent and tool server with a fixed permission level. Code checks the outcome (the right threads, zero out-of-scope calls, nothing sent without approval); a typed judge scores every reply against its thread, with probabilities."
            action={
              <Button
                className={styles.evalButton}
                onClick={runEvalsLive}
                disabled={evals.status === 'running' && evals.kind === 'live'}
              >
                <FiPlay aria-hidden /> Run all 8 live
              </Button>
            }
          />
          <EvalSummary scored={scored} total={EVAL_TASKS.length} />
          <div className={styles.evalLine}>
            <EvalRunLine evals={evals} meta={EVAL_RUN} />
            {hasKey && (
              <span className={styles.muted}>
                About 24 cents for all eight; a repeat replays from cache, free
              </span>
            )}
          </div>
          {evalNotice && (
            <Notice size="s" className={styles.notice} role="status">
              {evalNotice}
            </Notice>
          )}
          <ol className={styles.evalList}>
            {EVAL_TASKS.map((item, index) => (
              <EvalRow
                key={item.id}
                index={index}
                task={item}
                entry={evals.entries[item.id]}
                open={openEvals.has(item.id)}
                onToggle={() =>
                  setOpenEvals(current => {
                    const next = new Set(current);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
              />
            ))}
          </ol>
        </section>

        <ToolsSection />

        <section id="how" className={styles.section} aria-labelledby="how-heading">
          <SectionHead
            variant="eyebrow"
            kicker="How it works"
            titleId="how-heading"
            title="Scopes in the server, a person on every send"
          />
          <PipelineStrip className={styles.flow} steps={FLOW} />
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}

// --- call the tools yourself ----------------------------------------------------------------

const PANEL_TOOLS = TOOLS.map(tool => ({
  name: tool.name,
  title: tool.title,
  description: tool.description,
  inputSchema: tool.inputSchema,
  annotations: tool.annotations,
  _meta: {
    scope: tool.scope,
    ...(tool.approval && { approval: 'every call waits for the user' }),
  },
}));

const PANEL_EXAMPLES = {
  list_threads: { label: 'Inbox', unread_only: true, limit: 5 },
  read_thread: { thread_id: 't01' },
  search: { query: 'from:dana contract' },
  draft_reply: {
    thread_id: 't19',
    body: 'Hi Grace, no problem. Would Tuesday or Wednesday morning next week work? Alex',
  },
  apply_label: { thread_id: 't08', label: 'Suspicious' },
  snooze: { thread_id: 't16', until: '2026-11-23T09:00' },
  archive: { thread_id: 't04' },
  send: { draft_id: 'd1' },
};

const GRANT_OPTIONS = GRANT_IDS.map(id => ({ value: id, label: GRANTS[id].label }));

function ToolsSection() {
  const [toolGrant, setToolGrant] = useState('draft');
  const [version, setVersion] = useState(0);
  const world = useRef(initialWorld());
  const call = useMemo(
    () => (name, args) => {
      const out = callTool(world.current, name, args, toolGrant);
      world.current = out.world;
      if (out.isError) throw new Error(out.result.error);
      return out.result;
    },
    [toolGrant]
  );
  return (
    <section id="tools" className={styles.section} aria-labelledby="tools-heading">
      <SectionHead
        variant="eyebrow"
        kicker="Tools"
        titleId="tools-heading"
        title="Call the tool server yourself"
        lede="The same eight tools the agent sees (tools/list), with their scopes. Pick a permission level and call one: the gate answers exactly as it does for the agent."
      />
      <Card tone="inset" className={styles.toolBar}>
        <SegmentedControl
          label="Permission level for your calls"
          options={GRANT_OPTIONS}
          value={toolGrant}
          onChange={setToolGrant}
        />
        <Button
          variant="ghost"
          size="s"
          onClick={() => {
            world.current = initialWorld();
            setVersion(v => v + 1);
          }}
        >
          <FiRotateCcw aria-hidden /> Reset the sample inbox
        </Button>
      </Card>
      <McpToolPanel
        key={version}
        tools={PANEL_TOOLS}
        examples={PANEL_EXAMPLES}
        call={call}
        initialTool="search"
        hint="Free: runs in your browser on the sample inbox"
        argsId="superhuman-tool-args"
      />
    </section>
  );
}

const FLOW = [
  { label: 'Task + grant', what: 'You pick read only, read + draft, or full', cost: 'free' },
  { label: 'Model turn', what: 'DeepSeek V3.2 picks tools, up to 8 turns', cost: '~2 units' },
  { label: 'Gate', what: "The server checks each call's scope", cost: 'free' },
  { label: 'Tools', what: 'They run on the sample inbox', cost: 'free' },
  { label: 'Approval', what: 'Every send waits for a person', cost: 'free' },
  { label: 'Judge', what: 'Jev scores each reply against its thread', cost: '1 unit' },
];

const NOTES = [
  {
    title: 'Scopes live in the server',
    text: 'The model sees every tool and its scope, but the check runs in the tool server: a refused call returns an MCP error result and changes nothing, whatever the prompt said.',
  },
  {
    title: 'Send is two steps',
    text: 'draft_reply writes a draft; send only queues it. A person approves each send, so even with full access the agent cannot send on its own.',
  },
  {
    title: 'Email is data',
    text: 'Instructions inside an email are never followed. The eval set includes a bank-details scam with a note addressed to AI assistants.',
  },
  {
    title: 'Evals gate changes',
    text: 'Eight fixed tasks with code checks and a typed judge that answers with probabilities, not prose. Run them on every prompt, model or tool change.',
  },
  {
    title: 'One module, two places',
    text: 'The tool server, gate, agent loop and checks are one module used by the API and the page, so a replay recomputes every result instead of trusting a recording.',
  },
  {
    title: 'Bounded and cached',
    text: 'At most 8 model turns, 32 calls and 900 output tokens a turn. An identical task replays from cache for free. About 3 units (cents) a run.',
  },
];
