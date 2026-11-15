// The reference fix, the checker samples and the proposed MCP tools, as strings.
// The live captions button on the page runs WORKLET_SOURCE and the same flow as CAPTIONS_SOURCE.

export const TOKEN_ROUTE_SOURCE = `// Mints a short-lived, streaming-only token. The API key never leaves the server.
// POST, so no Next.js version caches it (Next 14 prerenders a GET handler that ignores the request).
export async function POST() {
  // Add your own auth and rate limit: anyone who can call this route can open sessions on your key.
  const res = await fetch('https://token.assemblyai.com/v1/token', {
    method: 'POST',
    headers: {
      Authorization: process.env.ASSEMBLYAI_API_KEY, // the raw key, no "Bearer"
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product: 'streaming',
      expires_in_seconds: 60, // time to open the socket, not the session length
      max_session_duration_seconds: 1800, // a forgotten tab stops billing after 30 min
      // Without \`access\`, a token can open every product on your account.
      access: {
        tts: { enabled: false },
        speech_to_speech: { enabled: false },
        llm_gateway: { enabled: false },
        sync: { enabled: false },
        dictation: { enabled: false },
      },
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    return Response.json({ error: 'Could not start captions' }, { status: 502 });
  }
  const { token } = await res.json();
  return Response.json({ token });
}
`;

export const WORKLET_SOURCE = `// Mic audio at the AudioContext's rate -> 16 kHz mono PCM16, posted in 50 ms chunks.
// process() gets 128 frames at a time (under 3 ms at 48 kHz). The API closes the
// socket (3007) for chunks outside 20-1000 ms, so batch before sending.
const TARGET_RATE = 16000;
const CHUNK_SAMPLES = 800; // 50 ms at 16 kHz

class Pcm16Worklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / TARGET_RATE; // \`sampleRate\` is the worklet global
    this.pos = 0;
    this.sum = 0;
    this.count = 0;
    this.chunk = new Int16Array(CHUNK_SAMPLES);
    this.filled = 0;
  }

  process(inputs) {
    const mono = inputs[0][0];
    if (!mono) return true;
    for (let i = 0; i < mono.length; i++) {
      // Average the input frames behind each output sample (a cheap low-pass)
      this.sum += mono[i];
      this.count += 1;
      this.pos += 1;
      if (this.pos < this.step) continue;
      this.pos -= this.step;
      const s = Math.max(-1, Math.min(1, this.sum / this.count));
      this.sum = 0;
      this.count = 0;
      this.chunk[this.filled++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.filled === CHUNK_SAMPLES) {
        this.port.postMessage(this.chunk.buffer, [this.chunk.buffer]);
        this.chunk = new Int16Array(CHUNK_SAMPLES);
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm16-worklet', Pcm16Worklet);
`;

export const CAPTIONS_SOURCE = `'use client';
import { useEffect, useRef, useState } from 'react';

const WS_URL = 'wss://streaming.assemblyai.com/v3/ws';

export default function Captions() {
  const [turns, setTurns] = useState([]); // { order, text, final }
  const [status, setStatus] = useState('idle'); // idle | starting | live | stopping
  const [error, setError] = useState('');
  const live = useRef(null);

  useEffect(() => () => stop(), []); // end the session if the component unmounts

  function release() {
    const session = live.current;
    if (!session) return;
    clearTimeout(session.timer);
    session.mic?.getTracks().forEach(track => track.stop());
    if (session.ctx.state !== 'closed') session.ctx.close();
    live.current = null;
  }

  async function start() {
    setStatus('starting');
    setError('');
    setTurns([]);
    // Create the AudioContext inside the click so autoplay rules let it run
    const ctx = new AudioContext(); // device rate; the worklet resamples to 16 kHz
    live.current = { ctx };
    try {
      live.current.mic = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      await ctx.audioWorklet.addModule('/pcm16-worklet.js');

      // Mint after the mic prompt: the token has 60 s to open the socket
      const res = await fetch('/api/aai-token', { method: 'POST' });
      if (!res.ok) throw new Error('Could not get a captions token');
      const { token } = await res.json();

      const params = new URLSearchParams({
        token, // browsers cannot set headers on a WebSocket
        speech_model: 'universal-3-6-pro',
        sample_rate: '16000', // what the worklet sends
        encoding: 'pcm_s16le',
      });
      const ws = new WebSocket(\`\${WS_URL}?\${params}\`);
      live.current.ws = ws;

      const worklet = new AudioWorkletNode(ctx, 'pcm16-worklet');
      worklet.port.onmessage = event => {
        if (ws.readyState === WebSocket.OPEN) ws.send(event.data); // 50 ms of PCM16
      };
      // Connected to the destination so the node keeps running; it outputs silence
      ctx.createMediaStreamSource(live.current.mic).connect(worklet).connect(ctx.destination);

      ws.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'Begin') setStatus('live');
        if (msg.type === 'Turn') {
          setTurns(prev => [
            ...prev.filter(turn => turn.order !== msg.turn_order),
            { order: msg.turn_order, text: msg.transcript, final: msg.end_of_turn },
          ]);
        }
        if (msg.type === 'Error') setError(msg.error);
        // After Termination the server closes the socket with code 1000
      };
      ws.onclose = event => {
        release();
        setStatus('idle');
        if (event.code !== 1000) setError(event.reason || \`Closed with \${event.code}\`);
      };
    } catch (err) {
      release();
      setStatus('idle');
      setError(err.message);
    }
  }

  function stop() {
    const session = live.current;
    if (!session?.ws) return release();
    // 1. Stop the mic, so no audio follows Terminate
    session.mic.getTracks().forEach(track => track.stop());
    // 2. Terminate, then keep reading: the final Turn arrives before Termination
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type: 'Terminate' }));
      setStatus('stopping');
      session.timer = setTimeout(() => session.ws.close(1000), 5000); // fallback only
    } else {
      session.ws.close();
    }
  }

  return (
    <div>
      <button
        onClick={status === 'idle' ? start : stop}
        disabled={status === 'starting' || status === 'stopping'}
      >
        {status === 'idle' ? 'Start captions' : status === 'live' ? 'Stop' : '…'}
      </button>
      <p aria-live="polite">
        {[...turns]
          .sort((a, b) => a.order - b.order)
          .map(turn => (
            <span key={turn.order} style={{ opacity: turn.final ? 1 : 0.6 }}>
              {turn.text}{' '}
            </span>
          ))}
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
`;

export const REFERENCE_FILES = [
  {
    path: 'app/api/aai-token/route.js',
    note: 'Server. POST to the token host with the raw key; streaming-only, 60 s window.',
    code: TOKEN_ROUTE_SOURCE,
  },
  {
    path: 'public/pcm16-worklet.js',
    note: 'Audio thread. Resamples to 16 kHz, converts to PCM16, batches 50 ms chunks.',
    code: WORKLET_SOURCE,
  },
  {
    path: 'app/captions/Captions.jsx',
    note: 'Browser. Token in the URL, explicit model, turns by turn_order, Terminate then wait.',
    code: CAPTIONS_SOURCE,
  },
];

const marker = path => `// ---- ${path} ----\n`;

const REFERENCE_SAMPLE = REFERENCE_FILES.map(file => marker(file.path) + file.code).join('\n');

const FIRST_TRY_SAMPLE = `// ---- app/api/token/route.js ----
// Server half of the "Transcribe streaming audio" example in the assemblyai-node-sdk README
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

export async function GET() {
  const token = await client.streaming.createTemporaryToken({
    expires_in_seconds = 60,
  });
  return Response.json({ token });
}

// ---- app/captions/Captions.jsx ----
'use client';
import { useRef, useState } from 'react';

export default function Captions() {
  const ws = useRef(null);
  const recorder = useRef(null);
  const [text, setText] = useState('');

  async function start() {
    const { token } = await fetch('/api/token').then(r => r.json());
    // Query string from the browser examples llms.txt links to. ogg_opus because the
    // protocol page calls it "the format produced by ... browser MediaRecorder".
    ws.current = new WebSocket(
      \`wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&formatted_finals=true&encoding=ogg_opus&token=\${token}\`
    );
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder.current = new MediaRecorder(stream, { mimeType: 'audio/ogg;codecs=opus' });
    recorder.current.ondataavailable = e => ws.current.send(e.data);
    ws.current.onopen = () => recorder.current.start(250);
    ws.current.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'Turn') setText(msg.transcript);
    };
  }

  function stop() {
    recorder.current.stop();
    // Shutdown as written in the v2 to v3 JavaScript migration guide
    ws.current.send(JSON.stringify({ type: 'Terminate' }));
    ws.current.close();
  }

  return (
    <div>
      <button onClick={start}>Start captions</button>
      <button onClick={stop}>Stop</button>
      <p>{text}</p>
    </div>
  );
}
`;

const STALE_SAMPLE = `// ---- pages/api/token.js ----
// "Authenticate with a temporary token" from the Streaming v2 (Legacy) page, still in llms.txt.
// The Bearer prefix is the habit the MCP page (and most other APIs) teach.
export default async function handler(req, res) {
  const r = await fetch('https://api.assemblyai.com/v2/realtime/token', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${process.env.ASSEMBLYAI_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expires_in: 3600 }),
  });
  res.status(200).json(await r.json());
}

// ---- components/LiveCaptions.jsx ----
'use client';
import { useRef, useState } from 'react';

const SAMPLE_RATE = 16000;

export function LiveCaptions() {
  const session = useRef({});
  const [text, setText] = useState('');

  async function start() {
    const { token } = await fetch('/api/token').then(r => r.json());
    const ws = new WebSocket(
      \`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=\${SAMPLE_RATE}&token=\${token}\`
    );
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = e => {
      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
      if (ws.readyState === WebSocket.OPEN) ws.send(pcm.buffer);
    };
    source.connect(processor);
    processor.connect(ctx.destination);
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.message_type === 'FinalTranscript') setText(t => \`\${t} \${msg.text}\`);
    };
    session.current = { ws, ctx, stream };
  }

  function stop() {
    const { ws, ctx, stream } = session.current;
    stream.getTracks().forEach(t => t.stop());
    ctx.close();
    ws.send(JSON.stringify({ terminate_session: true }));
    ws.close();
  }

  return (
    <div>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <p>{text}</p>
    </div>
  );
}
`;

export const SAMPLES = [
  {
    id: 'first-try',
    label: 'First try',
    hint: 'Built only from current AssemblyAI snippets: SDK README, protocol page, linked examples, migration guide.',
    code: FIRST_TRY_SAMPLE,
  },
  {
    id: 'stale',
    label: 'Stale v2',
    hint: 'What the Streaming v2 (Legacy) page, still in llms.txt, leads to.',
    code: STALE_SAMPLE,
  },
  {
    id: 'reference',
    label: 'Reference fix',
    hint: 'The three files from "The fix" below.',
    code: REFERENCE_SAMPLE,
  },
];

export const README_DIFF = `   const token = await client.streaming.createTemporaryToken({
-    expires_in_seconds = 60,
+    expires_in_seconds: 60,
   });`;

export const MCP_TOOLS = [
  {
    name: 'create_streaming_token',
    why: 'Lets the agent open a real session while it builds, and shows the one correct mint call.',
    schema: {
      name: 'create_streaming_token',
      description:
        'Mint a temporary token for Real-time STT (POST https://token.assemblyai.com/v1/token with product=streaming) so the agent can open a test session or a browser can connect during development. Returns the token and a ready WebSocket URL. Never returns the API key.',
      inputSchema: {
        type: 'object',
        properties: {
          expires_in_seconds: {
            type: 'integer',
            minimum: 1,
            maximum: 600,
            default: 60,
            description: 'Window to open the WebSocket. The token can open several sessions until then.',
          },
          max_session_duration_seconds: {
            type: 'integer',
            minimum: 60,
            maximum: 10800,
            default: 300,
          },
          data_zone: { type: 'string', enum: ['nearest', 'us', 'eu'], default: 'nearest' },
          streaming_only: {
            type: 'boolean',
            default: true,
            description: 'Sets `access` so the token cannot open tts, speech_to_speech, llm_gateway, sync or dictation.',
          },
        },
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        required: ['token', 'expires_at', 'websocket_url'],
        properties: {
          token: { type: 'string' },
          expires_at: { type: 'string', format: 'date-time' },
          websocket_url: {
            type: 'string',
            description:
              'wss://streaming.assemblyai.com/v3/ws?speech_model=universal-3-6-pro&sample_rate=16000&encoding=pcm_s16le&token=...',
          },
        },
      },
    },
  },
  {
    name: 'check_streaming_config',
    why: 'Turns every gap on this page into something the agent can test before it says "done".',
    schema: {
      name: 'check_streaming_config',
      description:
        'Open a short test session with the exact connection the code builds, stream a bundled speech clip in the given format and chunk size, then report what the server applied and how the session ended. Use before telling the user a streaming integration works.',
      inputSchema: {
        type: 'object',
        required: ['websocket_url'],
        properties: {
          websocket_url: {
            type: 'string',
            description: 'The URL the code builds, token omitted. The tool adds a fresh token.',
          },
          audio: {
            type: 'string',
            enum: ['speech_16k_pcm16', 'speech_48k_pcm16', 'speech_8k_mulaw', 'speech_ogg_opus'],
            default: 'speech_16k_pcm16',
            description: 'Bundled clip, in the format the code actually sends.',
          },
          chunk_ms: { type: 'integer', minimum: 1, maximum: 5000, default: 50 },
          close_after_terminate_ms: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'How long the code waits after Terminate before close(). 0 reproduces an immediate close.',
          },
        },
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          applied_configuration: { type: 'object', description: 'Begin.configuration as the server echoed it.' },
          ignored_params: { type: 'array', items: { type: 'string' } },
          first_turn_ms: { type: 'integer' },
          final_turn_received: { type: 'boolean' },
          close_code: { type: 'integer' },
          problems: {
            type: 'array',
            items: { type: 'string' },
            description: "e.g. 'sample_rate=16000 but the audio looks like 48 kHz', '3007: 8 ms chunks', 'closed before Termination'.",
          },
        },
      },
    },
  },
];
