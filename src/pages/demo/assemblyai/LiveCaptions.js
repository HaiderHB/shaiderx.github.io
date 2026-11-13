// Live version of the reference Captions component. Rendered only when the deployment has
// ASSEMBLYAI_API_KEY; tokens come from /api/demo/assemblyai/token/ (demo key + budget guarded).
import { postJson } from 'demos/client';
import { useEffect, useRef, useState } from 'react';
import styles from './AssemblyAI.module.css';
import { WORKLET_SOURCE } from './reference';

const WS_URL = 'wss://streaming.assemblyai.com/v3/ws';
const AUTO_STOP_MS = 90_000;

export function LiveCaptions() {
  const [turns, setTurns] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const live = useRef(null);

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function release() {
    const session = live.current;
    if (!session) return;
    clearTimeout(session.timer);
    clearTimeout(session.autoStop);
    session.mic?.getTracks().forEach(track => track.stop());
    if (session.ctx.state !== 'closed') session.ctx.close();
    if (session.moduleUrl) URL.revokeObjectURL(session.moduleUrl);
    live.current = null;
  }

  async function start() {
    setStatus('starting');
    setError('');
    setTurns([]);
    const ctx = new AudioContext();
    live.current = { ctx };
    try {
      live.current.mic = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      live.current.moduleUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'text/javascript' }));
      await ctx.audioWorklet.addModule(live.current.moduleUrl);

      const { token } = await postJson('/api/demo/assemblyai/token/', {});
      const params = new URLSearchParams({
        token,
        speech_model: 'universal-3-6-pro',
        sample_rate: '16000',
        encoding: 'pcm_s16le',
      });
      const ws = new WebSocket(`${WS_URL}?${params}`);
      live.current.ws = ws;

      const worklet = new AudioWorkletNode(ctx, 'pcm16-worklet');
      worklet.port.onmessage = event => {
        if (ws.readyState === WebSocket.OPEN) ws.send(event.data);
      };
      ctx.createMediaStreamSource(live.current.mic).connect(worklet).connect(ctx.destination);

      ws.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'Begin') {
          setStatus('live');
          if (live.current) live.current.autoStop = setTimeout(stop, AUTO_STOP_MS);
        }
        if (msg.type === 'Turn') {
          setTurns(prev => [
            ...prev.filter(turn => turn.order !== msg.turn_order),
            { order: msg.turn_order, text: msg.transcript, final: msg.end_of_turn },
          ]);
        }
        if (msg.type === 'Error') setError(msg.error || 'AssemblyAI reported an error.');
      };
      ws.onclose = event => {
        release();
        setStatus('idle');
        if (event.code !== 1000) setError(event.reason || `The session closed with code ${event.code}.`);
      };
    } catch (err) {
      release();
      setStatus('idle');
      setError(
        err.name === 'NotAllowedError' ? 'Microphone access was blocked.' : err.message || 'Could not start captions.'
      );
    }
  }

  function stop() {
    const session = live.current;
    if (!session?.ws) return release();
    clearTimeout(session.autoStop);
    session.mic.getTracks().forEach(track => track.stop());
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type: 'Terminate' }));
      setStatus('stopping');
      session.timer = setTimeout(() => session.ws.close(1000), 5000);
    } else {
      session.ws.close();
    }
  }

  const busy = status === 'starting' || status === 'stopping';
  const ordered = [...turns].sort((a, b) => a.order - b.order);

  return (
    <div className={styles.live}>
      <div className={styles.liveHead}>
        <div>
          <h4 className={styles.liveTitle}>Try the fix live</h4>
          <p className={styles.liveNote}>
            The same worklet and session flow, against the real API. Stops itself after 90 seconds.
          </p>
        </div>
        <button type="button" className={styles.primary} onClick={status === 'idle' ? start : stop} disabled={busy}>
          {status === 'idle'
            ? 'Start captions'
            : status === 'live'
            ? 'Stop'
            : status === 'starting'
            ? 'Connecting…'
            : 'Finishing last turn…'}
        </button>
      </div>
      <p className={styles.liveText} aria-live="polite">
        {ordered.length ? (
          ordered.map(turn => (
            <span key={turn.order} className={turn.final ? undefined : styles.partial}>
              {turn.text}{' '}
            </span>
          ))
        ) : (
          <span className={styles.livePlaceholder}>
            {status === 'live' ? 'Listening…' : 'Captions appear here.'}
          </span>
        )}
      </p>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
