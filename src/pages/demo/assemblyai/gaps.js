// Gaps a coding agent hits on "Add live mic captions to my Next.js app with AssemblyAI streaming".
// Each quote was copied from the live source on VERIFIED_ON (markdown emphasis dropped).

export const VERIFIED_ON = '13 Nov 2026';

const DOCS = 'https://www.assemblyai.com/docs';
const GH = 'https://github.com';

const SRC = {
  agentPrompt: { label: 'docs/coding-agent-prompts.md', url: `${DOCS}/coding-agent-prompts.md` },
  mcp: { label: 'docs/mcp-server.md', url: `${DOCS}/mcp-server.md` },
  readme: {
    label: 'assemblyai-node-sdk README',
    url: `${GH}/AssemblyAI/assemblyai-node-sdk/blob/main/README.md?plain=1#L764-L784`,
  },
  models: { label: 'docs/streaming/select-the-speech-model.md', url: `${DOCS}/streaming/select-the-speech-model.md` },
  tokens: { label: 'docs/temporary-tokens.md', url: `${DOCS}/temporary-tokens.md` },
  tokenSpec: {
    label: 'docs/streaming/api-spec/generate-streaming-token.md',
    url: `${DOCS}/streaming/api-spec/generate-streaming-token.md`,
  },
  skill: {
    label: 'assemblyai-skill references/streaming.md',
    url: `${GH}/AssemblyAI/assemblyai-skill/blob/main/skills/assemblyai/references/streaming.md?plain=1#L202-L224`,
  },
  sequence: { label: 'docs/streaming/message-sequence.md', url: `${DOCS}/streaming/message-sequence.md` },
  migration: {
    label: 'docs/streaming/guides/v2_to_v3_migration_js.md',
    url: `${DOCS}/streaming/guides/v2_to_v3_migration_js.md`,
  },
  llms: { label: 'docs/llms.txt', url: `${DOCS}/llms.txt` },
  legacy: { label: 'docs/pre-recorded-audio/legacy-streaming.md', url: `${DOCS}/pre-recorded-audio/legacy-streaming.md` },
  next15: { label: 'nextjs.org/blog/next-15', url: 'https://nextjs.org/blog/next-15' },
};

export const GAPS = [
  {
    id: 'gap-auth',
    title: 'One header, two rules',
    agent:
      'Applies the agent prompt\'s blanket "no Bearer" rule when it connects the account MCP server with an API key, or copies the MCP page\'s Bearer header into REST and token calls.',
    evidence: [
      { ...SRC.agentPrompt, quote: 'Authorization header is the raw key — no `Bearer` prefix. This trips up everyone.' },
      {
        ...SRC.mcp,
        quote: 'Include the `Bearer ` prefix. The REST API takes the raw key, but the MCP server returns `401` without the prefix.',
      },
    ],
    breaks:
      'A raw key gets 401 from the MCP server; a Bearer key fails on REST and token calls. The exception is written on the MCP page and in the skill, not in the prompt agents are told to load.',
    fix: 'One line in §4 of the agent prompt: "Exception: the account MCP server (mcp.assemblyai.com) takes `Bearer <key>`."',
  },
  {
    id: 'gap-readme',
    title: "The SDK README's token snippet doesn't parse",
    agent: "Pastes the server half of the Node SDK README's streaming example into a route handler.",
    evidence: [
      {
        ...SRC.readme,
        code: 'const token = await client.streaming.createTemporaryToken({\n  expires_in_seconds = 60,\n});',
      },
      { ...SRC.readme, code: 'speechModel: "universal-3-5-pro",' },
      {
        ...SRC.models,
        quote:
          'The previous flagship streaming model. Still fully supported, with the same features as Universal-3.6 Pro but 18 languages instead of 32.',
      },
    ],
    breaks:
      'Node 22: "SyntaxError: Invalid shorthand property initializer", so the route never builds. The same example pins the previous model.',
    fix: '`expires_in_seconds: 60` (the one-line diff in the proposal below), and `speechModel: "universal-3-6-pro"`.',
  },
  {
    id: 'gap-token',
    title: 'Two mint endpoints, opposite reuse rules',
    agent:
      'Mints with GET streaming.assemblyai.com/v3/token, the path the skill, SDK 4.43.0 and both linked browser examples use. Believes "one-time use", so it sets a long expiry and never narrows the token.',
    evidence: [
      { ...SRC.tokens, quote: 'Send `POST` to a `token.` host … Only the `token.` hosts accept this request' },
      {
        ...SRC.skill,
        quote: 'Each temporary token is one-time use — it can only be used to open a single WebSocket session.',
      },
      {
        ...SRC.tokenSpec,
        quote:
          'The token is not single-use: until this window elapses, the same token can open multiple sessions, including concurrent sessions.',
      },
    ],
    breaks:
      'Nothing fails loudly: the GET path still answers. But a leaked 600 s token can open concurrent sessions, and "A token can open any product your account can, unless you narrow it."',
    fix: 'One mint call everywhere: POST token.assemblyai.com/v1/token, `expires_in_seconds: 60`, `access` turning off other products. Correct the skill line.',
  },
  {
    id: 'gap-terminate',
    title: 'Terminate, then close(): the last sentence is lost',
    agent:
      'Ends the session the way the v2 to v3 JavaScript migration guide and the linked vanilla-JS browser example do: send Terminate, close at once.',
    evidence: [
      {
        ...SRC.sequence,
        quote: 'Closing the socket as soon as you send `Terminate` silently discards your last transcript.',
      },
      { ...SRC.migration, code: 'ws.send(JSON.stringify(terminateMessage));\n}\nws.close();' },
      { ...SRC.migration, code: 'const YOUR_API_KEY = "YOUR-API-KEY"; // Replace with your actual API key' },
    ],
    breaks:
      'Stop drops the final Turn, so captions lose the last sentence. Ported to a client component, the guide\'s key constant ships in the bundle, and its `format_turns: true` is "Universal Streaming (English and Multilingual) only", a no-op on the default model.',
    fix: 'Send Terminate and keep reading until Termination (the server then closes with 1000). Close on a timeout only as a fallback.',
  },
  {
    id: 'gap-mediarecorder',
    title: 'MediaRecorder: the docs say yes, Chrome says no',
    agent:
      'Records the mic with MediaRecorder and sets `encoding=ogg_opus`, because the protocol page says that is what MediaRecorder produces.',
    evidence: [
      {
        ...SRC.sequence,
        quote:
          '`encoding=ogg_opus` — an Ogg-encapsulated Opus byte stream (the format produced by ffmpeg, gstreamer, opusenc, and browser MediaRecorder).',
      },
      {
        ...SRC.agentPrompt,
        quote: '`MediaRecorder` does not emit PCM16. You need an `AudioWorklet` (preferred) or `ScriptProcessorNode`',
      },
      {
        label: 'Tested in headless Chromium 153',
        code: "MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') // false\nMediaRecorder.isTypeSupported('audio/webm;codecs=opus') // true",
      },
    ],
    breaks:
      'In Chrome and Edge, asking MediaRecorder for Ogg throws NotSupportedError. Its default, WebM, is not in the `encoding` enum (pcm_s16le, pcm_mulaw, opus, ogg_opus, aac).',
    fix: 'Qualify the protocol line ("Chromium records WebM, which is not accepted") and point browsers to the AudioWorklet and pcm_s16le path.',
  },
  {
    id: 'gap-llms',
    title: 'llms.txt: no first-party browser page, a live v2 page',
    agent:
      'Searches llms.txt for browser streaming and lands on a community Next.js repo and the v2 legacy page, whose temporary-token section is complete and copyable.',
    evidence: [
      {
        ...SRC.llms,
        code: '- [Next.js example using Real-time STT](https://github.com/AssemblyAI-Community/streaming-api-nextjs)',
      },
      {
        ...SRC.llms,
        code: '- [Streaming v2 (Legacy)](https://www.assemblyai.com/docs/pre-recorded-audio/legacy-streaming.md): Transcribe live audio with Streaming Speech-to-Text',
      },
      { ...SRC.legacy, quote: '100 to 2000 milliseconds of audio per message' },
    ],
    breaks:
      '/v2/realtime/token and /v2/realtime/ws both answered 404 when I probed them. A v3 session closes with 3007 on chunks over 1000 ms. Both linked browser examples send `formatted_finals=true`, which v3 does not read and silently ignores.',
    fix: 'Add a first-party "Browser mic to Real-time STT (Next.js)" page to llms.txt and drop the legacy page from the index.',
  },
  {
    id: 'gap-mcp',
    title: "The MCP server can't touch streaming",
    agent:
      'Has the account MCP server connected and still writes WebSocket code blind: no tool mints a token or opens a test session.',
    evidence: [
      {
        ...SRC.mcp,
        code: 'submit_transcript · get_transcript · summarize_transcript\nunderstand_transcript · delete_transcript',
      },
      { ...SRC.mcp, quote: 'Audio must be at a public URL.' },
    ],
    breaks:
      'For real-time, first-try success rests on prose alone. Nothing checks the URL, auth, audio format or shutdown before a user clicks Record.',
    fix: 'Add `create_streaming_token` and `check_streaming_config` (schemas below).',
  },
  {
    id: 'gap-next',
    title: "The prompt's Next.js token route is static on Next 14",
    agent: "Copies the agent prompt's browser-pattern route, a GET handler that never reads the request, into a Next.js 14 app.",
    evidence: [
      {
        ...SRC.agentPrompt,
        code: "// Server\nexport async function GET() {\n  const res = await fetch('https://token.assemblyai.com/v1/token', {",
      },
      {
        ...SRC.next15,
        quote:
          'In Next 14, Route Handlers that used the `GET` HTTP method were cached by default unless they used a dynamic function or dynamic config option.',
      },
    ],
    breaks:
      '`next build` mints one token and serves it to every visitor. A minute later it has expired and every session closes with 1008.',
    fix: "Make the snippet `export async function POST()`, or add `export const dynamic = 'force-dynamic'`.",
  },
];

export const ALSO_SEEN = [
  'A bad key on the token host gets HTTP 404 {"detail":"Invalid API key"}, not the 401 the token spec lists.',
  'The v2 WebSocket answers 404; the agent prompt documents 410 for it.',
  "SDK 4.43.0 already ships a resampling PCM16 AudioWorklet, but only inside DualChannelCapture; there is no single-mic helper and the README doesn't mention it.",
];
