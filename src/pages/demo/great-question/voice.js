// Browser side of the voice interview: the mic, a recorder that stops itself on a pause,
// and moderator playback. Turn-based: nothing streams while the participant is not answering.

const SILENCE_MS = 1200; // pause that ends an answer
const NO_SPEECH_MS = 12_000; // give up if nothing that sounds like speech arrives
const SPEECH_FRAMES = 3; // consecutive loud frames (50 ms each) before it counts as speech
const TICK_MS = 50;

/** First MediaRecorder type this browser supports: webm/opus (Chromium, Firefox), else mp4 (Safari). */
export function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const types = [
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  return types.find(type => MediaRecorder.isTypeSupported?.(type)) ?? '';
}

export function voiceSupport() {
  if (typeof window === 'undefined') return { ok: true };
  if (!window.isSecureContext)
    return { ok: false, reason: 'Voice needs a secure (https) page.' };
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'This browser does not allow microphone access here.' };
  }
  if (typeof window.MediaRecorder === 'undefined') {
    return { ok: false, reason: 'This browser cannot record audio.' };
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

/**
 * Asks for the mic and wires an AnalyserNode for levels. Throws an Error with a human message.
 * Returns { stream, level(): RMS 0-1, resume(), close() }.
 */
export async function openMicrophone() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (error) {
    throw new Error(
      MIC_ERRORS[error?.name] ||
        'The microphone did not start. Try again, or use "Type instead".'
    );
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = AudioContext ? new AudioContext() : null;
  let analyser = null;
  let data = null;
  if (context) {
    analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    data = new Float32Array(analyser.fftSize);
  }

  return {
    stream,
    level() {
      if (!analyser) return 0;
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (const value of data) sum += value * value;
      return Math.sqrt(sum / data.length);
    },
    // Safari starts the context suspended unless it is resumed inside a tap.
    resume: () => context?.state === 'suspended' && context.resume().catch(() => {}),
    close() {
      stream.getTracks().forEach(track => track.stop());
      context?.close().catch(() => {});
    },
  };
}

/**
 * Records one answer. Stops after ~1.2 s of silence that follows speech, on stop(), at maxMs,
 * or after 12 s with no speech. onTick({ level 0-1, ms }) drives the meter and clock.
 * Returns { stop, cancel, done }; done resolves to { blob, mimeType, ms, heard, reason }.
 */
export function recordAnswer(mic, { mimeType, maxMs, onTick }) {
  const recorder = new MediaRecorder(mic.stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  const started = performance.now();
  let heard = false;
  let loudFrames = 0;
  let lastVoice = started;
  let floor = 0.004; // ambient noise RMS, tracked on quiet frames
  let reason = 'manual';
  let timer = null;

  const stop = why => {
    if (recorder.state === 'inactive') return;
    reason = why;
    recorder.stop();
  };

  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = event => event.data?.size && chunks.push(event.data);
    recorder.onstop = () => {
      clearInterval(timer);
      const type = recorder.mimeType || mimeType || 'audio/webm';
      resolve({
        blob: new Blob(chunks, { type }),
        mimeType: type,
        ms: performance.now() - started,
        heard,
        reason,
      });
    };
    recorder.onerror = () => {
      clearInterval(timer);
      reject(new Error('Recording failed. Tap Answer to try again.'));
    };
  });

  recorder.start(250);
  timer = setInterval(() => {
    const now = performance.now();
    const rms = mic.level();
    const threshold = Math.min(0.05, Math.max(0.012, floor * 3));

    if (rms > threshold) {
      loudFrames += 1;
      if (loudFrames >= SPEECH_FRAMES) heard = true;
      lastVoice = now;
    } else {
      loudFrames = 0;
      floor = floor * 0.95 + rms * 0.05;
    }

    onTick?.({ level: Math.min(1, rms * 8), ms: now - started });

    if (heard && now - lastVoice > SILENCE_MS) stop('silence');
    else if (now - started > maxMs) stop('cap');
    else if (!heard && now - started > NO_SPEECH_MS) stop('nospeech');
  }, TICK_MS);

  return { stop: () => stop('manual'), cancel: () => stop('cancel'), done };
}

/** Blob to base64 (no data: prefix). */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Could not read the recording.'));
    reader.readAsDataURL(blob);
  });
}

// 50 ms of silence as WAV. Played from the Start tap so later replies may play without one
// (iOS Safari only lets an audio element play programmatically after a tap has played it).
function silentWavUrl() {
  const samples = 400;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const text = (offset, value) =>
    [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, samples, true);
  new Uint8Array(buffer, 44).fill(128);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

/** Call inside a tap, before any await. */
export function unlockAudio(audio) {
  if (!audio) return;
  const url = silentWavUrl();
  audio.src = url;
  audio
    .play()
    .catch(() => {})
    .finally(() => setTimeout(() => URL.revokeObjectURL(url), 1000));
}

/**
 * Plays a base64 MP3 on the page's audio element. Returns { started, ended, resume, stop }:
 * started resolves false when autoplay was blocked (resume() from a tap), ended when it ends.
 */
export function playAudio(audio, base64) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  let finish;
  const ended = new Promise(resolve => (finish = resolve));
  const cleanup = () => {
    audio.onended = null;
    audio.onerror = null;
    URL.revokeObjectURL(url);
    finish();
  };
  audio.onended = cleanup;
  audio.onerror = cleanup;
  audio.src = url;

  const started = audio.play().then(
    () => true,
    error => {
      if (error?.name === 'NotAllowedError') return false;
      cleanup();
      return true;
    }
  );

  return {
    started,
    ended,
    resume: () => audio.play().catch(cleanup),
    stop() {
      audio.pause();
      cleanup();
    },
  };
}
