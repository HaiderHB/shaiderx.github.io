// CoinTracker demo: "Nino desk", an agent whose work a household and its CPA can review.
// Live at /demo/cointracker/ (unlisted, noindex). "Prepare my 2026 tax file" runs an agent: the LLM reads
// five sample documents into a typed record (checked in code against the documents), code checks the
// file against a checklist, the LLM proposes actions (each checked in code), and a fast decision model
// routes each one with probabilities: auto-run, the household's approval or CPA review. Code has the
// final say (money never auto-runs; a failed check goes to a person). Approved money moves are sent once
// under an idempotency key to a simulated broker (a timeout and a replayed retry make no duplicate), then
// verified against the broker before they count as done. The missing 1099-INT is a handoff: the run
// pauses at step 6 and resumes there when the household answers. The preset replays a recorded live run;
// edited figures and custom questions run live with a demo key. Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, postJson, streamFromApi } from 'demos/client';
import { NoteGrid, PipelineStrip, SectionHead, srOnly } from 'demos/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ON_FILE,
  ROUTE_LABEL,
  SESSION_PATTERN,
  STEPS,
  assemble,
  checkInterest,
  editAction,
  executeOnce,
  executionPayload,
  idempotencyKey,
  memoryStore,
  money,
  newSessionId,
  payloadHash,
  scheduleB,
  verifyFinished,
} from './agent';
import { DOCUMENTS, FIGURES, documentText, editableValues, withEdits } from './data';
import { EXAMPLE } from './example';
import {
  ActionsBoard,
  AgentCard,
  AuditCard,
  CpaQueue,
  DocumentsCard,
  ExecPanel,
  HandoffCard,
  HouseholdQueue,
  LiveCard,
  ProgressStrip,
  RecordCard,
  ViewSwitch,
  shortKey,
} from './panels';
import styles from './Cointracker.module.css';

const API = '/api/demo/cointracker';
const NAV = [
  { href: '#desk', label: 'Agent' },
  { href: '#review', label: 'Review' },
  { href: '#handoff', label: 'Handoff' },
  { href: '#file', label: 'The file' },
  { href: '#audit', label: 'Audit' },
];

const FLOW = [
  { label: 'Read', what: 'The LLM reads five documents into a typed record', cost: '1 call' },
  { label: 'Check', what: 'Code checks every figure and the checklist', cost: 'code, free' },
  { label: 'Propose', what: 'The LLM proposes requests, strategies, reviews', cost: '1 call' },
  { label: 'Route', what: 'A fast decision model: run, approve or review', cost: '1 call each' },
  { label: 'Execute', what: 'Once per key, then verified at the broker', cost: 'free' },
];

const NOTES = [
  {
    title: 'The LLM proposes, code decides',
    text: 'The LLM reads and proposes. Code checks every figure against the documents, every action against the record, and redoes the tax estimates. In the recorded run it caught the LLM overstating the 401(k) saving.',
  },
  {
    title: 'Money never auto-runs',
    text: 'The decision model routes with probabilities you can audit, but code sets the floor: a trade or a payroll change always waits for the household, and the execute route refuses it without an approval.',
  },
  {
    title: 'Retries cannot double-trade',
    text: 'The idempotency key is the action id plus a hash of the exact payload, claimed with SET NX before the order exists. A timeout and a retry return the first order; an edit makes a new key.',
  },
  {
    title: 'Done means verified',
    text: 'An action is done only when a fresh read of the broker matches what was approved: one order for the key, the lot down by the right amount, the cash in, the loss on the books.',
  },
  {
    title: 'Handoffs resume, not restart',
    text: 'A missing form pauses the run at the step that needs it, with steps 1-5 saved. The household uploads it or says "none", and the agent continues from that step.',
  },
  {
    title: 'Cheap and cached',
    text: 'A live run is two LLM calls and one decision call per action, about 6 cents; the same figures run once. The preset replays a recorded live run, so it is instant and free.',
  },
];

const ASK_PRESETS = ['What is still missing?', 'Why sell the SOL lot now?', 'What does the CPA have to decide?'];

const recordedDay = EXAMPLE.recorded
  ? new Date(`${EXAMPLE.recorded}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  : '';
const EXAMPLE_NOTE = `Recorded run: the LLM's record and actions and the decision model's routes were recorded live on ${recordedDay} and replay here, faster (times shown are the live ones). The checks, the routes' code floor, the approvals, the broker and the handoff run now, on the same code as the API.`;

const SIMULATED_AUTO = { choice: 'auto', probabilities: { auto: 0.88, household: 0.1, cpa: 0.02 }, simulated: true };

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pace = ms => (reducedMotion() ? 0 : ms);

let auditIds = 0;
const audit = (actor, tone, text) => ({ id: `a${(auditIds += 1)}`, at: Date.now(), actor, tone, text });
let requestIds = 0;

function tabSession() {
  try {
    let session = sessionStorage.getItem('cointrackerSession');
    if (!session || !SESSION_PATTERN.test(session)) {
      session = newSessionId();
      sessionStorage.setItem('cointrackerSession', session);
    }
    return session;
  } catch {
    return newSessionId();
  }
}

const EMPTY_STEPS = Object.fromEntries(STEPS.map(step => [step.id, { status: 'pending' }]));
const EMPTY_RUN = { kind: 'example', status: 'idle', steps: EMPTY_STEPS, record: null, actions: [], decisions: {}, edits: null, runId: null };
const EMPTY_HANDOFF = { status: 'waiting', resumed: null };

export default function CointrackerDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [run, setRun] = useState(EMPTY_RUN);
  const [states, setStates] = useState({});
  const [guardTest, setGuardTest] = useState(null);
  const [handoff, setHandoff] = useState(EMPTY_HANDOFF);
  const [view, setView] = useState('household');
  const [auditItems, setAuditItems] = useState([]);
  const [docId, setDocId] = useState('w2');
  const [edits, setEdits] = useState(() => editableValues(FIGURES));
  const [liveNotice, setLiveNotice] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState({ text: '', label: '' });
  const [asking, setAsking] = useState(false);
  const [askNotice, setAskNotice] = useState('');
  const runToken = useRef(0);
  const browserStore = useRef(null);
  const session = useRef(null);

  const log = useCallback((...entries) => setAuditItems(items => [...items, ...entries].slice(-80)), []);
  const patch = useCallback((id, change) => setStates(map => ({ ...map, [id]: { ...map[id], ...(typeof change === 'function' ? change(map[id] || {}) : change) } })), []);

  const figures = useMemo(() => withEdits(run.edits), [run.edits]);
  const effective = useMemo(() => run.actions.map(action => states[action.id]?.override || action), [run.actions, states]);
  const decisions = useMemo(() => (guardTest ? { ...run.decisions, [guardTest]: SIMULATED_AUTO } : run.decisions), [run.decisions, guardTest]);
  const derived = useMemo(() => assemble({ record: run.record, actions: effective, decisions, figures }), [run.record, effective, decisions, figures]);
  const landed = ['paused', 'resumed'].includes(run.status) && derived.actions.length > 0;

  // --- run the agent ---------------------------------------------------------------------------------

  const setStep = (id, value) => setRun(current => ({ ...current, steps: { ...current.steps, [id]: { ...current.steps[id], ...value } } }));

  /** Once the routes are in: auto-run actions run now (a reminder), everything else waits. */
  const land = useCallback(
    (actions, record, runDecisions, runFigures, kind) => {
      const view_ = assemble({ record, actions, decisions: runDecisions, figures: runFigures });
      const next = {};
      for (const action of view_.actions) next[action.id] = { status: action.final.route === 'auto' ? 'ran' : 'pending' };
      setStates(next);
      const counts = ['auto', 'household', 'cpa'].map(route => `${view_.actions.filter(action => action.final.route === route).length} ${route === 'cpa' ? ROUTE_LABEL[route] : ROUTE_LABEL[route].toLowerCase()}`);
      log(audit('Decision model', 'accent', `Routed ${view_.actions.length} actions: ${counts.join(', ')}${kind === 'example' ? ' (recorded)' : ''}`));
      for (const action of view_.actions) {
        if (action.final.route === 'auto') log(audit('Agent', 'ok', `Ran on its own: ${action.title}. Message sent to the household (simulated).`));
        else if (action.moneyMoves) log(audit('Code', 'warn', `${action.title}: moves money, held for the household's approval.`));
        else log(audit('Queue', 'accent', `${action.title}: in the CPA queue.`));
      }
      log(audit('Agent', 'warn', 'Paused at step 6 (interest and dividends): waiting on the household for the 1099-INT.'));
    },
    [log]
  );

  const replayExample = useCallback(async () => {
    const token = (runToken.current += 1);
    const { record, actions, decisions: recorded, timings } = EXAMPLE.run;
    setGuardTest(null);
    setHandoff(EMPTY_HANDOFF);
    setStates({});
    setRun({ ...EMPTY_RUN, kind: 'example', status: 'running' });
    log(audit('Household', 'muted', 'Asked the agent to prepare the 2026 tax file.'));
    const plan = [
      ['list', 250, { detail: `${ON_FILE.length} documents on file`, ms: 4 }],
      ['extract', 650, { detail: '26 of 26 figures match', ms: timings.extract }, { record }],
      ['complete', 220, { detail: '5 of 7 documents', ms: 2 }],
      ['propose', 650, { detail: `${actions.length} actions`, ms: timings.propose }, { actions }],
      ['route', 380, { detail: `${actions.length} routed`, ms: timings.route }, { decisions: recorded }],
    ];
    for (const [id, wait, done, data] of plan) {
      setStep(id, { status: 'running' });
      await sleep(pace(wait));
      if (runToken.current !== token) return;
      setRun(current => ({ ...current, ...(data || {}), steps: { ...current.steps, [id]: { status: 'done', ...done } } }));
    }
    setRun(current => ({ ...current, status: 'paused', runId: 'example', steps: { ...current.steps, scheduleB: { status: 'paused', detail: 'Waiting on the household' } } }));
    log(audit('Code', 'ok', 'Record checked: 26 of 26 figures match the documents. File: 5 of 7 documents.'));
    land(actions, record, recorded, FIGURES, 'example');
  }, [land, log]);

  const runLive = useCallback(async () => {
    if (!getDemoKey()) {
      setLiveNotice('Preview mode: edited figures run live with the private link from my message. The recorded run above works without it.');
      return;
    }
    const token = (runToken.current += 1);
    setLiveNotice('');
    setGuardTest(null);
    setHandoff(EMPTY_HANDOFF);
    setStates({});
    const runEdits = { ...edits };
    setRun({ ...EMPTY_RUN, kind: 'live', status: 'running', edits: runEdits });
    log(audit('Household', 'muted', `Re-ran the agent live with edited figures (SOL value ${money(runEdits.solValue)}, basis ${money(runEdits.solBasis)}, 401(k) so far ${money(runEdits.k401Ytd)}, roof ${money(runEdits.roofCost)}).`));
    document.getElementById('desk')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    let seen = 0;
    const collected = {};
    try {
      await streamFromApi(`${API}/run/`, { edits: runEdits }, (chunk, text) => {
        if (runToken.current !== token) return;
        const lines = text.split('\n');
        const complete = lines.slice(0, -1);
        for (const line of complete.slice(seen)) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.t === 'step') {
            Object.assign(collected, event.data || {});
            setRun(current => ({ ...current, ...(event.data || {}), steps: { ...current.steps, [event.id]: { status: event.status, detail: event.detail, ms: event.ms } } }));
          } else if (event.t === 'end') {
            collected.runId = event.runId;
          } else if (event.t === 'error') {
            throw new Error(event.message);
          }
        }
        seen = complete.length;
      });
      if (runToken.current !== token) return;
      if (!collected.decisions) throw new Error('The live run stopped early. Try again.');
      setRun(current => ({ ...current, status: 'paused', runId: collected.runId }));
      land(collected.actions, collected.record, collected.decisions, withEdits(runEdits), 'live');
    } catch (error) {
      if (runToken.current !== token) return;
      setRun(current => ({ ...current, status: 'error', error: error.message }));
      log(audit('Server', 'bad', `Live run failed: ${error.message}`));
    }
  }, [edits, land, log]);

  const started = useRef(false);
  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    session.current = tabSession();
    browserStore.current = memoryStore();
    if (started.current) return;
    started.current = true;
    replayExample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- approve, edit, reject ------------------------------------------------------------------------

  const byId = id => derived.actions.find(action => action.id === id);
  const checkpoint = () => ({ record: run.record, actions: effective, decisions: run.decisions, edits: run.edits });

  async function send(action, { attempt, simulateTimeout, key }) {
    const payload = executionPayload(action);
    if (getDemoKey()) {
      return postJson(`${API}/execute/`, { op: 'execute', session: session.current, action: stripForApi(action), key, attempt, simulateTimeout, approvedBy: 'household' });
    }
    await sleep(pace(220));
    return executeOnce(browserStore.current, { session: session.current, key, actionId: action.id, payload, attempt, simulateTimeout });
  }

  const order = action => action.type === 'harvest_loss';
  const requestPath = action => (order(action) ? '/broker/orders' : '/payroll/elections');

  async function attemptOnce(action, attempt, { simulateTimeout, label }) {
    const key = states[action.id]?.key || (await keyFor(action));
    const rowId = `r${(requestIds += 1)}`;
    const started = Date.now();
    const meta = [`Idempotency-Key: ${shortKey(key)}`, `attempt ${attempt}`];
    patch(action.id, current => ({ key, requests: [...(current.requests || []).map(row => ({ ...row, highlight: false })), { id: rowId, at: started, method: 'POST', path: requestPath(action), status: 'pending', meta, highlight: true }] }));
    let result;
    try {
      result = await send(action, { attempt, simulateTimeout, key });
      if (result.timeout) await sleep(pace(1100)); // the wait before a client gives up (shortened)
    } catch (error) {
      result = { status: 409, error: error.message };
    }
    const ms = Date.now() - started;
    const thing = order(action) ? 'order' : 'change';
    const id = result.result?.orderId || result.result?.changeId;
    const row = result.timeout
      ? { status: 504, outcome: 'timed out', note: 'No confirmation. The order may have gone through.' }
      : result.replayed
      ? { status: 200, outcome: 'replayed', note: `Same key: ${id} from attempt ${result.result.attempt}. No second ${thing}.` }
      : result.status === 201
      ? { status: 201, outcome: 'created', note: order(action) ? `${id} · sell ${result.result.quantity} SOL @ ${money(result.result.price, { cents: true })} · +${money(result.result.proceeds)} · ${label}` : `${id} · ${money(result.result.perPaycheck)} a paycheck · ${label}` }
      : { status: result.status || 409, outcome: 'refused', note: result.error || 'Refused' };
    patch(action.id, current => ({
      requests: (current.requests || []).map(entry => (entry.id === rowId ? { ...entry, ...row, meta: [...meta, `${ms} ms`] } : entry)),
      result: result.result && !result.timeout ? result.result : current.result,
    }));
    if (result.timeout) log(audit('Broker', 'bad', `Attempt ${attempt} timed out: no confirmation (simulated). Retrying with the same key.`));
    else if (result.replayed) log(audit('Broker', 'muted', `Attempt ${attempt} returned ${id}, placed on attempt ${result.result.attempt}. No duplicate ${thing}.`));
    else if (result.status === 201) log(audit(order(action) ? 'Broker' : 'Payroll', 'ok', order(action) ? `Order ${id}: sold ${result.result.quantity} SOL for ${money(result.result.proceeds)} (simulated).` : `Payroll change ${id}: ${money(result.result.perPaycheck)} a paycheck (simulated).`));
    else log(audit('Broker', 'bad', `Refused: ${row.note}`));
    return result;
  }

  async function keyFor(action) {
    const payload = executionPayload(action);
    return idempotencyKey(action.id, payload, await payloadHash(payload));
  }

  async function approve(id) {
    const action = byId(id);
    if (!action || action.checks.some(check => check.status === 'fail')) return;
    const key = await keyFor(action);
    const simulateTimeout = Boolean(states[id]?.simulateTimeout);
    patch(id, { status: 'approved', busy: true, key, editing: false });
    log(audit('Household', 'accent', `Approved: ${action.title} (${order(action) ? `sell ${action.quantity} SOL` : `${money(action.perPaycheck)} a paycheck`}).`));
    let attempt = 1;
    let result = await attemptOnce(action, attempt, { simulateTimeout, label: 'approved by the household' });
    while (result.timeout && attempt < 3) {
      await sleep(pace(700)); // backoff, then the same key
      attempt += 1;
      result = await attemptOnce(action, attempt, { simulateTimeout, label: 'retry' });
    }
    patch(id, { busy: false, attempts: attempt });
  }

  async function replay(id) {
    const action = byId(id);
    const attempt = (states[id]?.attempts || 1) + 1;
    patch(id, { busy: true });
    await attemptOnce(action, attempt, { simulateTimeout: false, label: 'retry' });
    patch(id, { busy: false, attempts: attempt });
  }

  async function verify(id) {
    const action = byId(id);
    const key = states[id]?.key;
    if (!key) return;
    patch(id, { busy: true });
    const rowId = `r${(requestIds += 1)}`;
    const started = Date.now();
    const path = order(action) ? '/broker/positions' : '/payroll/elections';
    patch(id, current => ({ requests: [...(current.requests || []).map(row => ({ ...row, highlight: false })), { id: rowId, at: started, method: 'GET', path, status: 'pending', highlight: true }] }));
    let result;
    try {
      result = getDemoKey()
        ? await postJson(`${API}/execute/`, { op: 'verify', session: session.current, action: stripForApi(action), key })
        : (await sleep(pace(260)), await verifyFinished(browserStore.current, { session: session.current, key, payload: executionPayload(action) }));
    } catch (error) {
      result = { done: false, checks: [{ id: 'error', label: 'Could not read the broker', status: 'fail', detail: error.message }] };
    }
    const passed = result.checks.filter(check => check.status === 'pass').length;
    patch(id, current => ({
      busy: false,
      verify: result,
      status: result.done ? 'done' : current.status,
      requests: (current.requests || []).map(row =>
        row.id === rowId ? { ...row, status: 200, outcome: 'read', note: `${passed} of ${result.checks.length} checks match what was approved`, meta: [`${Date.now() - started} ms`] } : row
      ),
    }));
    log(result.done ? audit('Code', 'ok', `Verified at the broker: ${action.title} is done (${passed} of ${result.checks.length} checks).`) : audit('Code', 'bad', `Verification failed for ${action.title}: not marked done.`));
  }

  function reject(id) {
    const action = byId(id);
    patch(id, { status: 'rejected', editing: false });
    log(audit('Household', 'bad', `Rejected: ${action.title}. Nothing was sent.`));
  }

  function startEdit(id) {
    const action = byId(id);
    patch(id, current => ({ editing: !current.editing, draft: String(action.type === 'harvest_loss' ? action.quantity : action.perPaycheck) }));
  }

  function saveEdit(id) {
    const base = run.actions.find(action => action.id === id);
    const value = states[id]?.draft;
    const edited = editAction(base, value, figures);
    patch(id, { override: edited, editing: false });
    log(audit('Household', 'accent', `Edited ${base.title}: ${base.type === 'harvest_loss' ? `${edited.quantity} SOL` : `${money(edited.perPaycheck)} a paycheck`}. Code re-ran the checks.`));
  }

  // --- the CPA -----------------------------------------------------------------------------------------

  function signOff(id) {
    const action = byId(id);
    const choice = states[id]?.choice ?? 0;
    patch(id, { status: 'approved', choice });
    log(audit('CPA', 'ok', `Signed off: ${action.options?.[choice]?.label || 'treatment'} for ${money(action.amount)}.`));
  }

  function sendBack(id) {
    const action = byId(id);
    patch(id, { status: 'rejected' });
    log(audit('CPA', 'warn', `Sent back "${action.title}": asked the household for the invoice.`));
  }

  // --- the handoff ---------------------------------------------------------------------------------

  async function answerHandoff(answer) {
    if (!landed || handoff.status === 'working') return;
    setHandoff(current => ({ ...current, status: 'working' }));
    setStep('scheduleB', { status: 'running', detail: 'Resuming at step 6' });
    log(audit('Household', 'accent', answer === 'upload' ? 'Uploaded the 1099-INT (sample file).' : 'Answered: no 1099-INT this year.'));
    let resumed;
    try {
      if (run.kind === 'live' && getDemoKey()) {
        resumed = await postJson(`${API}/resume/`, { runId: run.runId, answer, run: checkpoint() });
      } else {
        await sleep(pace(answer === 'upload' ? 900 : 300));
        const form = answer === 'upload' ? EXAMPLE.interest?.form : null;
        resumed = {
          resumedAt: 6,
          answer,
          form,
          checks: answer === 'upload' ? checkInterest(form) : [],
          schedule: scheduleB(run.record, form, answer === 'none'),
          ms: answer === 'upload' ? EXAMPLE.interest?.ms : 0,
          recorded: true,
        };
      }
    } catch (error) {
      setHandoff(current => ({ ...current, status: 'waiting' }));
      setStep('scheduleB', { status: 'paused', detail: 'Waiting on the household' });
      log(audit('Server', 'bad', `Resume failed: ${error.message}`));
      return;
    }
    setHandoff({ status: answer === 'upload' ? 'uploaded' : 'none', resumed });
    setRun(current => ({
      ...current,
      status: 'resumed',
      steps: {
        ...current.steps,
        scheduleB: { status: 'done', detail: `interest ${answer === 'none' ? 'none' : money(resumed.form?.interest)} · dividends ${money(run.record?.dividends?.ordinary)}`, ms: resumed.ms || undefined },
      },
    }));
    if (answer === 'upload') setDocId('int1099');
    log(
      audit(
        'Agent',
        'ok',
        `Resumed at step 6, not a restart: ${answer === 'upload' ? `read the 1099-INT (${money(resumed.form?.interest)} interest${resumed.recorded ? ', recorded read' : ''}), ` : ''}built interest and dividends.`
      )
    );
  }

  // --- ask the file --------------------------------------------------------------------------------------

  async function ask(text) {
    const q = String(text || '').trim();
    if (q.length < 3 || !run.record) return;
    setQuestion(q);
    setAskNotice('');
    const recorded = run.kind === 'example' && EXAMPLE.answers?.[q];
    if (recorded) {
      setAsking(true);
      setAnswer({ text: '', label: '' });
      await sleep(pace(450));
      setAnswer({ text: recorded, label: 'Recorded answer' });
      setAsking(false);
      return;
    }
    if (!getDemoKey()) {
      setAskNotice('Preview mode: your own questions run live with the private link from my message. The three suggested ones have recorded answers.');
      return;
    }
    setAsking(true);
    setAnswer({ text: '', label: 'Live answer' });
    try {
      await streamFromApi(`${API}/ask/`, { runId: run.runId, question: q, run: checkpoint() }, (chunk, full) => setAnswer({ text: full, label: 'Live answer' }));
    } catch (error) {
      setAskNotice(error.message);
    }
    setAsking(false);
  }

  // --- derived for the page ---------------------------------------------------------------------------

  const actions = derived.actions;
  const householdActions = actions.filter(action => action.final.route === 'household');
  const cpaActions = actions.filter(action => action.final.route === 'cpa');
  const request = actions.find(action => action.type === 'request_documents');
  const isDone = id => ['ran', 'approved', 'done'].includes(states[id]?.status);
  const docsHave = ON_FILE.length + (handoff.status === 'uploaded' || handoff.status === 'none' ? 1 : 0);
  const approvedCount = actions.filter(action => isDone(action.id)).length;
  const cpaDone = cpaActions.filter(action => isDone(action.id)).length;
  const waitingOnYou = householdActions.filter(action => (states[action.id]?.status || 'pending') === 'pending').length;
  const status = !landed
    ? { text: run.status === 'running' ? 'Agent working' : 'Not started', tone: 'neutral' }
    : waitingOnYou || handoff.status === 'waiting'
    ? { text: 'Waiting on the household', tone: 'warn' }
    : cpaDone < cpaActions.length
    ? { text: 'With the CPA', tone: 'warn' }
    : { text: 'Ready to file in January', tone: 'ok' };

  const docs = handoff.status === 'uploaded' ? [...DOCUMENTS, { id: 'int1099', form: '1099-INT', title: 'Lakeside Bank', sub: 'Uploaded at the handoff (sample file)' }] : DOCUMENTS;
  const running = run.status === 'running';

  return (
    <DemoLayout
      company="CoinTracker"
      title="An agent that prepares the tax file"
      tagline="It reads the household's documents, finds what is missing and proposes moves before year end. Code checks its work, a decision model routes each action, and nothing that moves money runs without a person."
      accent="iris"
      nav={NAV}
      hero={<ProgressStrip docs={{ have: docsHave, total: 7 }} approved={{ have: approvedCount, total: actions.length }} cpa={{ have: cpaDone, total: cpaActions.length }} status={status} />}
    >
      <div className={styles.page}>
        <p className={styles.disclaimer}>Sample household, sample documents, simulated broker and payroll. Nothing here is tax advice.</p>

        <section id="desk" className={styles.section} aria-labelledby="desk-heading">
          <h2 id="desk-heading" className={srOnly}>
            The agent and its proposed actions
          </h2>
          <div className={styles.deskGrid}>
            <AgentCard run={run} onRun={replayExample} running={running} handoff={handoff} exampleNote={EXAMPLE_NOTE} />
            <ActionsBoard
              actions={actions}
              states={states}
              figures={figures}
              landed={landed}
              guardTest={guardTest}
              onGuardTest={id => {
                setGuardTest(current => (current === id ? null : id));
                log(audit('Code', 'warn', guardTest === id ? 'Guard test off: the real model answer is back.' : 'Guard test: simulated the model saying auto-run 88% for the sell order. Code kept it with the household.'));
              }}
            />
          </div>
        </section>

        <section className={styles.section} aria-label="How a run works">
          <PipelineStrip steps={FLOW} label="How a run works" />
        </section>

        <section id="review" className={styles.section} aria-labelledby="review-heading">
          <SectionHead
            variant="eyebrow"
            kicker="Two queues, one file"
            titleId="review-heading"
            title="Review and approve"
            lede="Each card shows what the agent saw, why, the numbers and what will happen. The household approves money moves; the CPA has its own queue."
            action={<ViewSwitch value={view} onChange={setView} counts={{ household: householdActions.length, cpa: cpaActions.length }} />}
          />
          {view === 'household' ? (
            <HouseholdQueue
              actions={householdActions}
              states={states}
              figures={figures}
              onApprove={approve}
              onReject={reject}
              onEdit={startEdit}
              onDraft={(id, value) => patch(id, { draft: value })}
              onSaveEdit={saveEdit}
              onCancelEdit={id => patch(id, { editing: false })}
              renderExec={action => (
                <ExecPanel
                  action={action}
                  state={states[action.id] || {}}
                  hasKey={hasKey}
                  onToggleTimeout={() => patch(action.id, current => ({ simulateTimeout: !current.simulateTimeout }))}
                  onReplay={() => replay(action.id)}
                  onVerify={() => verify(action.id)}
                />
              )}
            />
          ) : (
            <CpaQueue
              actions={cpaActions}
              others={actions.filter(action => action.final.route !== 'cpa')}
              states={states}
              onChoose={(id, choice) => patch(id, { choice })}
              onSignOff={signOff}
              onSendBack={sendBack}
            />
          )}
        </section>

        <section id="handoff" className={styles.section} aria-labelledby="handoff-heading">
          <SectionHead
            titleId="handoff-heading"
            title="Missing information, handed to a person"
            lede="The agent cannot invent a 1099-INT. It asks once, plainly, and pauses at the step that needs it. When the household answers, it resumes there."
          />
          <HandoffCard request={request} requestState={request ? states[request.id] : null} handoff={handoff} onUpload={() => answerHandoff('upload')} onNone={() => answerHandoff('none')} landed={landed} />
        </section>

        <section id="file" className={styles.section} aria-labelledby="file-heading">
          <SectionHead titleId="file-heading" title="The file" lede="The documents the agent read, the typed record it built, and the checks code ran on it. Change the figures to run it live." />
          <div className={styles.fileGrid}>
            <DocumentsCard docs={docs} docId={docId} onPick={setDocId} text={documentText(docId, figures)} />
            <RecordCard view={derived} record={run.record} />
          </div>
          <LiveCard
            hasKey={hasKey}
            edits={edits}
            onEdit={(id, value) => setEdits(current => ({ ...current, [id]: value }))}
            onRerun={runLive}
            running={running}
            notice={liveNotice}
            presets={ASK_PRESETS}
            onAsk={ask}
            question={question}
            onQuestion={setQuestion}
            answer={answer}
            asking={asking}
            askNotice={askNotice}
          />
        </section>

        <section id="audit" className={styles.section} aria-labelledby="audit-heading">
          <SectionHead titleId="audit-heading" title="Audit trail" lede="Every step: the agent, code, the decision model, the household, the broker and the CPA." />
          <AuditCard items={auditItems} />
        </section>

        <section className={styles.section} aria-labelledby="notes-heading">
          <SectionHead titleId="notes-heading" title="Design choices" flush />
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}

/** The fields the execute route needs (the route rebuilds and checks the payload itself). */
function stripForApi(action) {
  const { id, type, title, why, lotId, quantity, costBasis, marketValue, loss, estimatedTaxSaved, upside, tradeoff, ytd, currentPerPaycheck, perPaycheck, paychecks, limit } = action;
  return { id, type, title, why, lotId, quantity, costBasis, marketValue, loss, estimatedTaxSaved, upside, tradeoff, ytd, currentPerPaycheck, perPaycheck, paychecks, limit };
}
