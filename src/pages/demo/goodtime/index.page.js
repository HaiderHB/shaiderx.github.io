// GoodTime demo: an interview-loop rescue agent with typed decisions and a multi-turn candidate chat.
// Live at /demo/goodtime/ (unlisted, noindex). Without a demo key the page plays a pre-recorded
// example run; with one, runs and chat turns hit /api/demo/goodtime/rescue/ and /chat/.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import {
  AuditTrail,
  Button,
  Card,
  CardHead,
  CardTitle,
  ChatThread,
  Chip,
  CodeView,
  DecisionBadge,
  Dot,
  EmptyState,
  JsonDetails,
  JsonView,
  Meter,
  MiniLabel,
  Notice,
  NoteGrid,
  OptionList,
  Pill,
  PipelineStrip,
  ProbabilityBars,
  ScheduleStrip,
  SectionHead,
  SegmentedControl,
  Spinner,
  StatusIcon,
  Tag,
  TextArea,
  Timeline,
  TimelineStep,
  formatMs,
  pct,
  srOnly,
} from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiInfo, FiPlay, FiRotateCcw, FiSend } from 'react-icons/fi';
import {
  CHAT_NODES,
  CHAT_PRESETS,
  EXAMPLE,
  RESCUE_NODES,
  SAMPLES,
  applyEvent,
  emptyRun,
  parseDrafts,
  presetCall,
  runChatTurn,
  runRescue,
  templateMessages,
} from './agent';
import {
  CANDIDATE,
  COMPANY,
  SESSIONS,
  WEEK,
  firstName,
  fmtTime,
  initialWorld,
  interviewerById,
  localParts,
  minutesOf,
  sessionById,
  tzAbbr,
} from './data';
import styles from './GoodTime.module.css';
import {
  OPTION_IDS,
  OPTION_LABELS,
  OPTION_SHORT,
  candidateRange,
  diffWorlds,
  holdSlot,
  localRange,
  recipientsFor,
  validateWorld,
} from './scheduler';

const RESCUE_PATH = '/api/demo/goodtime/rescue/';
const CHAT_PATH = '/api/demo/goodtime/chat/';
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my email.';
const NAV = [
  { href: '#rescue', label: 'Rescue' },
  { href: '#chat', label: 'Candidate chat' },
  { href: '#audit', label: 'Audit trail' },
  { href: '#how', label: 'How it works' },
];
const OPTION_TONE = { swap: 'ok', reschedule_one: 'warn', reschedule_loop: 'bad' };
const OPTION_BARS = OPTION_IDS.map(id => ({
  value: id,
  label: OPTION_SHORT[id],
  tone: OPTION_TONE[id],
}));
const ACTOR_TONE = {
  Agent: 'accent',
  Jev: 'ok',
  Candidate: 'warn',
  You: 'bad',
};
const KIND_LABEL = { llm: 'LLM', tool: 'tool', jev: 'Jev' };
const STRIP_DAYS = WEEK.slice(1).map(day => ({
  id: day.date,
  label: day.label,
  sub: day.sub,
}));
const SAMPLE_OPTIONS = SAMPLES.map(sample => ({
  value: sample.id,
  label: sample.label,
  hint: sample.hint,
}));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const sampleById = id => SAMPLES.find(sample => sample.id === id);
const explainOf = run =>
  parseDrafts(run?.draft || '').find(item => item.to === 'explain')?.text || '';
const planSignature = world =>
  SESSIONS.map(
    s => `${s.id}:${world.plan[s.id].interviewer}:${world.plan[s.id].start}`
  ).join('|');

// Reveals events at a readable pace (tools finish in microseconds; nobody could follow them)
const PACE = { call: 230, decision: 420, world: 380, dropout: 520, options: 120 };

function createPlayer(onEvent, { instant = false } = {}) {
  const queue = [];
  let cancelled = false;
  let draining = false;

  async function drain() {
    draining = true;
    while (queue.length && !cancelled) {
      const event = queue.shift();
      onEvent(event);
      const wait = instant
        ? 0
        : event.t === 'node' && event.status === 'done'
        ? 110
        : PACE[event.t] || 0;
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

/** Streams one live run, calling onEvent per NDJSON event. Resolves when the stream ends. */
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

async function* typeOut(text, wordMs) {
  for (const word of String(text).split(/(?<=\s)/)) {
    if (wordMs) await sleep(wordMs);
    yield word;
  }
}

// --- session state: the world, both graphs' runs, the chat and the audit trail -----------------

let ids = 0;
const nextId = () => (ids += 1);

function freshState(kind = 'example') {
  return {
    kind,
    world: initialWorld(),
    prev: null,
    changed: [],
    dropout: null,
    base: null,
    worlds: null,
    rescue: emptyRun(kind),
    turns: [],
    chatRuns: {},
    audit: [],
    history: [],
    override: null,
  };
}

function changedIds(before, after) {
  return SESSIONS.map(session => session.id).filter(id => {
    const a = before.plan[id];
    const b = after.plan[id];
    return a.start !== b.start || a.interviewer !== b.interviewer;
  });
}

function reduce(state, event, scope) {
  const next = { ...state };
  if (scope.graph === 'rescue') next.rescue = applyEvent(state.rescue, event);
  else {
    const run = state.chatRuns[scope.turn] || emptyRun(scope.kind, 'candidate_chat');
    next.chatRuns = { ...state.chatRuns, [scope.turn]: applyEvent(run, event) };
  }
  switch (event.t) {
    case 'dropout':
      next.dropout = event;
      break;
    case 'options':
      next.worlds = event.worlds;
      next.base = event.base;
      break;
    case 'world':
      next.history = [
        ...state.history,
        {
          world: state.world,
          prev: state.prev,
          changed: state.changed,
          dropout: state.dropout,
        },
      ];
      next.prev = state.world;
      next.world = event.world;
      next.changed = changedIds(state.world, event.world);
      next.dropout = null;
      if (scope.graph === 'chat') {
        next.chatRuns = {
          ...next.chatRuns,
          [scope.turn]: {
            ...next.chatRuns[scope.turn],
            changes: diffWorlds(state.world, event.world),
          },
        };
      }
      break;
    case 'audit':
      next.audit = [
        ...state.audit,
        {
          id: nextId(),
          at: Date.now(),
          actor: event.actor,
          text: event.text,
          tone: ACTOR_TONE[event.actor],
        },
      ];
      break;
    default:
  }
  return next;
}

// --- the page ------------------------------------------------------------------------------------

export default function GoodTimeDemo() {
  const [sampleId, setSampleId] = useState('sick');
  const [message, setMessage] = useState(sampleById('sick').message);
  const [state, setState] = useState(() => freshState('example'));
  const [hasKey, setHasKey] = useState(false);
  const [notice, setNotice] = useState('');
  const [chatText, setChatText] = useState(CHAT_PRESETS[0]);
  const [chatNotice, setChatNotice] = useState('');
  const [draftView, setDraftView] = useState('rescue');
  const player = useRef(null);
  const chatPlayer = useRef(null);
  const chatRef = useRef(null);
  const autoChat = useRef(false);

  const rescue = state.rescue;
  const rescueBusy = rescue.status === 'running';
  const lastTurn = state.turns[state.turns.length - 1];
  const chatBusy = Boolean(lastTurn?.pending);

  const apply = scope => event => setState(current => reduce(current, event, scope));

  function playExample(id = 'sick') {
    player.current?.cancel();
    chatPlayer.current?.cancel();
    const recorded = EXAMPLE.rescues[id];
    const sample = sampleById(id);
    if (!recorded) return;
    const fast = prefersReducedMotion();
    const current = createPlayer(apply({ graph: 'rescue' }), { instant: fast });
    player.current = current;
    autoChat.current = false;
    setSampleId(id);
    setMessage(sample.message);
    setNotice('');
    setChatNotice('');
    setDraftView('rescue');
    setState({
      ...freshState('example'),
      rescue: { ...emptyRun('example'), status: 'running', model: EXAMPLE.model },
    });
    runRescue(sample.message, initialWorld(), {
      readDropout: async () => {
        if (!fast) await sleep(EXAMPLE.timings.intake);
        return recorded.tool;
      },
      decide: async () => {
        if (!fast) await sleep(EXAMPLE.timings.decide);
        return recorded.answers;
      },
      draft: () => typeOut(recorded.draft, fast ? 0 : EXAMPLE.timings.wordMs),
      // Show what the live run took, not the shortened replay wait
      msFor: node => recorded.recordedMs?.[node],
      emit: event => current.push(event),
    }).catch(error => current.push({ t: 'error', message: error.message }));
  }

  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    playExample('sick');
    return () => {
      player.current?.cancel();
      chatPlayer.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickSample(id) {
    setSampleId(id);
    setMessage(sampleById(id).message);
    setNotice('');
  }

  async function runLive(event) {
    event?.preventDefault();
    if (!hasKey) {
      if (EXAMPLE.rescues[sampleId] && message === sampleById(sampleId).message) {
        setNotice(`${PREVIEW_NOTE} Replaying the recorded example of this message.`);
        playExample(sampleId);
      } else {
        setNotice(`${PREVIEW_NOTE} The samples above replay recorded live runs.`);
      }
      return;
    }
    setNotice('');
    player.current?.cancel();
    chatPlayer.current?.cancel();
    autoChat.current = true;
    const current = createPlayer(apply({ graph: 'rescue' }));
    player.current = current;
    setDraftView('rescue');
    setState({
      ...freshState('live'),
      rescue: { ...emptyRun('live'), status: 'running' },
    });
    try {
      await streamEvents(RESCUE_PATH, { message }, current.push);
    } catch (error) {
      current.push({ t: 'error', message: error.message });
    }
  }

  async function sendChat(text = chatText) {
    const value = String(text || '').trim();
    if (!value || chatBusy || rescueBusy) return;
    autoChat.current = true;
    const preset = presetCall(value, state.world);
    if (!hasKey && !preset) {
      setChatNotice(`${PREVIEW_NOTE} In preview, the three suggested messages run.`);
      return;
    }
    setChatNotice('');
    chatPlayer.current?.cancel();
    const turnId = nextId();
    const live = hasKey;
    const kind = live ? 'live' : 'example';
    // agent turns carry their one-line reply
    const history = state.turns
      .filter(turn => !turn.pending)
      .map(turn => ({
        role: turn.role,
        text: turn.role === 'agent' ? explainOf(state.chatRuns[turn.id]) : turn.text,
      }))
      .filter(turn => turn.text);
    const world = state.world;
    setState(current => ({
      ...current,
      turns: [
        ...current.turns,
        { id: nextId(), role: 'candidate', text: value },
        { id: turnId, role: 'agent', pending: true, kind },
      ],
      chatRuns: {
        ...current.chatRuns,
        [turnId]: { ...emptyRun(kind, 'candidate_chat'), status: 'running' },
      },
    }));
    setDraftView('chat');
    setChatText('');
    const current = createPlayer(apply({ graph: 'chat', turn: turnId, kind }), {
      instant: prefersReducedMotion(),
    });
    chatPlayer.current = current;
    if (live) {
      try {
        await streamEvents(CHAT_PATH, { world, history, text: value }, current.push);
      } catch (error) {
        current.push({ t: 'error', message: error.message });
      }
      return;
    }

    // Preview: the recorded example turn when the state matches it, else the preset's tool call
    // with template drafts. Tools, checks and holds run for real either way.
    const fast = prefersReducedMotion();
    const recorded =
      value === EXAMPLE.chat.text && planSignature(world) === EXAMPLE_AFTER_RESCUE
        ? EXAMPLE.chat
        : null;
    try {
      await runChatTurn(
        { world, history, text: value },
        {
          understand: async () => {
            if (!fast) await sleep(EXAMPLE.timings.understand);
            return recorded ? recorded.tool : preset;
          },
          draft: () =>
            typeOut(recorded ? recorded.draft : '', fast ? 0 : EXAMPLE.timings.wordMs),
          msFor: node => recorded?.recordedMs?.[node],
          emit: event => current.push(event),
        }
      );
    } catch (error) {
      current.push({ t: 'error', message: error.message });
    }
  }

  // A turn stops "typing" once its paced events have all been shown
  useEffect(() => {
    const settled = state.turns.filter(
      turn =>
        turn.pending &&
        state.chatRuns[turn.id] &&
        state.chatRuns[turn.id].status !== 'running'
    );
    if (!settled.length) return;
    setState(current => ({
      ...current,
      turns: current.turns.map(turn =>
        settled.some(item => item.id === turn.id) ? { ...turn, pending: false } : turn
      ),
    }));
  }, [state.chatRuns, state.turns]);

  // Preview: play the candidate's message once the chat scrolls into view after the rescue
  useEffect(() => {
    const node = chatRef.current;
    if (!node || hasKey || rescue.status !== 'done' || autoChat.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting) && !autoChat.current) {
          autoChat.current = true;
          observer.disconnect();
          sendChat(EXAMPLE.chat.text);
        }
      },
      // only once the chat's top reaches the upper half of the screen, not while it peeks in below
      { rootMargin: '0px 0px -50% 0px', threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescue.status, hasKey, state.world]);

  function override(option) {
    const target = state.worlds?.[option];
    if (!target || !state.base) return;
    const out = holdSlot(state.base, target);
    if (!out.ok) return;
    const before = state.history.length ? state.history[0].world : initialWorld();
    const changes = diffWorlds(before, out.world);
    const recipients = recipientsFor(changes);
    const drafts = templateMessages({ changes, recipients });
    setState(current => ({
      ...current,
      history: [
        ...current.history,
        {
          world: current.world,
          prev: current.prev,
          changed: current.changed,
          dropout: null,
        },
      ],
      prev: current.world,
      world: out.world,
      changed: changedIds(current.world, out.world),
      override: { option, recipients, drafts },
      audit: [
        ...current.audit,
        {
          id: nextId(),
          at: Date.now(),
          actor: 'You',
          tone: ACTOR_TONE.You,
          text: `Overrode the repair: "${
            OPTION_LABELS[option]
          }". Re-checked every rule, held ${changes.length} slot${
            changes.length === 1 ? '' : 's'
          }, re-drafted messages from templates.`,
        },
      ],
    }));
    setDraftView('rescue');
  }

  function undo() {
    setState(current => {
      const last = current.history[current.history.length - 1];
      if (!last) return current;
      return {
        ...current,
        world: last.world,
        prev: last.prev,
        changed: last.changed,
        dropout: last.dropout,
        history: current.history.slice(0, -1),
        override:
          current.override && current.history.length > 1 ? current.override : null,
        audit: [
          ...current.audit,
          {
            id: nextId(),
            at: Date.now(),
            actor: 'You',
            tone: ACTOR_TONE.You,
            text: 'Undid the last change. The holds it placed are released.',
          },
        ],
      };
    });
  }

  const validation = useMemo(() => validateWorld(state.world), [state.world]);
  const chatRunList = state.turns
    .filter(turn => turn.role === 'agent')
    .map(turn => state.chatRuns[turn.id])
    .filter(Boolean);
  const latestChatRun = chatRunList[chatRunList.length - 1];

  return (
    <DemoLayout
      company="GoodTime"
      title="An interviewer drops out. The agent rescues the loop."
      tagline="Two days before a virtual onsite, an interviewer calls in sick. The agent reads the message, checks every replacement against calendars, time zones, load caps and loop order, lets a decision model pick the repair, holds the slot and drafts the messages. Then the candidate asks for a change in chat."
      accent="cobalt"
      nav={NAV}
      hero={<LoopGlance state={state} validation={validation} />}
    >
      <div className={styles.page}>
        <section id="rescue" className={styles.section} aria-labelledby="rescue-heading">
          <h2 id="rescue-heading" className={srOnly}>
            Loop rescue
          </h2>
          <div className={styles.layout}>
            <div className={styles.side}>
              <CalendarCard state={state} validation={validation} />
            </div>
            <div className={styles.main}>
              <MessageCard
                sampleId={sampleId}
                message={message}
                onPick={pickSample}
                onEdit={value => {
                  setMessage(value);
                  setSampleId(SAMPLES.find(s => s.message === value)?.id || 'custom');
                }}
                onRun={runLive}
                busy={rescueBusy && rescue.kind === 'live'}
                hasKey={hasKey}
                notice={notice}
              />
              <RunCard
                run={rescue}
                nodes={RESCUE_NODES}
                onReplay={() =>
                  playExample(EXAMPLE.rescues[sampleId] ? sampleId : 'sick')
                }
                replayDisabled={rescueBusy && rescue.kind === 'live'}
                sampleLabel={sampleById(sampleId)?.label}
              />
              <DecisionCard
                run={rescue}
                state={state}
                onOverride={override}
                overrideLocked={state.turns.length > 0 || rescueBusy}
              />
              <ChatCard
                innerRef={chatRef}
                state={state}
                text={chatText}
                onText={setChatText}
                onSend={sendChat}
                busy={chatBusy}
                disabled={rescueBusy || rescue.status !== 'done'}
                hasKey={hasKey}
                notice={chatNotice}
              />
              <DraftsCard
                rescue={rescue}
                chatRun={latestChatRun}
                override={state.override}
                view={draftView}
                onView={setDraftView}
              />
              <AuditCard state={state} onUndo={undo} busy={rescueBusy || chatBusy} />
            </div>
          </div>
        </section>

        <HowItWorks />
      </div>
    </DemoLayout>
  );
}

// Plan of the recorded example right after the rescue: the recorded chat turn matches only this.
const EXAMPLE_AFTER_RESCUE = (() => {
  const world = initialWorld();
  world.plan.system_design.interviewer = 'wei';
  return planSignature(world);
})();

// --- hero ----------------------------------------------------------------------------------------

/** "Wed 12p", "Thu 1:15p" in the candidate's time zone */
function shortTime(ms) {
  const day = localParts(ms, CANDIDATE.tz).weekday;
  const time = fmtTime(ms, CANDIDATE.tz)
    .replace(':00', '')
    .replace(' PM', 'p')
    .replace(' AM', 'a');
  return `${day} ${time}`;
}

function LoopGlance({ state, validation }) {
  const run = state.rescue;
  const done = RESCUE_NODES.filter(node => run.nodes[node.id]?.status === 'done').length;
  const decision = run.decision;
  // rescued as soon as the slot is held (the drafts may still be streaming)
  const rescued = Boolean(run.decision && run.world) && !state.dropout;
  const finished = run.status === 'done';
  const atRisk = Boolean(state.dropout);
  const totalMs = RESCUE_NODES.reduce(
    (sum, node) => sum + (run.nodes[node.id]?.ms || 0),
    0
  );
  const kind = run.kind === 'example' ? 'Example run' : 'Live run';
  const changes = diffWorlds(initialWorld(), state.world).filter(change => change.moved);
  const dropout = state.dropout || run.dropout;
  const person = dropout && interviewerById(dropout.interviewer);

  let status = 'Loop on track';
  let tone = 'ok';
  let why = 'Four interviews on Wed, Nov 18. Waiting for the message.';
  if (atRisk) {
    status = 'Loop at risk';
    tone = 'bad';
    why = `${person.name}: ${dropout.reason}. ${
      sessionById(dropout.session).title
    } has no interviewer.`;
  } else if (rescued && decision) {
    status = 'Loop rescued';
    tone = 'ok';
    why = `${OPTION_LABELS[decision.final]}${
      decision.model
        ? `, Jev ${pct(decision.model.probabilities[decision.model.choice])}`
        : ''
    }${decision.escalated ? ', escalated by rules' : ''}.`;
  } else if (run.status === 'running') {
    why = 'Reading the message…';
  } else if (run.status === 'error') {
    status = 'Run stopped';
    tone = 'warn';
    why = run.error;
  }

  const stats = [
    ['Repair time', rescued && finished ? formatMs(totalMs) : null],
    ['Tool calls', run.calls.length || null],
    [
      'Rule checks',
      rescued
        ? `${validation.total - validation.violations.length}/${validation.total}`
        : null,
    ],
  ];

  return (
    <Card tone="accent" className={styles.glance} aria-label="The loop at a glance">
      <div className={styles.glanceTop}>
        <span className={styles.glanceKind}>{kind}</span>
        <span className={styles.glanceSteps}>
          {done} of {RESCUE_NODES.length} steps
        </span>
      </div>
      <Meter
        value={done / RESCUE_NODES.length}
        segments={RESCUE_NODES.length}
        tone="ink"
        size="s"
        label={`${done} of ${RESCUE_NODES.length} steps done`}
      />
      <div className={styles.glanceStatus}>
        <span className={styles.glanceLabel}>
          {CANDIDATE.name} · {COMPANY.role}
        </span>
        <strong data-tone={tone}>{status}</strong>
        <span className={styles.glanceWhy}>{why}</span>
      </div>
      <ol className={styles.ribbon} aria-label="The loop, in order">
        {SESSIONS.map(session => {
          const item = state.world.plan[session.id];
          const who = interviewerById(item.interviewer);
          const dropped = state.dropout?.session === session.id;
          const changed = state.changed.includes(session.id);
          return (
            <li
              key={`${session.id}-${item.interviewer}-${item.start}`}
              data-state={dropped ? 'dropped' : changed ? 'changed' : undefined}
            >
              <span>{session.short}</span>
              <strong>{firstName(who)}</strong>
              <em>{shortTime(item.start)}</em>
            </li>
          );
        })}
      </ol>
      <p className={styles.glanceFoot}>
        {changes.length
          ? `${changes.length} interview${
              changes.length === 1 ? '' : 's'
            } moved for ${firstName(CANDIDATE)}`
          : `No interview times changed for ${firstName(CANDIDATE)}`}
      </p>
      <dl className={styles.glanceStats}>
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd data-empty={value == null || undefined}>{value ?? '–'}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

// --- calendar --------------------------------------------------------------------------------------

function blocksFor(state) {
  const blocks = [];
  const { world, prev, changed, dropout } = state;
  for (const session of SESSIONS) {
    const item = world.plan[session.id];
    const person = interviewerById(item.interviewer);
    const at = localParts(item.start, CANDIDATE.tz);
    const isDropped = dropout?.session === session.id;
    const wasPerson = prev && prev.plan[session.id].interviewer !== item.interviewer;
    blocks.push({
      id: `${session.id}-${item.start}-${item.interviewer}`,
      day: at.date,
      start: at.minutes,
      end: at.minutes + session.minutes,
      title: `${session.short} · ${firstName(person)}`,
      sub: isDropped
        ? dropout.reason
        : wasPerson && changed.includes(session.id)
        ? `was ${firstName(interviewerById(prev.plan[session.id].interviewer))}`
        : `${fmtTime(item.start, person.tz).replace(':00', '')} ${tzAbbr(
            item.start,
            person.tz
          )}`,
      tone: isDropped ? 'bad' : session.id === 'manager' ? 'warn' : 'accent',
      state: isDropped
        ? 'dropped'
        : changed.includes(session.id)
        ? 'changed'
        : item.status === 'held'
        ? 'held'
        : undefined,
      hint: `${session.title}: ${candidateRange(session.id, item.start)} with ${
        person.name
      } (${localRange(person, session.id, item.start)} for them)`,
    });
    if (
      prev &&
      changed.includes(session.id) &&
      prev.plan[session.id].start !== item.start
    ) {
      const old = prev.plan[session.id];
      const oldAt = localParts(old.start, CANDIDATE.tz);
      blocks.push({
        id: `${session.id}-ghost-${old.start}`,
        day: oldAt.date,
        start: oldAt.minutes,
        end: oldAt.minutes + session.minutes,
        title: session.short,
        sub: 'moved',
        tone: 'muted',
        state: 'removed',
      });
    }
  }
  return blocks;
}

const WINDOWS = Object.entries(CANDIDATE.windows).map(([date, [from, to]]) => ({
  day: date,
  start: minutesOf(from),
  end: minutesOf(to),
}));

const LEGEND = [
  { state: 'window', label: 'Candidate available' },
  { state: 'held', label: 'Held, tentative' },
  { state: 'changed', label: 'Just changed' },
  { state: 'dropped', label: 'Dropped out' },
];

function CalendarCard({ state, validation }) {
  const blocks = useMemo(() => blocksFor(state), [state]);
  const ok = validation.violations.length === 0;
  return (
    <Card className={styles.calendar}>
      <CardHead aside={<Pill>EST · candidate time</Pill>}>
        <CardTitle>{firstName(CANDIDATE)}&apos;s loop</CardTitle>
      </CardHead>
      <p className={styles.calendarLede}>
        {CANDIDATE.name}, New York · {COMPANY.loop} at {COMPANY.name}{' '}
        <span className={styles.muted}>(fictional)</span>
      </p>
      <ScheduleStrip
        days={STRIP_DAYS}
        from={10}
        to={18}
        blocks={blocks}
        windows={WINDOWS}
        tz="EST"
        legend={LEGEND}
        label="The candidate's interview week, Tuesday to Friday, in Eastern time"
      />
      <ul className={styles.loopList}>
        {SESSIONS.map(session => {
          const item = state.world.plan[session.id];
          const person = interviewerById(item.interviewer);
          const dropped = state.dropout?.session === session.id;
          return (
            <li
              key={session.id}
              data-changed={state.changed.includes(session.id) || undefined}
            >
              <span className={styles.loopTitle}>
                {session.title}
                {session.order !== 'any' && (
                  <span className={styles.loopRule}>{session.order}</span>
                )}
              </span>
              <span className={styles.loopWhen}>
                {candidateRange(session.id, item.start).replace(/, \d{4}/, '')}
              </span>
              <span className={styles.loopWho}>
                {person.name}
                <span className={styles.muted}>
                  {' '}
                  · {localRange(person, session.id, item.start)}
                </span>
              </span>
              <span className={styles.loopStatus}>
                {dropped ? (
                  <Tag tone="bad">dropped</Tag>
                ) : item.status === 'held' ? (
                  <Tag tone="warn">held</Tag>
                ) : (
                  <Tag tone="ok">booked</Tag>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <div className={styles.invariants} data-ok={ok || undefined}>
        <StatusIcon status={ok ? 'pass' : 'fail'} variant="soft" />
        <span>
          {ok ? (
            <>
              <strong>
                {validation.total} of {validation.total} rule checks pass
              </strong>{' '}
              no double-booking, working hours, load caps, order, buffers
            </>
          ) : (
            <>
              <strong>
                {validation.violations.length} rule check
                {validation.violations.length === 1 ? '' : 's'} failing
              </strong>{' '}
              {validation.violations[0].label}: {validation.violations[0].detail}
            </>
          )}
        </span>
      </div>
    </Card>
  );
}

// --- the dropout message -------------------------------------------------------------------------

function MessageCard({ sampleId, message, onPick, onEdit, onRun, busy, hasKey, notice }) {
  const sample = sampleById(sampleId);
  return (
    <Card as="form" onSubmit={onRun} className={styles.messageCard}>
      <CardHead aside={<Pill>editable</Pill>}>
        <CardTitle>The message that breaks the loop</CardTitle>
      </CardHead>
      <OptionList
        className={styles.samples}
        label="Sample messages"
        options={SAMPLE_OPTIONS}
        value={sampleId}
        onChange={onPick}
      />
      {sample && (
        <p className={styles.messageMeta}>
          <strong>{sample.from}</strong> · {sample.channel} · {sample.received}
        </p>
      )}
      <label className={srOnly} htmlFor="dropout-message">
        Dropout message
      </label>
      <TextArea
        id="dropout-message"
        className={styles.messageInput}
        value={message}
        maxLength={1200}
        spellCheck={false}
        onChange={event => onEdit(event.target.value)}
      />
      <div className={styles.runRow}>
        <Button type="submit" disabled={busy || !message.trim()}>
          {busy ? (
            <>
              <Spinner /> Rescuing
            </>
          ) : (
            <>
              <FiPlay aria-hidden /> Run the agent
            </>
          )}
        </Button>
        <span className={styles.muted}>
          {hasKey
            ? 'Live: about 3 cents a run, repeats are cached'
            : 'Preview: recorded runs of both samples'}
        </span>
      </div>
      {notice && (
        <Notice size="s" className={styles.notice} role="status">
          {notice}
        </Notice>
      )}
    </Card>
  );
}

// --- the run trace -----------------------------------------------------------------------------------

function RunCard({ run, nodes, onReplay, replayDisabled, sampleLabel }) {
  const total = nodes.reduce((sum, node) => sum + (run.nodes[node.id]?.ms || 0), 0);
  return (
    <Card aria-live="polite">
      <CardHead
        aside={
          <>
            {run.status === 'done' && (
              <span className={styles.total}>{formatMs(total)}</span>
            )}
            {run.kind === 'example' && run.status !== 'running' && (
              <Button variant="ghost" onClick={onReplay} disabled={replayDisabled}>
                <FiRotateCcw aria-hidden /> Replay
              </Button>
            )}
          </>
        }
      >
        <CardTitle>Agent run</CardTitle>
        <RunPill run={run} />
      </CardHead>
      {run.kind === 'example' && (
        <p className={styles.exampleNote}>
          <FiInfo aria-hidden />
          <span>
            Example run{sampleLabel ? ` of “${sampleLabel}”` : ''}. The DeepSeek tool
            call, Jev&apos;s answer and the drafts were recorded from a live run on{' '}
            {EXAMPLE.recordedOn} (replayed faster; the times shown are the live ones).
            Every tool call, check, option and hold is computed in your browser by the
            same code the API runs.
          </span>
        </p>
      )}
      <Timeline>
        {nodes.map((node, index) => (
          <NodeRow key={node.id} index={index} node={node} run={run} />
        ))}
      </Timeline>
      {run.error && (
        <Notice kind="error" size="s" className={styles.error} role="alert">
          {run.error}
        </Notice>
      )}
    </Card>
  );
}

function RunPill({ run }) {
  if (run.kind === 'example') return <Pill>Example run</Pill>;
  if (run.status === 'idle') return null;
  return (
    <Pill tone="live">
      Live{run.model ? ` · ${run.model}` : ''}
      {run.cached ? ' · cached' : ''}
    </Pill>
  );
}

function NodeRow({ index, node, run }) {
  const status = run.nodes[node.id] || { status: 'pending' };
  const calls = run.calls.filter(call => call.node === node.id);
  return (
    <TimelineStep
      index={index}
      status={status.status}
      title={
        <span className={styles.nodeTitle}>
          <span className={styles.kind} data-kind={node.kind}>
            {KIND_LABEL[node.kind]}
          </span>
          {node.kind === 'tool' ? <code>{node.label}</code> : node.label}
        </span>
      }
      detail={node.detail}
      ms={status.ms}
    >
      {calls.length > 0 && (
        <ul className={styles.calls}>
          {calls.map((call, callIndex) => (
            <CallRow key={`${call.name}-${callIndex}`} call={call} />
          ))}
        </ul>
      )}
      {node.id === 'decide' && run.decision && <DecisionLine decision={run.decision} />}
      {node.id === 'draftMessages' && run.draft && (
        <p className={styles.nodeNote}>
          {parseDrafts(run.draft).filter(d => d.to !== 'explain').length} drafts{' '}
          {status.status === 'done' ? 'written' : 'streaming'}
          {run.template ? ' (template fallback)' : ''} · not sent
        </p>
      )}
    </TimelineStep>
  );
}

function summarizeCall(call) {
  const r = call.result || {};
  switch (call.name) {
    case 'report_dropout':
      return r.error ? r.error : `${r.interviewer} · ${r.reason} · out ${r.out}`;
    case 'reschedule_interview':
      return `${call.args.session} → ${call.args.day} ${call.args.window}`;
    case 'answer_candidate':
      return 'Answer from the schedule, no change';
    case 'hand_to_recruiter':
      return 'Hand off to the recruiter';
    case 'getLoop':
      return `${r.sessions?.length} interviews · ${r.candidate?.name}`;
    case 'findQualifiedInterviewers':
      return `${r.qualified?.length} qualified · ${r.filtered_out?.length} filtered out`;
    case 'checkAvailability': {
      const passing = (r.results || []).filter(item => item.pass);
      return `${passing.length} of ${r.results?.length} pass${
        passing.length ? `: ${passing.map(item => item.interviewer).join(', ')}` : ''
      }`;
    }
    case 'scoreOptions': {
      const valid = OPTION_IDS.filter(id => r.options?.[id]?.valid).length;
      return `${valid} of 3 valid · rules floor: ${OPTION_LABELS[
        r.rules_floor
      ]?.toLowerCase()}`;
    }
    case 'holdSlot':
      return r.status === 'refused'
        ? `Refused: ${r.violations?.[0]}`
        : `${r.holds?.length} held · ${r.invariants}`;
    case 'findSlots':
      return r.status === 'no valid slot'
        ? `No valid slot in ${r.slots_tried} tried`
        : `${r.slots_tried} slots tried · ${r.chosen?.length} interview${
            r.chosen?.length === 1 ? '' : 's'
          } move`;
    case 'validateLoop':
      return `${r.checks} checks · ${r.violations} violations`;
    case 'draftMessages':
      return `${r.recipients?.length} recipients · not sent`;
    default:
      return '';
  }
}

function callTone(call) {
  const r = call.result || {};
  if (r.error || r.status === 'refused' || r.status === 'no valid slot') return 'bad';
  if (call.name === 'checkAvailability' && !(r.results || []).some(item => item.pass))
    return 'warn';
  return 'ok';
}

function CallRow({ call }) {
  return (
    <li className={styles.call}>
      <details>
        <summary>
          <Dot tone={callTone(call)} className={styles.callDot} />
          <span className={styles.callName}>
            <code>{call.name}</code>
            <code className={styles.callArgs}>{JSON.stringify(call.args)}</code>
          </span>
          <span className={styles.callSummary}>{summarizeCall(call)}</span>
        </summary>
        <div className={styles.callDetail}>
          <div>
            <MiniLabel>
              {call.kind === 'llm' ? 'tool call from the LLM' : 'arguments'}
            </MiniLabel>
            <JsonView value={call.args} />
          </div>
          <div>
            <MiniLabel>
              result{call.ms != null ? ` · ${formatMs(call.ms)}` : ''}
            </MiniLabel>
            <JsonView value={call.result} />
          </div>
        </div>
      </details>
    </li>
  );
}

function DecisionLine({ decision }) {
  return (
    <p className={styles.nodeNote}>
      {decision.model ? (
        <>
          Jev picked <strong>{OPTION_LABELS[decision.model.choice]}</strong> (
          {pct(decision.model.probabilities[decision.model.choice])})
          {decision.escalated ? (
            <>
              , rules escalated to <strong>{OPTION_LABELS[decision.final]}</strong>
            </>
          ) : (
            ', rules agree'
          )}
        </>
      ) : (
        <>Picked by rules: {OPTION_LABELS[decision.final]}</>
      )}
    </p>
  );
}

// --- decision ------------------------------------------------------------------------------------------

function DecisionCard({ run, state, onOverride, overrideLocked }) {
  const decision = run.decision;
  const options = run.options;
  const applied = state.override?.option || decision?.final;
  return (
    <Card>
      <CardHead aside={<Pill>Jev · 1 typed question</Pill>}>
        <CardTitle>Decision</CardTitle>
      </CardHead>
      {!decision ? (
        <EmptyState size="s" loading={run.status === 'running'}>
          {run.status === 'running'
            ? 'Waiting for the options…'
            : 'The repair appears here.'}
        </EmptyState>
      ) : (
        <>
          <p className={styles.question}>
            <code>repair</code> choice: swap, reschedule this interview, or the whole
            loop?
          </p>
          {decision.model ? (
            <ProbabilityBars
              options={OPTION_BARS}
              probabilities={decision.model.probabilities}
              choice={decision.model.choice}
            />
          ) : (
            <p className={styles.muted}>{decision.error}</p>
          )}
          <div className={styles.final}>
            <div className={styles.finalHead}>
              <MiniLabel>Applied</MiniLabel>
              <DecisionBadge tone={OPTION_TONE[applied]} size="l">
                {OPTION_LABELS[applied]}
              </DecisionBadge>
              {state.override && <Tag tone="bad">your override</Tag>}
            </div>
            <p className={styles.finalWhy}>
              {state.override
                ? `You overrode the agent. The rules re-checked your pick before holding it.`
                : decision.escalated
                ? `Rules escalated Jev's pick: the least disruptive valid repair is "${OPTION_LABELS[
                    decision.floor
                  ].toLowerCase()}". Rules can make the choice stricter, never looser.`
                : `Jev's pick, and at least as strict as the rules require (floor: ${OPTION_LABELS[
                    decision.floor
                  ].toLowerCase()}).`}
            </p>
          </div>
          {options && (
            <ul className={styles.options}>
              {OPTION_IDS.map(id => {
                const option = options[id];
                const isApplied = id === applied;
                return (
                  <li
                    key={id}
                    data-applied={isApplied || undefined}
                    data-valid={option.valid || undefined}
                  >
                    <div className={styles.optionHead}>
                      <StatusIcon
                        status={option.valid ? 'pass' : 'fail'}
                        variant="soft"
                      />
                      <strong>{OPTION_LABELS[id]}</strong>
                      {option.valid && (
                        <span className={styles.optionMeta}>
                          {option.candidate_impact.toLowerCase()} · {option.delay_days}{' '}
                          day
                          {option.delay_days === 1 ? '' : 's'} later
                        </span>
                      )}
                    </div>
                    <p>{option.text}</p>
                    {option.valid && !isApplied && run.status === 'done' && (
                      <Button
                        variant="link"
                        onClick={() => onOverride(id)}
                        disabled={overrideLocked}
                        className={styles.overrideButton}
                      >
                        Override: apply this instead
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {overrideLocked && run.status === 'done' && (
            <p className={styles.small}>
              Overrides lock once the candidate changes the loop; undo the change in the
              audit trail first.
            </p>
          )}
          <JsonDetails summary="What Jev saw (state JSON)" value={decision.state} />
        </>
      )}
    </Card>
  );
}

// --- candidate chat --------------------------------------------------------------------------------------

function ChatCard({
  innerRef,
  state,
  text,
  onText,
  onSend,
  busy,
  disabled,
  hasKey,
  notice,
}) {
  const messages = state.turns.map(turn => {
    if (turn.role === 'candidate') {
      return {
        id: turn.id,
        side: 'end',
        name: CANDIDATE.name,
        meta: 'Candidate · SMS',
        text: turn.text,
      };
    }
    const run = state.chatRuns[turn.id] || emptyRun();
    const explain = explainOf(run);
    return {
      id: turn.id,
      side: 'start',
      name: 'Scheduling agent',
      avatar: 'AI',
      meta: run.kind === 'example' ? 'Example' : run.cached ? 'Live · cached' : 'Live',
      text: run.error ? run.error : explain,
      pending: turn.pending && !explain,
      streaming: turn.pending,
      children: <TurnDetail run={run} />,
    };
  });

  return (
    <Card id="chat" ref={innerRef} className={styles.chatCard}>
      <CardHead aside={<Pill>multi-turn · same state</Pill>}>
        <CardTitle>Candidate chat</CardTitle>
      </CardHead>
      <p className={styles.cardLede}>
        {firstName(CANDIDATE)} writes back after the rescue. The agent reads the request
        as a tool call, replans on the live schedule, explains the change in one line and
        re-drafts everyone&apos;s messages.
      </p>
      <ChatThread
        className={styles.thread}
        messages={messages}
        label="Conversation with the candidate"
        empty={
          disabled
            ? 'The chat opens once the rescue is done.'
            : `Send ${firstName(CANDIDATE)}'s message below.`
        }
      />
      <form
        className={styles.chatForm}
        onSubmit={event => {
          event.preventDefault();
          onSend();
        }}
      >
        <div
          className={styles.presets}
          role="group"
          aria-label="Suggested candidate messages"
        >
          {CHAT_PRESETS.map(preset => (
            <Chip
              key={preset}
              type="button"
              onClick={() => onText(preset)}
              disabled={busy || disabled}
              aria-pressed={text === preset}
            >
              {preset}
            </Chip>
          ))}
        </div>
        <div className={styles.chatInputRow}>
          <label className={srOnly} htmlFor="chat-input">
            Message from the candidate
          </label>
          <TextArea
            id="chat-input"
            className={styles.chatInput}
            value={text}
            rows={2}
            maxLength={400}
            placeholder={`Write as ${firstName(CANDIDATE)}…`}
            onChange={event => onText(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            disabled={disabled}
          />
          <Button type="submit" disabled={busy || disabled || !text.trim()}>
            {busy ? <Spinner /> : <FiSend aria-hidden />} Send
          </Button>
        </div>
        <span className={styles.muted}>
          {hasKey
            ? 'Live: about 2 cents a turn. Type anything as the candidate.'
            : 'Preview: the suggested messages run on your current schedule.'}
        </span>
      </form>
      {notice && (
        <Notice size="s" className={styles.notice} role="status">
          {notice}
        </Notice>
      )}
    </Card>
  );
}

function TurnDetail({ run }) {
  const changes = run.changes || [];
  const steps = CHAT_NODES.filter(node => run.nodes[node.id]);
  if (!steps.length) return null;
  return (
    <div className={styles.turnDetail}>
      {changes.length > 0 && (
        <ul className={styles.changes}>
          {changes.map(change => (
            <li key={change.session}>
              <strong>{change.title}</strong>
              <span className={styles.changeFrom}>{shortWhen(change.from)}</span>
              <span aria-hidden>→</span>
              <span className={styles.changeTo}>{shortWhen(change.to)}</span>
            </li>
          ))}
        </ul>
      )}
      <details className={styles.steps}>
        <summary>
          {steps.length} graph steps · {run.calls.length} tool calls
          {run.template
            ? ' · template reply'
            : run.explainTemplate
            ? ' · reply line from template'
            : ''}
        </summary>
        <Timeline>
          {steps.map((node, index) => (
            <NodeRow key={node.id} index={index} node={node} run={run} />
          ))}
        </Timeline>
      </details>
    </div>
  );
}

const shortWhen = text =>
  text.replace(/^(\w{3}), \w{3} \d+, /, '$1 ').replace(/–[\d:]+/, '');

// --- drafted messages --------------------------------------------------------------------------------------

const CHANNEL_TONE = { 'Email + SMS': 'live', Slack: 'neutral', Teams: 'neutral' };

function DraftsCard({ rescue, chatRun, override, view, onView }) {
  const fromChat = view === 'chat' && chatRun;
  const run = fromChat ? chatRun : rescue;
  const drafts =
    !fromChat && override
      ? override.drafts
      : parseDrafts(run?.draft || '').filter(item => item.to !== 'explain');
  const recipients = !fromChat && override ? override.recipients : run?.recipients || [];
  const streaming = run?.status === 'running';
  const template = !fromChat && override ? true : run?.template;

  return (
    <Card>
      <CardHead
        aside={
          chatRun ? (
            <SegmentedControl
              label="Which drafts"
              value={view}
              onChange={onView}
              options={[
                { value: 'rescue', label: 'After rescue' },
                { value: 'chat', label: 'After chat' },
              ]}
            />
          ) : null
        }
      >
        <CardTitle>Drafted messages</CardTitle>
        <Pill>not sent</Pill>
        {template && <Pill tone="warn">template</Pill>}
      </CardHead>
      {!drafts.length ? (
        <EmptyState size="s" loading={streaming}>
          {streaming ? 'Drafting…' : 'Messages to everyone affected appear here.'}
        </EmptyState>
      ) : (
        <ul className={styles.drafts}>
          {drafts.map((draftItem, index) => {
            const recipient = recipients.find(item => item.id === draftItem.to);
            return (
              <li key={`${draftItem.to}-${index}`}>
                <div className={styles.draftHead}>
                  <strong>{recipient?.name || draftItem.to}</strong>
                  <span className={styles.muted}>{recipient?.role}</span>
                  {recipient?.channel && (
                    <Pill tone={CHANNEL_TONE[recipient.channel] || 'neutral'}>
                      {recipient.channel}
                    </Pill>
                  )}
                </div>
                <p className={styles.draftText}>{draftItem.text}</p>
              </li>
            );
          })}
        </ul>
      )}
      {template && (
        <p className={styles.small}>
          {override
            ? 'Template drafts after your override (live mode would re-draft them with the LLM).'
            : 'Template drafts: this preview turn has no recorded LLM text. Live mode writes them with DeepSeek.'}
        </p>
      )}
    </Card>
  );
}

// --- audit trail --------------------------------------------------------------------------------------

function AuditCard({ state, onUndo, busy }) {
  return (
    <Card id="audit" className={styles.auditCard}>
      <CardHead
        aside={
          <Button
            variant="ghost"
            onClick={onUndo}
            disabled={busy || !state.history.length}
          >
            <FiRotateCcw aria-hidden /> Undo last change
          </Button>
        }
      >
        <CardTitle>Audit trail</CardTitle>
        <Pill>{state.audit.length} entries</Pill>
      </CardHead>
      <p className={styles.cardLede}>
        Every action the agent takes, every judgement and every human override, in order.
      </p>
      <AuditTrail items={state.audit} empty="Nothing yet." />
    </Card>
  );
}

// --- how it works ------------------------------------------------------------------------------------

const FLOW = [
  { label: 'Read', what: 'LLM tool call: report_dropout', cost: '1 call' },
  { label: 'Check', what: '5 deterministic tools', cost: 'code, free' },
  { label: 'Decide', what: 'Jev picks, rules set a floor', cost: '1 call' },
  { label: 'Hold + draft', what: 'Re-check, hold, stream drafts', cost: '1 call' },
  { label: 'Chat', what: 'Multi-turn replans, same state', cost: '2 calls a turn' },
];

const GRAPH_CODE = `// agent.js: two small graphs, LangGraph-style (nodes over a typed state)
export const RESCUE_GRAPH = {
  start: 'intake',
  nodes: { intake, getLoop, findQualifiedInterviewers, checkAvailability,
           scoreOptions, decide, holdSlot, draftMessages },
  edges: {
    intake: s => (s.dropout.ok ? 'getLoop' : END),  // not a dropout: stop
    getLoop: 'findQualifiedInterviewers',
    findQualifiedInterviewers: 'checkAvailability',
    checkAvailability: 'scoreOptions',
    scoreOptions: 'decide',                    // Jev + rules floor
    decide: 'holdSlot',
    holdSlot: s => (s.hold.ok ? 'draftMessages' : END), // re-check failed: stop
    draftMessages: END,
  },
};

export const CHAT_GRAPH = {
  start: 'understand',                         // LLM picks one of 3 tools
  edges: {
    understand: s => s.intent === 'reschedule_interview' ? 'findSlots'
                   : s.intent === 'answer_candidate' ? END : 'draftMessages',
    findSlots: s => (s.found.ok ? 'validateLoop' : 'draftMessages'),
    validateLoop: 'holdSlot',
    holdSlot: 'draftMessages',
    draftMessages: END,
  },
};`;

const NOTES = [
  {
    title: 'The model never books anything',
    text: 'DeepSeek reads free text into tool calls and writes messages. Every calendar, time-zone, load and order check is plain code, run again right before each hold.',
  },
  {
    title: 'Rules only escalate',
    text: 'Jev picks the repair with probabilities; rules set a floor (the least disruptive valid option). A confident model cannot pick a swap that double-books someone.',
  },
  {
    title: 'One state, many turns',
    text: 'The rescue and every chat turn run on the same schedule object, so a candidate request is replanned against the swap that just happened.',
  },
  {
    title: 'Humans stay in charge',
    text: 'Holds are tentative, nothing is sent, every step lands in the audit trail, and a recruiter can override the repair or undo any change.',
  },
];

function HowItWorks() {
  return (
    <section id="how" className={styles.section} aria-labelledby="how-heading">
      <SectionHead
        titleId="how-heading"
        title="How it works"
        lede="Two explicit state machines over one typed state. The nodes are small, testable functions; the edges are code, so a run is cheap, fast and replayable, and every branch is visible in the trace above."
      />
      <div className={styles.howGrid}>
        <PipelineStrip steps={FLOW} className={styles.flow} />
        <CodeView code={GRAPH_CODE} lang="js" title="agent.js" className={styles.code} />
        <NoteGrid items={NOTES} variant="boxed" className={styles.notes} />
      </div>
    </section>
  );
}
