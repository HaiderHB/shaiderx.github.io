// Browser side of the voice interview: microphone, WebRTC to the OpenAI Realtime API,
// and a pure reducer that turns Realtime server events into transcript turns.
// Docs: https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime

export function voiceSupport() {
  if (typeof window === 'undefined') return { ok: true };
  if (!window.isSecureContext)
    return { ok: false, reason: 'Voice needs a secure (https) page.' };
  if (typeof window.RTCPeerConnection === 'undefined') {
    return { ok: false, reason: 'This browser does not support WebRTC voice.' };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'This browser does not allow microphone access here.' };
  }
  return { ok: true };
}

const MIC_ERRORS = {
  NotAllowedError:
    'Microphone access is blocked. Allow it from the icon in the address bar, then try again, or use "Type instead".',
  SecurityError: 'Microphone access is blocked on this page. Use "Type instead".',
  NotFoundError: 'No microphone found. Plug one in, or use "Type instead".',
  OverconstrainedError: 'No microphone found. Plug one in, or use "Type instead".',
  NotReadableError: 'Your microphone is in use by another app. Close it and try again.',
  AbortError: 'The microphone did not start. Try again.',
  NotSupportedError: 'This browser cannot use a microphone here. Use "Type instead".',
};

/** Asks for the mic. Throws an Error with a human message on failure. */
export async function getMicrophone() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (error) {
    throw new Error(
      MIC_ERRORS[error?.name] ||
        'The microphone did not start. Try again, or use "Type instead".'
    );
  }
}

/** Live input level (0-1) for a mic meter; calls onLevel about 30 times a second. */
export function watchLevel(stream, onLevel) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return () => {};
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  context.createMediaStreamSource(stream).connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  let frame = 0;
  let last = 0;

  const tick = now => {
    frame = requestAnimationFrame(tick);
    if (now - last < 33) return;
    last = now;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) sum += ((value - 128) / 128) ** 2;
    onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    context.close().catch(() => {});
  };
}

function waitForOpen(channel, timeoutMs) {
  if (channel.readyState === 'open') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('The voice connection timed out. Try again.')),
      timeoutMs
    );
    channel.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    });
    channel.addEventListener('close', () => {
      clearTimeout(timer);
      reject(new Error('The voice connection closed before it started.'));
    });
  });
}

/**
 * Connects the mic to an OpenAI Realtime session over WebRTC with an ephemeral secret.
 * Returns { send(event), close() }. Server events arrive as parsed JSON in onEvent.
 */
export async function connectRealtime({
  clientSecret,
  callsUrl,
  mic,
  audio,
  onEvent,
  onConnection,
}) {
  const pc = new RTCPeerConnection();
  let closed = false;

  pc.ontrack = event => {
    audio.srcObject = event.streams[0];
    audio.play?.().catch(() => {});
  };
  pc.onconnectionstatechange = () => onConnection?.(pc.connectionState);
  for (const track of mic.getAudioTracks()) pc.addTrack(track, mic);

  const channel = pc.createDataChannel('oai-events');
  channel.addEventListener('message', event => {
    try {
      onEvent(JSON.parse(event.data));
    } catch {
      // ignore malformed events
    }
  });

  const close = () => {
    if (closed) return;
    closed = true;
    try {
      channel.close();
    } catch {
      // already closed
    }
    pc.getSenders().forEach(sender => sender.track?.stop());
    pc.close();
    audio.srcObject = null;
  };

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const response = await fetch(callsUrl, {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
    });
    if (!response.ok)
      throw new Error(
        `The voice service refused the call (${response.status}). Try again.`
      );
    await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    await waitForOpen(channel, 12_000);
  } catch (error) {
    close();
    throw error.message?.startsWith('The voice')
      ? error
      : new Error('Could not connect the voice call. Try again.');
  }

  return {
    send: event => {
      if (channel.readyState === 'open') channel.send(JSON.stringify(event));
    },
    close,
  };
}

// --- Realtime events -> transcript turns ---------------------------------------------------
// Turn: { id, role: 'moderator' | 'participant', text, t, final, failed? }

function upsert(turns, id, role, t, update) {
  const index = turns.findIndex(turn => turn.id === id);
  if (index === -1) return [...turns, update({ id, role, text: '', t, final: false })];
  const next = turns.slice();
  next[index] = update(next[index]);
  return next;
}

/** Applies one Realtime server event to the transcript. t: seconds since the call started. */
export function applyRealtimeEvent(turns, event, t) {
  const id = event.item_id;
  switch (event.type) {
    case 'input_audio_buffer.speech_started':
      return id ? upsert(turns, id, 'participant', t, turn => turn) : turns;

    case 'conversation.item.input_audio_transcription.delta':
      return upsert(turns, id, 'participant', t, turn =>
        turn.final ? turn : { ...turn, text: turn.text + (event.delta || '') }
      );

    case 'conversation.item.input_audio_transcription.completed': {
      const text = String(event.transcript || '').trim();
      if (!text) return turns.filter(turn => turn.id !== id);
      return upsert(turns, id, 'participant', t, turn => ({
        ...turn,
        text,
        final: true,
      }));
    }

    case 'conversation.item.input_audio_transcription.failed':
      return upsert(turns, id, 'participant', t, turn => ({
        ...turn,
        text: turn.text || '(inaudible)',
        final: true,
        failed: !turn.text,
      }));

    case 'response.output_audio_transcript.delta':
      return upsert(turns, id, 'moderator', t, turn =>
        turn.final ? turn : { ...turn, text: turn.text + (event.delta || '') }
      );

    case 'response.output_audio_transcript.done':
      return upsert(turns, id, 'moderator', t, turn => ({
        ...turn,
        text: String(event.transcript ?? turn.text).trim(),
        final: true,
      }));

    default:
      return turns;
  }
}

/** Closes out turns that never got a final transcript (call ended mid-turn). */
export function settleTurns(turns) {
  return turns
    .filter(turn => turn.final || turn.text.trim())
    .map(turn => (turn.final ? turn : { ...turn, text: turn.text.trim(), final: true }));
}
