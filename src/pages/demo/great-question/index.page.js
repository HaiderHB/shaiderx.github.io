// AI Moderator demo for Great Question: a realtime voice interview (OpenAI Realtime over
// WebRTC), a live Jev guardrail on every moderator turn, quote-backed findings, and an MCP
// tool surface over those findings. Live at /demo/great-question/ (unlisted, noindex).
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, postJson, streamFromApi } from 'demos/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiFileText, FiMic, FiPhoneOff, FiSend, FiSquare } from 'react-icons/fi';
import { FindingCards } from './Findings';
import styles from './GreatQuestion.module.css';
import { Guide } from './Guide';
import { McpPanel } from './McpPanel';
import {
  CLOSING_LINE,
  EXAMPLE_FINDINGS,
  EXAMPLE_TURNS,
  GUIDE,
  MAX_TEXT_ANSWERS,
  MAX_VOICE_SECONDS,
  formatTime,
} from './study';
import { Transcript } from './Transcript';
import {
  applyRealtimeEvent,
  connectRealtime,
  getMicrophone,
  settleTurns,
  voiceSupport,
  watchLevel,
} from './voice';

const API = '/api/demo/great-question';
const MAX_CHECKS = 16; // guardrail calls per interview
const TIME_CHECK_AT = 30; // seconds left when the moderator is told to wrap up

const PREVIEW_TEXT =
  'Preview mode. The private link from my email turns on live interviews. The example run shows a full session.';

const END_REASONS = {
  time: '3-minute cap reached',
  wrapup: 'Moderator wrapped up',
  user: 'You ended the interview',
  dropped: 'Connection dropped',
  limit: 'Answer limit reached',
};

function errorText(error) {
  if (error?.code === 'key_missing') return PREVIEW_TEXT;
  return error?.message || 'Something went wrong. Try again.';
}

const plain = text =>
  String(text)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[.!]/g, '');
const isClosing = text => plain(text).includes(plain(CLOSING_LINE));

export default function GreatQuestionDemo() {
  const [hasKey, setHasKey] = useState(true);
  const [mode, setMode] = useState('voice'); // voice | text
  const [status, setStatus] = useState('idle'); // idle | mic | connecting | live | ended
  const [view, setView] = useState('example'); // example | live
  const [turns, setTurnsState] = useState([]);
  const [notice, setNotice] = useState(null); // { kind: 'preview' | 'error' | 'info', text }
  const [remaining, setRemaining] = useState(MAX_VOICE_SECONDS);
  const [activity, setActivity] = useState(null); // moderator | participant | thinking | null
  const [endReason, setEndReason] = useState('');
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [findings, setFindings] = useState(null); // live findings: { findings, dropped }
  const [findingsState, setFindingsState] = useState({ loading: false, error: '' });
  const [highlight, setHighlight] = useState(null);

  const turnsRef = useRef([]);
  const callRef = useRef(null);
  const startedRef = useRef(0);
  const checksRef = useRef(0);
  const wrapRef = useRef(false);
  const activityRef = useRef(null);
  const meterRef = useRef(null);
  const audioRef = useRef(null);
  const interviewRef = useRef(null);

  useEffect(() => setHasKey(Boolean(getDemoKey())), []);

  const updateTurns = useCallback(update => {
    turnsRef.current = update(turnsRef.current);
    setTurnsState(turnsRef.current);
  }, []);

  const patchTurn = useCallback(
    (id, patch) =>
      updateTurns(list =>
        list.map(turn => (turn.id === id ? { ...turn, ...patch } : turn))
      ),
    [updateTurns]
  );

  const elapsed = () =>
    startedRef.current ? (performance.now() - startedRef.current) / 1000 : 0;

  const setActivityState = value => {
    activityRef.current = value;
    setActivity(value);
  };

  // --- ending -------------------------------------------------------------------------------

  const endVoice = useCallback(
    reason => {
      const call = callRef.current;
      if (!call) return;
      callRef.current = null;
      clearInterval(call.timer);
      clearTimeout(call.wrapTimer);
      call.connection?.close();
      call.mic.getTracks().forEach(track => track.stop());
      call.stopLevel();
      updateTurns(settleTurns);
      setActivityState(null);
      setStatus('ended');
      setEndReason(reason);
    },
    [updateTurns]
  );

  useEffect(() => () => endVoice('user'), [endVoice]);

  function scheduleWrapEnd(delay) {
    const call = callRef.current;
    if (!call) return;
    clearTimeout(call.wrapTimer);
    call.wrapTimer = setTimeout(() => endVoice('wrapup'), delay);
  }

  function onWrapUp() {
    if (wrapRef.current) return;
    wrapRef.current = true;
    if (mode === 'text' || !callRef.current) {
      setStatus(current => (current === 'live' ? 'ended' : current));
      setEndReason('wrapup');
      return;
    }
    // Let the moderator finish its closing line; output_audio_buffer.stopped ends sooner.
    scheduleWrapEnd(activityRef.current === 'moderator' ? 10_000 : 2500);
  }

  // --- guardrail ----------------------------------------------------------------------------

  async function runCheck(id, attempt = 0) {
    const list = turnsRef.current;
    const index = list.findIndex(turn => turn.id === id);
    const turn = list[index];
    if (!turn?.text) return;
    if (isClosing(turn.text)) onWrapUp();

    const previous = list
      .slice(0, index)
      .reverse()
      .find(item => item.role === 'participant');
    // The participant's transcript can land just after the moderator's reply.
    if (previous && !previous.final && attempt < 5) {
      setTimeout(() => runCheck(id, attempt + 1), 400);
      return;
    }

    if (checksRef.current >= MAX_CHECKS) {
      patchTurn(id, { check: { error: 'per-interview limit' } });
      return;
    }
    checksRef.current += 1;
    patchTurn(id, { check: { pending: true } });

    try {
      const check = await postJson(`${API}/guardrail/`, {
        question: turn.text,
        previousAnswer: previous?.text || '',
      });
      patchTurn(id, { check });
      if (check.position?.choice === 'wrapup' && (check.position.p ?? 0) >= 0.7)
        onWrapUp();
    } catch (error) {
      patchTurn(id, {
        check: {
          error:
            error.code === 'rate' || error.code === 'budget'
              ? 'rate limit'
              : 'unavailable',
        },
      });
    }
  }

  // --- voice --------------------------------------------------------------------------------

  function resetInterview() {
    updateTurns(() => []);
    setFindings(null);
    setFindingsState({ loading: false, error: '' });
    setEndReason('');
    setHighlight(null);
    checksRef.current = 0;
    wrapRef.current = false;
    startedRef.current = 0;
  }

  function onRealtimeEvent(event) {
    switch (event.type) {
      case 'output_audio_buffer.started':
        setActivityState('moderator');
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        setActivityState(null);
        if (wrapRef.current) scheduleWrapEnd(900);
        break;
      case 'input_audio_buffer.speech_started':
        setActivityState('participant');
        break;
      case 'input_audio_buffer.speech_stopped':
        if (activityRef.current === 'participant') setActivityState('thinking');
        break;
      case 'error':
        console.warn('[realtime]', event.error);
        // Before the first moderator turn, an error means the session never got going.
        if (!turnsRef.current.some(turn => turn.role === 'moderator')) {
          setNotice({
            kind: 'error',
            text: `Voice service: ${event.error?.message || 'error'}`,
          });
        }
        break;
      default:
    }

    updateTurns(list => applyRealtimeEvent(list, event, elapsed()));
    if (event.type === 'response.output_audio_transcript.done') runCheck(event.item_id);
  }

  async function startVoice() {
    setNotice(null);
    if (!hasKey) return setNotice({ kind: 'preview', text: PREVIEW_TEXT });
    const support = voiceSupport();
    if (!support.ok)
      return setNotice({ kind: 'error', text: `${support.reason} Use "Type instead".` });

    setStatus('mic');
    let mic;
    try {
      mic = await getMicrophone();
    } catch (error) {
      setStatus('idle');
      return setNotice({ kind: 'error', text: error.message });
    }

    setStatus('connecting');
    let session;
    try {
      session = await postJson(`${API}/session/`, {});
    } catch (error) {
      mic.getTracks().forEach(track => track.stop());
      setStatus('idle');
      return setNotice({
        kind: error.code === 'key_missing' ? 'preview' : 'error',
        text: errorText(error),
      });
    }

    resetInterview();
    setView('live');
    const stopLevel = watchLevel(mic, level =>
      meterRef.current?.style.setProperty('--level', level.toFixed(3))
    );

    let connection;
    try {
      connection = await connectRealtime({
        clientSecret: session.clientSecret,
        callsUrl: session.callsUrl,
        mic,
        audio: audioRef.current,
        onEvent: onRealtimeEvent,
        onConnection: state => {
          if (state === 'failed' || state === 'closed') endVoice('dropped');
        },
      });
    } catch (error) {
      stopLevel();
      mic.getTracks().forEach(track => track.stop());
      setStatus('idle');
      setView('example');
      return setNotice({ kind: 'error', text: error.message });
    }

    startedRef.current = performance.now();
    const maxSeconds = session.maxSeconds || MAX_VOICE_SECONDS;
    let warned = false;
    const timer = setInterval(() => {
      const left = Math.max(0, maxSeconds - elapsed());
      setRemaining(Math.ceil(left));
      if (!warned && left <= TIME_CHECK_AT) {
        warned = true;
        connection.send({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: 'Time check: about 30 seconds left. After the participant finishes this answer, wrap up.',
              },
            ],
          },
        });
      }
      if (left <= 0) endVoice('time');
    }, 250);

    callRef.current = { connection, mic, stopLevel, timer, wrapTimer: null };
    setRemaining(maxSeconds);
    setActivityState('thinking');
    setStatus('live');

    // The participant "joins", and the moderator opens with its intro and Q1.
    connection.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: "Hi, I'm ready to start." }],
      },
    });
    connection.send({ type: 'response.create' });
  }

  // --- text ---------------------------------------------------------------------------------

  async function moderatorReply() {
    const history = turnsRef.current
      .filter(turn => turn.text)
      .map(({ role, text }) => ({ role, text }));
    const id = `m${Date.now()}`;
    updateTurns(list => [
      ...list,
      { id, role: 'moderator', text: '', t: elapsed(), final: false },
    ]);
    setStreaming(true);
    try {
      const text = await streamFromApi(
        `${API}/moderate/`,
        { turns: history },
        (_, full) => patchTurn(id, { text: full })
      );
      if (!text.trim()) throw new Error('The moderator did not reply. Try again.');
      patchTurn(id, { text: text.trim(), final: true });
      runCheck(id);
      return true;
    } catch (error) {
      updateTurns(list => list.filter(turn => turn.id !== id));
      setNotice({
        kind: error.code === 'key_missing' ? 'preview' : 'error',
        text: errorText(error),
      });
      return false;
    } finally {
      setStreaming(false);
    }
  }

  async function startText() {
    setNotice(null);
    if (!hasKey) return setNotice({ kind: 'preview', text: PREVIEW_TEXT });
    resetInterview();
    setView('live');
    setStatus('live');
    startedRef.current = performance.now();
    const ok = await moderatorReply();
    if (!ok) {
      setStatus('idle');
      setView('example');
    }
  }

  async function sendAnswer(event) {
    event.preventDefault();
    const text = draft.trim().slice(0, 600);
    if (!text || streaming || status !== 'live') return;
    setNotice(null);
    setDraft('');
    updateTurns(list => [
      ...list,
      { id: `p${Date.now()}`, role: 'participant', text, t: elapsed(), final: true },
    ]);
    const answers = turnsRef.current.filter(turn => turn.role === 'participant').length;
    await moderatorReply();
    if (answers >= MAX_TEXT_ANSWERS && !wrapRef.current) {
      setStatus('ended');
      setEndReason('limit');
    }
  }

  function endText() {
    setStatus('ended');
    setEndReason('user');
  }

  // --- findings -----------------------------------------------------------------------------

  // Labels (T1, T2...) count the same turns the findings route receives, so quotes line up.
  const liveTurns = useMemo(() => {
    let n = 0;
    return turns.map(turn =>
      turn.text && !turn.failed ? { ...turn, label: `T${(n += 1)}` } : turn
    );
  }, [turns]);

  const exampleTurns = useMemo(
    () => EXAMPLE_TURNS.map(turn => ({ ...turn, final: true, label: turn.id })),
    []
  );

  const shownTurns = view === 'live' ? liveTurns : exampleTurns;
  const shownFindings = view === 'live' ? findings?.findings || null : EXAMPLE_FINDINGS;
  const answered = liveTurns.filter(
    turn => turn.role === 'participant' && turn.final && turn.text
  ).length;
  const busy =
    status === 'mic' ||
    status === 'connecting' ||
    (status === 'live' && mode === 'voice');

  async function generateFindings() {
    if (!hasKey) {
      setFindingsState({ loading: false, error: PREVIEW_TEXT });
      return;
    }
    setFindingsState({ loading: true, error: '' });
    try {
      const sent = liveTurns
        .filter(turn => turn.final && turn.text && !turn.failed)
        .map(({ role, text, t }) => ({ role, text, t: Math.round(t) }));
      const data = await postJson(`${API}/findings/`, { turns: sent });
      setFindings(data);
      setFindingsState({ loading: false, error: '' });
    } catch (error) {
      setFindingsState({ loading: false, error: errorText(error) });
    }
  }

  function showQuote(label) {
    setHighlight(current => ({ label, n: (current?.n || 0) + 1 }));
    interviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- guide progress, from Jev's guide_position on each moderator turn ----------------------

  const progress = useMemo(() => {
    const covered = new Set();
    let current = null;
    for (const turn of shownTurns) {
      const position = turn.check?.position;
      if (turn.role !== 'moderator' || !position || (position.p ?? 0) < 0.5) continue;
      if (/^Q\d$/.test(position.choice)) {
        if (current && current !== position.choice) covered.add(current);
        current = position.choice;
      } else if (position.choice === 'wrapup' && current) {
        covered.add(current);
        current = null;
      }
    }
    const done = view === 'example' || status === 'ended';
    if (done && current) covered.add(current);
    return { covered, current: done ? null : current };
  }, [shownTurns, view, status]);

  // --- render -------------------------------------------------------------------------------

  const statusLine = (() => {
    if (view === 'example') {
      return {
        tone: 'example',
        text: `Example run · ${EXAMPLE_TURNS.length} turns · 02:31`,
      };
    }
    if (status === 'mic')
      return { tone: 'wait', text: 'Waiting for microphone permission…' };
    if (status === 'connecting') return { tone: 'wait', text: 'Connecting…' };
    if (status === 'live' && mode === 'voice') {
      const doing =
        {
          moderator: 'Moderator speaking',
          participant: 'Listening',
          thinking: 'Moderator thinking',
        }[activity] || 'Your turn';
      return { tone: 'live', text: `Live · ${formatTime(remaining)} left · ${doing}` };
    }
    if (status === 'live') {
      return {
        tone: 'live',
        text: `Live · ${answered}/${MAX_TEXT_ANSWERS} answers${
          streaming ? ' · Moderator typing' : ''
        }`,
      };
    }
    if (status === 'ended')
      return { tone: 'ended', text: `Ended · ${END_REASONS[endReason] || 'Done'}` };
    return { tone: 'idle', text: 'Ready' };
  })();

  return (
    <DemoLayout
      company="Great Question"
      title="AI Moderator: a realtime voice interview that probes and stays neutral"
      tagline="Talk to an AI moderator running a four-question discussion guide. Every question it asks is scored live for leading, double-barreled and off-guide wording, and the transcript becomes quote-backed findings that an MCP client can search."
    >
      {/* Remote audio for the voice call; inline so mobile Safari can play it */}
      <audio ref={audioRef} autoPlay playsInline className={styles.visuallyHidden} />

      <div className={styles.page}>
        <div className={styles.studyGrid}>
          <section className={styles.guideCol} aria-label="Discussion guide">
            <Guide covered={progress.covered} current={progress.current} />
          </section>

          <section
            className={styles.interviewCol}
            aria-label="Interview"
            ref={interviewRef}
          >
            <div className={`${styles.card} ${styles.interviewCard}`}>
              <div className={styles.cardHead}>
                <div>
                  <span className={styles.eyebrow}>
                    <span className={styles.step}>2</span> Interview
                  </span>
                  <h2 className={styles.h2}>
                    {mode === 'voice' ? 'Talk to the moderator' : 'Type your answers'}
                  </h2>
                </div>
                <div
                  className={styles.segmented}
                  role="group"
                  aria-label="Interview mode"
                >
                  <button
                    type="button"
                    className={styles.segment}
                    aria-pressed={mode === 'voice'}
                    disabled={busy || (status === 'live' && mode === 'text')}
                    onClick={() => setMode('voice')}
                  >
                    Voice
                  </button>
                  <button
                    type="button"
                    className={styles.segment}
                    aria-pressed={mode === 'text'}
                    disabled={busy || (status === 'live' && mode === 'text')}
                    onClick={() => setMode('text')}
                  >
                    Type instead
                  </button>
                </div>
              </div>

              <div className={styles.controls}>
                {mode === 'voice' ? (
                  status === 'live' ? (
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => endVoice('user')}
                    >
                      <FiPhoneOff aria-hidden /> End interview
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={startVoice}
                      disabled={status === 'mic' || status === 'connecting'}
                    >
                      <FiMic aria-hidden />
                      {status === 'mic' || status === 'connecting'
                        ? 'Starting…'
                        : status === 'ended'
                        ? 'Start a new interview'
                        : 'Start voice interview'}
                    </button>
                  )
                ) : status === 'live' ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={endText}
                  >
                    <FiSquare aria-hidden /> End interview
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={startText}
                  >
                    <FiSend aria-hidden />
                    {status === 'ended'
                      ? 'Start a new typed interview'
                      : 'Start typed interview'}
                  </button>
                )}
                <p className={styles.hint}>
                  {mode === 'voice'
                    ? 'Uses your mic · 3-minute cap · headphones stop echo'
                    : `Same moderator, typed · up to ${MAX_TEXT_ANSWERS} answers`}
                  {!hasKey && <> · needs the private link</>}
                </p>
              </div>

              {notice && (
                <p
                  className={styles.notice}
                  data-kind={notice.kind}
                  role={notice.kind === 'error' ? 'alert' : 'status'}
                >
                  {notice.text}
                </p>
              )}

              <div className={styles.statusRow}>
                <span className={styles.status} data-tone={statusLine.tone}>
                  <i aria-hidden />
                  {statusLine.text}
                </span>
                {status === 'live' && mode === 'voice' && view === 'live' && (
                  <span
                    className={styles.meter}
                    ref={meterRef}
                    aria-hidden
                    data-active={activity === 'participant'}
                  >
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                {status === 'live' && view === 'live' && (
                  <ol className={styles.miniGuide} aria-label="Guide progress">
                    {GUIDE.map(q => {
                      const state =
                        progress.current === q.id
                          ? 'current'
                          : progress.covered.has(q.id)
                          ? 'covered'
                          : 'todo';
                      return (
                        <li key={q.id} data-state={state} title={q.text}>
                          {state === 'covered' ? (
                            <FiCheck aria-label={`${q.id} covered`} />
                          ) : (
                            q.id
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
                {turns.length > 0 &&
                  status !== 'live' &&
                  status !== 'mic' &&
                  status !== 'connecting' && (
                    <div
                      className={styles.viewToggle}
                      role="group"
                      aria-label="Transcript shown"
                    >
                      <button
                        type="button"
                        aria-pressed={view === 'live'}
                        onClick={() => setView('live')}
                      >
                        Your interview
                      </button>
                      <button
                        type="button"
                        aria-pressed={view === 'example'}
                        onClick={() => setView('example')}
                      >
                        Example run
                      </button>
                    </div>
                  )}
              </div>

              <Transcript
                turns={shownTurns}
                follow={view === 'live'}
                highlight={highlight}
                empty={
                  status === 'connecting' || status === 'mic'
                    ? 'Setting up the call…'
                    : 'The moderator will open with a short intro and the first question.'
                }
              />

              {mode === 'text' && view === 'live' && status === 'live' && (
                <form className={styles.composer} onSubmit={sendAnswer}>
                  <label className={styles.visuallyHidden} htmlFor="answer">
                    Your answer
                  </label>
                  <textarea
                    id="answer"
                    className={styles.input}
                    rows={2}
                    maxLength={600}
                    value={draft}
                    placeholder={streaming ? 'Moderator is typing…' : 'Type your answer'}
                    onChange={event => setDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) sendAnswer(event);
                    }}
                  />
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={streaming || !draft.trim()}
                    aria-label="Send answer"
                  >
                    <FiSend aria-hidden />
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        <section className={styles.section} aria-label="Findings">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.eyebrow}>
                <span className={styles.step}>3</span> Findings
              </span>
              <h2 className={styles.h2}>
                {view === 'example'
                  ? 'What the example run found'
                  : 'What your interview found'}
              </h2>
              <p className={styles.sub}>
                An LLM drafts findings as JSON; the server keeps only quotes that appear
                word for word in the transcript and stamps their times from it.
              </p>
            </div>
            {view === 'live' && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={generateFindings}
                disabled={findingsState.loading || answered < 2 || busy || streaming}
              >
                <FiFileText aria-hidden />
                {findingsState.loading
                  ? 'Reading transcript…'
                  : findings
                  ? 'Regenerate'
                  : 'Generate findings'}
              </button>
            )}
          </div>

          {findingsState.error && (
            <p
              className={styles.notice}
              data-kind={findingsState.error === PREVIEW_TEXT ? 'preview' : 'error'}
            >
              {findingsState.error}
            </p>
          )}

          {shownFindings ? (
            <>
              <FindingCards findings={shownFindings} onQuote={showQuote} />
              {view === 'live' && findings?.dropped > 0 && (
                <p className={styles.small}>
                  {findings.dropped} quote{findings.dropped === 1 ? '' : 's'} dropped for
                  not matching the transcript word for word.
                </p>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              {findingsState.loading ? (
                <div className={styles.skeletons} aria-label="Generating findings">
                  <span />
                  <span />
                </div>
              ) : answered < 2 ? (
                'Answer at least two questions, then generate findings.'
              ) : (
                'Ready when you are. Findings take a few seconds.'
              )}
            </div>
          )}
        </section>

        <section className={styles.section} aria-label="MCP tools">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.eyebrow}>
                <span className={styles.step}>4</span> MCP surface
              </span>
              <h2 className={styles.h2}>The same findings, as tools an agent can call</h2>
              <p className={styles.sub}>
                Read-only tools a research agent or Claude can use to search findings and
                pull exact quotes with timestamps, so every claim it makes is citable.
              </p>
            </div>
          </div>
          <McpPanel
            findings={shownFindings}
            turns={shownTurns}
            sourceLabel={view === 'example' ? 'the example run' : 'your interview'}
          />
        </section>

        <section className={styles.section} aria-label="How it works">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.eyebrow}>Under the hood</span>
              <h2 className={styles.h2}>How it is wired</h2>
            </div>
          </div>
          <div className={styles.how}>
            <div>
              <h3 className={styles.h3}>Voice over WebRTC</h3>
              <p>
                The browser connects straight to the OpenAI Realtime API. A server route
                mints a 60-second client secret with the moderator prompt, voice,
                transcription and server VAD already set, so the browser never sees the
                API key and cannot change the prompt.
              </p>
            </div>
            <div>
              <h3 className={styles.h3}>Live guardrail</h3>
              <p>
                After each moderator turn, one call to Jev, a decision model that answers
                with probabilities instead of text (about 120 ms), scores four typed
                questions: leading, double-barreled, off-guide, and which guide question
                the turn covers. That last one drives the guide progress and the automatic
                wrap-up.
              </p>
            </div>
            <div>
              <h3 className={styles.h3}>Findings you can trust</h3>
              <p>
                Findings come back as JSON. Quotes are verified against the transcript on
                the server, paraphrases are dropped, and results are cached by transcript
                hash.
              </p>
            </div>
            <div>
              <h3 className={styles.h3}>Guarded spend</h3>
              <p>
                Private link per recipient, per-IP rate limits and daily budgets, a
                3-minute voice cap billed up front, {MAX_TEXT_ANSWERS} typed answers, and{' '}
                {MAX_CHECKS} guardrail checks per interview.
              </p>
            </div>
          </div>
        </section>
      </div>
    </DemoLayout>
  );
}
