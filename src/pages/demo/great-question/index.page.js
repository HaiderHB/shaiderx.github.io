// AI Moderator demo for Great Question: a turn-based voice interview (Fish Audio speech-to-text,
// DeepSeek via fal, Fish Audio speech), a live Jev guardrail on every moderator turn,
// quote-backed findings, and an MCP tool surface over those findings.
// Live at /demo/great-question/ (unlisted, noindex).
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, postJson, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  EmptyState,
  Notice,
  NoteGrid,
  RunStatus,
  SectionHead,
  SegmentedControl,
  SkeletonGrid,
  TextArea,
  formatTime,
  srOnly,
} from 'demos/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiFileText, FiMic, FiSend, FiSquare } from 'react-icons/fi';
import { FindingCards } from './Findings';
import styles from './GreatQuestion.module.css';
import { Guide } from './Guide';
import { McpPanel } from './McpPanel';
import {
  CLOSING_LINE,
  EXAMPLE_FINDINGS,
  EXAMPLE_TURNS,
  GUIDE,
  MAX_ANSWERS,
  MAX_ANSWER_SECONDS,
} from './study';
import { Transcript } from './Transcript';
import {
  blobToBase64,
  openMicrophone,
  pickMimeType,
  playAudio,
  recordAnswer,
  unlockAudio,
  voiceSupport,
} from './voice';
import { VoiceDock } from './VoiceDock';

const API = '/api/demo/great-question';
const MAX_CHECKS = 16; // guardrail calls per interview

const PREVIEW_TEXT =
  'Preview mode. The private link from my email turns on live interviews. The example run shows a full session.';

const MODE_OPTIONS = [
  { value: 'voice', label: 'Voice' },
  { value: 'text', label: 'Type instead' },
];

const VIEW_OPTIONS = [
  { value: 'live', label: 'Your interview' },
  { value: 'example', label: 'Example run' },
];

const noticeKind = kind => (kind === 'error' ? 'error' : 'info');

const END_REASONS = {
  wrapup: 'Moderator wrapped up',
  user: 'You ended the interview',
  limit: 'Answer limit reached',
};

const HOW = [
  {
    title: 'Turn-based voice',
    text: "The browser records each answer and stops on a 1.2-second pause. One server route turns it into text with Fish Audio, asks DeepSeek (through fal) for the next question with the same prompt as typed mode, and returns it as Fish Audio speech. The next question starts 2 to 4 seconds after an answer ends; the transcript shows each step's time.",
  },
  {
    title: 'Live guardrail',
    text: 'After each moderator turn, one call to Jev, a decision model that answers with probabilities instead of text (about 120 ms), scores four typed questions: leading, double-barreled, off-guide, and which guide question the turn covers. That last one drives the guide progress and the automatic wrap-up.',
  },
  {
    title: 'Findings you can trust',
    text: 'DeepSeek returns findings as JSON. Quotes are verified against the transcript on the server, paraphrases are dropped, and results are cached by transcript hash.',
  },
  {
    title: 'Guarded spend',
    text: (
      <>
        Private link per recipient, per-IP rate limits and daily budgets. A voice turn costs
        about 4 cents; the opening line&apos;s speech is cached, so it is free after the
        first play. Up to {MAX_ANSWERS} answers of{' '}
        {MAX_ANSWER_SECONDS} seconds and {MAX_CHECKS} guardrail checks per interview. API
        keys never reach the browser.
      </>
    ),
  },
];

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

/** POSTs one voice turn and reads its NDJSON events; resolves with the final result. */
async function postTurn(body, onEvent) {
  let seen = 0;
  let result = null;
  let failure = null;
  await streamFromApi(`${API}/turn/`, { ...body, stream: true }, (_, full) => {
    let end;
    while ((end = full.indexOf('\n', seen)) !== -1) {
      const line = full.slice(seen, end);
      seen = end + 1;
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === 'result') result = event;
      else if (event.type === 'error') failure = event;
      else onEvent(event);
    }
  });
  if (failure || !result) {
    const error = new Error(
      failure?.error || 'The moderator did not answer. Tap Answer to try again.'
    );
    error.code = failure?.code;
    throw error;
  }
  return result;
}

export default function GreatQuestionDemo() {
  const [hasKey, setHasKey] = useState(true);
  const [mode, setMode] = useState('voice'); // voice | text
  const [status, setStatus] = useState('idle'); // idle | mic | live | ended
  const [view, setView] = useState('example'); // example | live
  const [turns, setTurnsState] = useState([]);
  const [notice, setNotice] = useState(null); // { kind: 'preview' | 'error' | 'info', text }
  // Voice turn phase: thinking | speaking | closing | blocked | ready | listening | transcribing
  const [phase, setPhaseState] = useState(null);
  const [endReason, setEndReason] = useState('');
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [findings, setFindings] = useState(null); // live findings: { findings, dropped }
  const [findingsState, setFindingsState] = useState({ loading: false, error: '' });
  const [highlight, setHighlight] = useState(null);

  const turnsRef = useRef([]);
  const voiceRef = useRef(null); // { mic, mimeType, recording, playback } while a voice interview runs
  const startedRef = useRef(0);
  const checksRef = useRef(0);
  const wrapRef = useRef(false);
  const phaseRef = useRef(null);
  const meterRef = useRef(null);
  const clockRef = useRef(null);
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

  const setPhase = value => {
    phaseRef.current = value;
    setPhaseState(value);
  };

  const answerCount = () =>
    turnsRef.current.filter(turn => turn.role === 'participant' && turn.final).length;

  // --- ending -------------------------------------------------------------------------------

  const endVoice = useCallback(
    reason => {
      const session = voiceRef.current;
      if (!session) return;
      voiceRef.current = null;
      session.recording?.cancel();
      session.playback?.stop();
      session.mic.close();
      // Drop placeholders for a turn that was still being transcribed or written.
      updateTurns(list => list.filter(turn => turn.final));
      phaseRef.current = null;
      setPhaseState(null);
      setStatus('ended');
      setEndReason(reason);
    },
    [updateTurns]
  );

  useEffect(() => () => endVoice('user'), [endVoice]);

  function onWrapUp() {
    if (wrapRef.current) return;
    wrapRef.current = true;
    if (mode === 'text' || !voiceRef.current) {
      setStatus(current => (current === 'live' ? 'ended' : current));
      setEndReason('wrapup');
      return;
    }
    // Mid-reply, the turn loop ends the interview once the moderator stops speaking.
    if (phaseRef.current === 'ready') endVoice('wrapup');
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

  // Shows and plays one moderator line, then hands the turn back (or ends on a wrap-up).
  async function moderatorSays(session, id, data) {
    patchTurn(id, {
      text: data.moderator.text,
      final: true,
      t: elapsed(),
      timing: data.timing,
    });
    runCheck(id);
    if (data.done) wrapRef.current = true;
    setPhase(data.done ? 'closing' : 'speaking');

    const playback = playAudio(audioRef.current, data.moderator.audio);
    session.playback = playback;
    if (!(await playback.started) && session.playback === playback) setPhase('blocked');
    await playback.ended;

    // Ended meanwhile, or the participant cut in with Answer.
    if (voiceRef.current !== session || session.playback !== playback) return;
    session.playback = null;
    if (wrapRef.current) endVoice(answerCount() >= MAX_ANSWERS ? 'limit' : 'wrapup');
    else setPhase('ready');
  }

  function playBlocked() {
    const session = voiceRef.current;
    if (!session?.playback) return;
    setPhase(wrapRef.current ? 'closing' : 'speaking');
    session.playback.resume();
  }

  async function startVoice() {
    setNotice(null);
    if (!hasKey) return setNotice({ kind: 'preview', text: PREVIEW_TEXT });
    const support = voiceSupport();
    if (!support.ok)
      return setNotice({ kind: 'error', text: `${support.reason} Use "Type instead".` });

    // Still inside the tap: lets the moderator's replies autoplay later (iOS Safari).
    unlockAudio(audioRef.current);
    setStatus('mic');
    let mic;
    try {
      mic = await openMicrophone();
    } catch (error) {
      setStatus('idle');
      return setNotice({ kind: 'error', text: error.message });
    }

    const session = { mic, mimeType: pickMimeType(), recording: null, playback: null };
    voiceRef.current = session;
    resetInterview();
    setView('live');
    setStatus('live');
    setPhase('thinking');
    const id = `m${Date.now()}`;
    updateTurns(() => [{ id, role: 'moderator', text: '', t: 0, final: false }]);

    let data;
    try {
      data = await postJson(`${API}/turn/`, {});
    } catch (error) {
      if (voiceRef.current !== session) return;
      voiceRef.current = null;
      mic.close();
      updateTurns(() => []);
      setPhase(null);
      setStatus('idle');
      setView('example');
      return setNotice({
        kind: error.code === 'key_missing' ? 'preview' : 'error',
        text: errorText(error),
      });
    }
    if (voiceRef.current !== session) return;
    startedRef.current = performance.now(); // the clock starts when the moderator speaks
    await moderatorSays(session, id, data);
  }

  async function answer() {
    const session = voiceRef.current;
    if (!session || session.recording) return;
    if (session.playback) {
      const playback = session.playback;
      session.playback = null;
      playback.stop();
    }
    session.mic.resume();
    setNotice(null);
    setPhase('listening');
    const t = elapsed();

    let take;
    try {
      session.recording = recordAnswer(session.mic, {
        mimeType: session.mimeType,
        maxMs: MAX_ANSWER_SECONDS * 1000,
        onTick: ({ level, ms }) => {
          meterRef.current?.style.setProperty('--level', level.toFixed(3));
          if (clockRef.current) {
            clockRef.current.textContent = `${formatTime(ms / 1000)} / ${formatTime(
              MAX_ANSWER_SECONDS
            )}`;
          }
        },
      });
      take = await session.recording.done;
    } catch (error) {
      session.recording = null;
      if (voiceRef.current !== session) return;
      setPhase('ready');
      return setNotice({ kind: 'error', text: error.message });
    }
    session.recording = null;
    if (voiceRef.current !== session || take.reason === 'cancel') return;
    if (take.reason === 'nospeech' || (!take.heard && take.ms < 1500)) {
      setPhase('ready');
      return setNotice({
        kind: 'info',
        text: "I didn't hear anything. Check your mic, then tap Answer.",
      });
    }

    const history = turnsRef.current
      .filter(turn => turn.final && turn.text)
      .map(({ role, text }) => ({ role, text }));
    const answerId = `p${Date.now()}`;
    let replyId = null;
    updateTurns(list => [
      ...list,
      { id: answerId, role: 'participant', text: '', t, final: false },
    ]);
    setPhase('transcribing');

    let data;
    try {
      const audio = await blobToBase64(take.blob);
      data = await postTurn({ audio, mimeType: take.mimeType, turns: history }, event => {
        if (event.type !== 'participant' || voiceRef.current !== session) return;
        replyId = `m${Date.now()}`;
        patchTurn(answerId, { text: event.text, final: true });
        updateTurns(list => [
          ...list,
          { id: replyId, role: 'moderator', text: '', t: elapsed(), final: false },
        ]);
        setPhase('thinking');
      });
    } catch (error) {
      if (voiceRef.current !== session) return;
      // Nothing half-done stays in the transcript: the participant answers again.
      updateTurns(list =>
        list.filter(turn => turn.id !== answerId && turn.id !== replyId)
      );
      setPhase('ready');
      return setNotice({
        kind: error.code === 'silence' ? 'info' : 'error',
        text: errorText(error),
      });
    }
    if (voiceRef.current !== session) return;
    if (!replyId) {
      replyId = `m${Date.now()}`;
      patchTurn(answerId, { text: data.participant.text, final: true });
      updateTurns(list => [
        ...list,
        { id: replyId, role: 'moderator', text: '', t: elapsed(), final: false },
      ]);
    }
    await moderatorSays(session, replyId, data);
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
    if (answers >= MAX_ANSWERS && !wrapRef.current) {
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
  const busy = status === 'mic' || (status === 'live' && mode === 'voice');

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
        text: `Example run · ${EXAMPLE_TURNS.length} turns · scores and findings recorded live`,
      };
    }
    if (status === 'mic')
      return { tone: 'wait', text: 'Waiting for microphone permission…' };
    if (status === 'live') {
      return {
        tone: 'live',
        text: `Live · ${answered}/${MAX_ANSWERS} answers${
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
      title="AI Moderator: a voice interview that probes and stays neutral"
      tagline="Talk to an AI moderator running a four-question discussion guide. Every question it asks is scored live for leading, double-barreled and off-guide wording, and the transcript becomes quote-backed findings that an MCP client can search."
    >
      {/* Moderator speech; inline so mobile Safari plays it in the page */}
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        className={srOnly}
      />

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
            <Card className={styles.interviewCard}>
              <SectionHead
                variant="eyebrow"
                compact
                step={2}
                kicker="Interview"
                title={mode === 'voice' ? 'Talk to the moderator' : 'Type your answers'}
                action={
                  <SegmentedControl
                    className={styles.modeSwitch}
                    label="Interview mode"
                    options={MODE_OPTIONS}
                    value={mode}
                    onChange={setMode}
                    disabled={busy || (status === 'live' && mode === 'text')}
                  />
                }
              />

              <div className={styles.controls}>
                {mode === 'voice' ? (
                  status === 'live' ? (
                    <Button variant="secondary" pill onClick={() => endVoice('user')}>
                      <FiSquare aria-hidden /> End interview
                    </Button>
                  ) : (
                    <Button pill onClick={startVoice} disabled={status === 'mic'}>
                      <FiMic aria-hidden />
                      {status === 'mic'
                        ? 'Starting…'
                        : status === 'ended'
                        ? 'Start a new interview'
                        : 'Start voice interview'}
                    </Button>
                  )
                ) : status === 'live' ? (
                  <Button variant="secondary" pill onClick={endText}>
                    <FiSquare aria-hidden /> End interview
                  </Button>
                ) : (
                  <Button pill onClick={startText}>
                    <FiSend aria-hidden />
                    {status === 'ended'
                      ? 'Start a new typed interview'
                      : 'Start typed interview'}
                  </Button>
                )}
                <p className={styles.hint}>
                  {mode === 'voice'
                    ? `Uses your mic · tap Answer, pause to send · up to ${MAX_ANSWERS} answers`
                    : `Same moderator, typed · up to ${MAX_ANSWERS} answers`}
                  {!hasKey && <> · needs the private link</>}
                </p>
              </div>

              {notice && (
                <Notice
                  className={styles.notice}
                  kind={noticeKind(notice.kind)}
                  role={notice.kind === 'error' ? 'alert' : 'status'}
                >
                  {notice.text}
                </Notice>
              )}

              <div className={styles.statusRow}>
                <RunStatus state={statusLine.tone}>{statusLine.text}</RunStatus>
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
                {turns.length > 0 && status !== 'live' && status !== 'mic' && (
                  <SegmentedControl
                    variant="box"
                    className={styles.viewToggle}
                    label="Transcript shown"
                    options={VIEW_OPTIONS}
                    value={view}
                    onChange={setView}
                  />
                )}
              </div>

              <Transcript
                turns={shownTurns}
                follow={view === 'live'}
                highlight={highlight}
                empty={
                  status === 'mic'
                    ? 'Waiting for the microphone…'
                    : 'The moderator will open with a short intro and the first question.'
                }
              />

              {mode === 'voice' && view === 'live' && status === 'live' && (
                <VoiceDock
                  phase={phase}
                  onAnswer={answer}
                  onDone={() => voiceRef.current?.recording?.stop()}
                  onPlay={playBlocked}
                  meterRef={meterRef}
                  clockRef={clockRef}
                />
              )}

              {mode === 'text' && view === 'live' && status === 'live' && (
                <form className={styles.composer} onSubmit={sendAnswer}>
                  <label className={srOnly} htmlFor="answer">
                    Your answer
                  </label>
                  <TextArea
                    id="answer"
                    variant="ring"
                    className={styles.composerInput}
                    rows={2}
                    maxLength={600}
                    value={draft}
                    placeholder={streaming ? 'Moderator is typing…' : 'Type your answer'}
                    onChange={event => setDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) sendAnswer(event);
                    }}
                  />
                  <Button
                    type="submit"
                    pill
                    className={styles.sendButton}
                    disabled={streaming || !draft.trim()}
                    aria-label="Send answer"
                  >
                    <FiSend aria-hidden />
                  </Button>
                </form>
              )}
            </Card>
          </section>
        </div>

        <section className={styles.section} aria-label="Findings">
          <SectionHead
            variant="eyebrow"
            className={styles.sectionHead}
            step={3}
            kicker="Findings"
            title={
              view === 'example' ? 'What the example run found' : 'What your interview found'
            }
            lede="DeepSeek drafts findings as JSON; the server keeps only quotes that appear word for word in the transcript and stamps their times from it."
            action={
              view === 'live' && (
                <Button
                  pill
                  onClick={generateFindings}
                  disabled={findingsState.loading || answered < 2 || busy || streaming}
                >
                  <FiFileText aria-hidden />
                  {findingsState.loading
                    ? 'Reading transcript…'
                    : findings
                    ? 'Regenerate'
                    : 'Generate findings'}
                </Button>
              )
            }
          />

          {findingsState.error && (
            <Notice
              className={styles.notice}
              kind={findingsState.error === PREVIEW_TEXT ? 'info' : 'error'}
            >
              {findingsState.error}
            </Notice>
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
            <EmptyState>
              {findingsState.loading ? (
                <SkeletonGrid label="Generating findings" />
              ) : answered < 2 ? (
                'Answer at least two questions, then generate findings.'
              ) : (
                'Ready when you are. Findings take a few seconds.'
              )}
            </EmptyState>
          )}
        </section>

        <section className={styles.section} aria-label="MCP tools">
          <SectionHead
            variant="eyebrow"
            step={4}
            kicker="MCP surface"
            title="The same findings, as tools an agent can call"
            lede="Read-only tools a research agent or Claude can use to search findings and pull exact quotes with timestamps, so every claim it makes is citable."
          />
          <McpPanel
            findings={shownFindings}
            turns={shownTurns}
            sourceLabel={view === 'example' ? 'the example run' : 'your interview'}
          />
        </section>

        <section className={styles.section} aria-label="How it works">
          <SectionHead variant="eyebrow" kicker="Under the hood" title="How it is wired" />
          <NoteGrid variant="boxed" items={HOW} />
        </section>
      </div>
    </DemoLayout>
  );
}
