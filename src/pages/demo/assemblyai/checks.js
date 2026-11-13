// Deterministic checks for a browser integration of AssemblyAI Real-time STT (streaming v3).
// Pure functions: the page runs them in the browser for free, and the explain route re-runs
// them on the server so it never trusts findings sent by the client.
// They read code the way a reviewer skims for known failure patterns (regex, not a parser),
// so every message says what was matched and on which line.

export const STATUS_ORDER = { fail: 0, warn: 1, pass: 2, na: 3 };

export const GROUPS = [
  { id: 'auth', label: 'Keys and tokens' },
  { id: 'protocol', label: 'Protocol' },
  { id: 'audio', label: 'Audio' },
  { id: 'build', label: 'Build' },
];

const VALID_MODELS = [
  'universal-3-6-pro',
  'universal-3-5-pro',
  'universal-streaming-english',
  'universal-streaming-multilingual',
];

// Blank out comments, keeping line breaks so line numbers still match the original.
// Strings are kept: URLs like 'wss://...' must not be mistaken for comments.
export function stripComments(src) {
  let out = '';
  let mode = null; // null | 'line' | 'block' | quote character
  let lineStart = true;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const d = src[i + 1];
    if (mode === null) {
      if (c === '/' && d === '/' && src[i - 1] !== ':') {
        // (a ':' before '//' is a bare URL in a pasted shell command, not a comment)
        mode = 'line';
        out += '  ';
        i++;
      } else if (c === '/' && d === '*') {
        mode = 'block';
        out += '  ';
        i++;
      } else if (c === '#' && lineStart && (d === ' ' || d === '\n')) {
        mode = 'line'; // shell-style comment in pasted curl snippets
        out += ' ';
      } else {
        if (c === "'" || c === '"' || c === '`') mode = c;
        out += c;
      }
    } else if (mode === 'line') {
      if (c === '\n') {
        mode = null;
        out += '\n';
      } else out += ' ';
    } else if (mode === 'block') {
      if (c === '*' && d === '/') {
        mode = null;
        out += '  ';
        i++;
      } else out += c === '\n' ? '\n' : ' ';
    } else {
      if (c === '\\' && d !== undefined && d !== '\n') {
        out += c + d;
        i++;
      } else {
        if (c === mode || (c === '\n' && mode !== '`')) mode = null; // unterminated quotes end at the line
        out += c;
      }
    }
    if (c === '\n') lineStart = true;
    else if (c !== ' ' && c !== '\t') lineStart = false;
  }
  return out;
}

const MARKERS = [
  /^\s*\/\/\s*-{2,}\s*(.+?)\s*-{2,}\s*$/,
  /^\s*\/\/\s*(?:file|filename)\s*:\s*(\S+)/i,
  /^\s*\/\/\s*((?:app|pages|src|components|lib|public)\/\S+\.(?:[jt]sx?|mjs))\s*$/,
];

const BROWSER_API =
  /navigator\.mediaDevices|new\s+(?:window\.)?(?:webkit)?AudioContext|AudioWorkletProcessor|registerProcessor|MediaRecorder|\bdocument\.|\bwindow\./;
const SERVER_API =
  /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT)\b|export\s+default\s+(?:async\s+)?function\s+handler|\(\s*req\s*,\s*res\s*\)|from\s+['"]ws['"]|require\(\s*['"]ws['"]\s*\)|NextResponse|['"]use server['"]|from\s+['"]express['"]/;

function kindFor(name, text) {
  if (name) {
    if (/(^|\/)api\/|route\.[jt]s$|server|\.api\./i.test(name)) return 'server';
    if (/public\/|components\/|worklet|\.jsx$|\.tsx$|client/i.test(name)) return 'client';
  }
  if (/['"]use client['"]/.test(text)) return 'client';
  const browser = BROWSER_API.test(text);
  const server = SERVER_API.test(text);
  if (server && !browser) return 'server';
  if (browser && !server) return 'client';
  if (browser && server) return 'mixed';
  return 'unknown';
}

/** Splits pasted code into files (by `// ---- path ----` style markers) and classifies each. */
function segment(originalLines, strippedLines) {
  const starts = [];
  originalLines.forEach((line, index) => {
    for (const re of MARKERS) {
      const match = line.match(re);
      if (match) {
        starts.push({ index, name: match[1] });
        break;
      }
    }
  });
  if (!starts.length || starts[0].index > 0) starts.unshift({ index: 0, name: null });

  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : originalLines.length;
    const text = strippedLines.slice(start.index, end).join('\n');
    return { name: start.name, from: start.index, to: end, text, kind: kindFor(start.name, text) };
  });
}

function analyze(source) {
  const original = String(source ?? '').replace(/\r\n?/g, '\n');
  const stripped = stripComments(original);
  const lines = stripped.split('\n');
  const segs = segment(original.split('\n'), lines);
  const lineKind = new Array(lines.length);
  const lineSeg = new Array(lines.length);
  for (const seg of segs) {
    for (let i = seg.from; i < seg.to; i++) {
      lineKind[i] = seg.kind;
      lineSeg[i] = seg;
    }
  }
  const offsets = [0];
  for (let i = 0; i < stripped.length; i++) if (stripped[i] === '\n') offsets.push(i + 1);
  const lineAt = index => {
    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  return { original, stripped, lines, segs, lineKind, lineSeg, lineAt };
}

const isClientKind = kind => kind === 'client' || kind === 'mixed';

/** Lines (1-based) whose stripped text matches `re`, optionally only in some file kinds. */
function findLines(ctx, re, { kinds } = {}) {
  const hits = [];
  ctx.lines.forEach((line, i) => {
    if (kinds && !kinds.includes(ctx.lineKind[i])) return;
    const match = line.match(re);
    if (match) hits.push({ line: i + 1, match, seg: ctx.lineSeg[i] });
  });
  return hits;
}

/** Matches across the whole stripped text (for multi-line patterns), with line numbers. */
function findText(ctx, re) {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  const global = new RegExp(re.source, flags);
  const hits = [];
  let match;
  while ((match = global.exec(ctx.stripped))) {
    hits.push({ line: ctx.lineAt(match.index), match, index: match.index });
    if (match[0] === '') global.lastIndex++;
  }
  return hits;
}

const lineNumbers = hits => [...new Set(hits.map(hit => hit.line))].sort((a, b) => a - b);

function result(check, status, summary, hits = []) {
  return { ...check, status, summary, lines: lineNumbers(hits) };
}

// --- shared facts about the pasted code --------------------------------------------

function resolveNumber(ctx, token) {
  if (!token) return null;
  const clean = String(token).replace(/_/g, '');
  if (/^\d+$/.test(clean)) return Number(clean);
  const constant = ctx.stripped.match(
    new RegExp(`(?:const|let|var)\\s+${token.replace(/[$]/g, '\\$')}\\s*=\\s*['"]?([\\d_]+)`)
  );
  return constant ? Number(constant[1].replace(/_/g, '')) : null;
}

function facts(ctx) {
  const streaming =
    /streaming\.(?:us\.|eu\.)?assemblyai\.com|\/v3\/ws|\/v2\/realtime|StreamingTranscriber|RealtimeTranscriber|streaming\.transcriber|realtime\.transcriber/.test(
      ctx.stripped
    );
  const v2 = findLines(
    ctx,
    /\/v2\/realtime\/ws|RealtimeTranscriber|realtime\.transcriber|message_type|SessionBegins|PartialTranscript|FinalTranscript|terminate_session/
  );
  const v3 = findLines(ctx, /\/v3\/ws|StreamingTranscriber|streaming\.transcriber/);

  const modelHits = findLines(
    ctx,
    /speech_model['"]?\s*[:=]\s*['"]([\w.-]+)['"]|speech_model=([\w.-]+)|speechModel['"]?\s*:\s*['"]([\w.-]+)['"]/
  ).map(hit => ({ ...hit, value: hit.match[1] || hit.match[2] || hit.match[3] }));
  if (!modelHits.length) {
    // speech_model=${MODEL} with const MODEL = 'universal-...'
    findLines(ctx, /['"](universal-[\w-]+|u3-rt-pro|whisper-rt)['"]/).forEach(hit =>
      modelHits.push({ ...hit, value: hit.match[1] })
    );
  }
  const model = modelHits[0]?.value || null;
  const effectiveModel = model || 'universal-3-6-pro'; // the server default

  const encodingMatch = ctx.stripped.match(
    /encoding['"]?\s*[:=]\s*['"]?(pcm_s16le|pcm_mulaw|ogg_opus|opus|aac)|encoding=(pcm_s16le|pcm_mulaw|ogg_opus|opus|aac)/
  );
  const encoding = encodingMatch ? encodingMatch[1] || encodingMatch[2] : 'pcm_s16le';

  const mint = {
    v2: findLines(ctx, /\/v2\/realtime\/token|realtime\.createTemporaryToken|create_temporary_token/),
    v1: findLines(ctx, /token\.(?:us\.|eu\.)?assemblyai\.com\/v1\/token/),
    v3get: findLines(ctx, /streaming\.(?:us\.|eu\.)?assemblyai\.com\/v3\/token|streaming\.createTemporaryToken/),
  };
  mint.any = mint.v2.length + mint.v1.length + mint.v3get.length > 0;

  const capture = {
    mediaRecorder: findLines(ctx, /new\s+MediaRecorder\s*\(/),
    scriptProcessor: findLines(ctx, /createScriptProcessor\s*\(/),
    worklet: findLines(ctx, /audioWorklet\.addModule|new\s+AudioWorkletNode|extends\s+AudioWorkletProcessor/),
    getUserMedia: findLines(ctx, /getUserMedia\s*\(/),
  };
  capture.any =
    capture.mediaRecorder.length + capture.scriptProcessor.length + capture.worklet.length + capture.getUserMedia.length > 0;

  return { streaming, v2, v3, modelHits, model, effectiveModel, encoding, mint, capture };
}

// --- the checks -----------------------------------------------------------------------

const CHECKS = [
  {
    id: 'key-in-client',
    group: 'auth',
    title: 'API key stays on the server',
    run(ctx) {
      const hits = [
        ...findLines(ctx, /NEXT_PUBLIC_\w*(?:ASSEMBLY|AAI)\w*/).map(h => ({
          ...h,
          why: `${h.match[0]} is inlined into the browser bundle.`,
        })),
        ...findLines(
          ctx,
          /(?:api_?key|API_KEY|apiKey|authorization)['"]?\s*[:=]\s*['"`](?!YOUR|<|\[|\$\{)[A-Za-z0-9]{24,}['"`]/i
        ).map(h => ({ ...h, why: 'A literal API key is in the source.' })),
        ...findLines(ctx, /process\.env\.ASSEMBLYAI_API_KEY|\bapiKey\s*:/, { kinds: ['client'] }).map(h => ({
          ...h,
          why: 'Browser code reads the API key.',
        })),
        ...findLines(ctx, /(?:const|let|var)\s+\w*API_?KEY\w*\s*=\s*['"`]/, { kinds: ['client', 'mixed'] }).map(
          h => ({
            ...h,
            why: 'A key constant in browser code ships in the bundle once someone fills it in.',
          })
        ),
        ...findLines(ctx, /token=\$\{[^}]*(?:API_?KEY|apiKey)/i).map(h => ({
          ...h,
          why: 'The API key is passed as ?token=. Only a temporary token belongs in the URL.',
        })),
      ];
      if (hits.length) return result(this, 'fail', hits[0].why, hits);
      const hasClient = ctx.segs.some(seg => isClientKind(seg.kind));
      if (!hasClient) return result(this, 'na', 'No browser code in the paste.');
      return result(this, 'pass', 'No AssemblyAI key is reachable from browser code.');
    },
  },
  {
    id: 'temp-token',
    group: 'auth',
    title: 'Browser connects with a temporary token',
    run(ctx) {
      const opens = findLines(
        ctx,
        /new\s+WebSocket\s*\(|new\s+(?:StreamingTranscriber|RealtimeTranscriber)\s*\(|(?:streaming|realtime)\.transcriber\s*\(/,
        { kinds: ['client', 'mixed'] }
      );
      if (!opens.length) return result(this, 'na', 'No browser-side streaming connection in the paste.');
      const clientText = ctx.segs
        .filter(seg => isClientKind(seg.kind))
        .map(seg => seg.text)
        .join('\n');
      if (/[?&]token=|\btoken\s*[,}:)]/.test(clientText)) {
        return result(this, 'pass', 'The browser passes a temporary token (?token=), never the key.', opens);
      }
      return result(
        this,
        'fail',
        'The browser opens the socket without a token. Browsers cannot set headers on a WebSocket, so it needs ?token= from your server.',
        opens
      );
    },
  },
  {
    id: 'token-endpoint',
    group: 'auth',
    gap: 'gap-token',
    title: 'Token minted on the documented endpoint',
    run(ctx, f) {
      if (f.mint.v2.length) {
        return result(
          this,
          'fail',
          'v2 token endpoint. /v2/realtime/token answered 404 when probed on 13 Nov 2026; mint with POST https://token.assemblyai.com/v1/token.',
          f.mint.v2
        );
      }
      if (f.mint.v1.length) {
        const seg = f.mint.v1[0].seg;
        if (/method\s*:\s*['"]POST['"]|-X\s+POST/i.test(seg?.text || ctx.stripped)) {
          return result(this, 'pass', 'POST https://token.assemblyai.com/v1/token, as the docs specify.', f.mint.v1);
        }
        return result(
          this,
          'fail',
          'The token host only mints on POST with a JSON body; this call has no POST method.',
          f.mint.v1
        );
      }
      if (f.mint.v3get.length) {
        return result(
          this,
          'warn',
          'GET /v3/token: the path SDK 4.43.0, the skill and the linked browser examples use. The docs say POST token.assemblyai.com/v1/token and "Only the token. hosts accept this request".',
          f.mint.v3get
        );
      }
      return result(this, 'na', 'No token minting in the paste.');
    },
  },
  {
    id: 'token-scope',
    group: 'auth',
    gap: 'gap-token',
    title: 'Token is short-lived and streaming-only',
    run(ctx, f) {
      if (!f.mint.any) return result(this, 'na', 'No token minting in the paste.');
      const v2Expiry = findLines(ctx, /\bexpires_in['"]?\s*:\s*\d+/);
      if (v2Expiry.length) {
        return result(
          this,
          'fail',
          '`expires_in` is the v2 field (60 to 360000 s). v3 takes `expires_in_seconds`, from 1 to 600.',
          v2Expiry
        );
      }
      const expiries = findLines(ctx, /expires_in_seconds['"]?\s*[:=]\s*['"]?(\d+)|expires_in_seconds=(\d+)/).map(
        h => ({ ...h, value: Number(h.match[1] || h.match[2]) })
      );
      const tooLong = expiries.filter(h => h.value > 600);
      if (tooLong.length) {
        return result(this, 'fail', '`expires_in_seconds` must be 1 to 600; the mint call is refused.', tooLong);
      }
      const long = expiries.filter(h => h.value > 120);
      if (long.length) {
        return result(
          this,
          'warn',
          `A ${long[0].value} s token can open several sessions, even concurrent ones, until it expires. Keep it near 60 s.`,
          long
        );
      }
      if (f.mint.v3get.length) {
        return result(
          this,
          'warn',
          'This mint path takes no `access` settings, and "A token can open any product your account can, unless you narrow it."',
          f.mint.v3get
        );
      }
      if (f.mint.v1.length && !/\baccess['"]?\s*:/.test(ctx.stripped)) {
        return result(
          this,
          'warn',
          'No `access` field: the token can also open TTS, voice agents and LLM Gateway on your account.',
          f.mint.v1
        );
      }
      return result(this, 'pass', 'Short window, other products switched off with `access`.', [...expiries, ...f.mint.v1]);
    },
  },
  {
    id: 'auth-header',
    group: 'auth',
    gap: 'gap-auth',
    title: 'Auth header form matches the endpoint',
    run(ctx) {
      const bearer = findLines(ctx, /Bearer\b/).filter(
        hit => !/mcp\.assemblyai\.com/.test(hit.seg?.text || '') && /assemblyai|ASSEMBLYAI|AAI/.test(hit.seg?.text || '')
      );
      if (bearer.length) {
        return result(
          this,
          'fail',
          'Bearer prefix on an AssemblyAI REST, token or streaming call. These take the raw key in Authorization.',
          bearer
        );
      }
      const mcp = findLines(ctx, /mcp\.assemblyai\.com/).filter(
        hit => /authorization/i.test(hit.seg?.text || '') && !/Bearer\b/.test(hit.seg?.text || '')
      );
      if (mcp.length) {
        return result(
          this,
          'fail',
          'The account MCP server needs `Authorization: Bearer <key>`; a raw key gets 401.',
          mcp
        );
      }
      const headers = findLines(ctx, /authorization['"]?\s*[:,]|-H\s+['"]Authorization/i).filter(hit =>
        /assemblyai|ASSEMBLYAI/.test(hit.seg?.text || '')
      );
      if (!headers.length) return result(this, 'na', 'No Authorization header in the paste.');
      return result(this, 'pass', 'Raw key in Authorization for AssemblyAI calls, no Bearer.', headers);
    },
  },
  {
    id: 'next-route',
    group: 'auth',
    gap: 'gap-next',
    title: 'Token route runs per request',
    run(ctx, f) {
      if (!f.mint.any) return result(this, 'na', 'No token route in the paste.');
      const gets = findLines(ctx, /export\s+(?:async\s+)?function\s+GET\s*\(([^)]*)\)/).filter(hit =>
        /createTemporaryToken|\/v1\/token|\/v3\/token|\/v2\/realtime\/token/.test(hit.seg?.text || '')
      );
      if (gets.length) {
        const text = gets[0].seg?.text || '';
        const dynamic =
          /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]|export\s+const\s+revalidate\s*=\s*0|\bheaders\(\)|\bcookies\(\)/.test(
            text
          ) || (gets[0].match[1].trim() && new RegExp(`\\b${gets[0].match[1].trim().split(/[\s,:]/)[0]}\\.`).test(text));
        if (dynamic) return result(this, 'pass', 'GET handler opts out of static rendering.', gets);
        return result(
          this,
          'warn',
          'Next.js 14 prerenders a GET route handler that never reads the request: one build-time token for every visitor, expired a minute later. Use POST.',
          gets
        );
      }
      const handlers = findLines(
        ctx,
        /export\s+(?:async\s+)?function\s+POST\b|export\s+default\s+(?:async\s+)?function\s+handler|app\.(?:get|post)\s*\(/
      );
      if (handlers.length) return result(this, 'pass', 'The token route runs on every request.', handlers);
      return result(this, 'na', 'No Next.js route handler in the paste.');
    },
  },
  {
    id: 'endpoint',
    group: 'protocol',
    gap: 'gap-llms',
    title: 'Uses the v3 streaming API',
    run(ctx, f) {
      if (f.v2.length) {
        return result(
          this,
          'fail',
          'Streaming v2 (api.assemblyai.com/v2/realtime, message_type, terminate_session). The v2 WebSocket answered 404 when probed on 13 Nov 2026.',
          f.v2
        );
      }
      if (f.v3.length) return result(this, 'pass', 'v3 WebSocket (streaming.assemblyai.com/v3/ws).', f.v3);
      return result(this, 'na', 'No AssemblyAI streaming connection in the paste.');
    },
  },
  {
    id: 'speech-model',
    group: 'protocol',
    gap: 'gap-readme',
    title: 'Speech model is explicit and current',
    run(ctx, f) {
      if (!f.streaming || f.v2.length) return result(this, 'na', 'No v3 streaming connection to check.');
      const plural = findLines(ctx, /\bspeech_models\b/);
      if (plural.length) {
        return result(
          this,
          'fail',
          '`speech_models` (plural) is the pre-recorded field. Streaming reads `speech_model` and ignores unknown params.',
          plural
        );
      }
      const invalid = f.modelHits.filter(hit => !VALID_MODELS.includes(hit.value));
      if (invalid.length) {
        return result(
          this,
          'fail',
          `\`${invalid[0].value}\` is not in the speech_model enum (universal-3-6-pro, universal-3-5-pro, universal-streaming-english, universal-streaming-multilingual).`,
          invalid
        );
      }
      const previous = f.modelHits.filter(hit => hit.value === 'universal-3-5-pro');
      if (previous.length) {
        return result(
          this,
          'warn',
          'universal-3-5-pro is the previous flagship (18 languages). Universal-3.6 Pro is the recommended default (32).',
          previous
        );
      }
      if (!f.modelHits.length) {
        return result(
          this,
          'warn',
          'Not set. The server picks universal-3-6-pro today; set it explicitly and check Begin.configuration.model, since misspelled params are ignored, not rejected.',
          f.v3
        );
      }
      return result(this, 'pass', `speech_model=${f.modelHits[0].value}.`, f.modelHits);
    },
  },
  {
    id: 'params',
    group: 'protocol',
    gap: 'gap-llms',
    title: 'No parameters v3 silently ignores',
    run(ctx, f) {
      if (!f.streaming || f.v2.length) return result(this, 'na', 'No v3 streaming connection to check.');
      const universalStreaming = /^universal-streaming-/.test(f.effectiveModel);
      const rules = [
        [/\bformatted_finals\b/, '`formatted_finals` is not a v3 parameter, so it does nothing; unknown params are ignored, not rejected.'],
        [/\bword_boost\b/, '`word_boost` is v2. v3 takes `keyterms_prompt`.'],
        [/\bdisable_partial_transcripts\b/, '`disable_partial_transcripts` is v2. v3 takes `include_partial_turns`.'],
        !universalStreaming && [
          /\bformat_turns\b/,
          `\`format_turns\` is "Universal Streaming (English and Multilingual) only"; ${f.effectiveModel} finals are always formatted.`,
        ],
        !universalStreaming && [
          /\bend_of_turn_confidence_threshold\b/,
          `\`end_of_turn_confidence_threshold\` only affects Universal Streaming; ${f.effectiveModel} ignores it.`,
        ],
      ].filter(Boolean);
      for (const [re, why] of rules) {
        const hits = findLines(ctx, re);
        if (hits.length) return result(this, 'warn', why, hits);
      }
      return result(this, 'pass', 'Every query parameter found is one v3 reads.');
    },
  },
  {
    id: 'terminate',
    group: 'protocol',
    gap: 'gap-terminate',
    title: 'Stop sends Terminate and waits for Termination',
    run(ctx, f) {
      if (!f.streaming) return result(this, 'na', 'No streaming session in the paste.');
      const v2 = findLines(ctx, /terminate_session/);
      if (v2.length) {
        return result(this, 'fail', '`terminate_session` is the v2 message. v3 expects {"type":"Terminate"}.', v2);
      }
      const terminate = findLines(ctx, /type['"]?\s*:\s*['"]Terminate['"]/);
      const sdkClose = /StreamingTranscriber|streaming\.transcriber/.test(ctx.stripped)
        ? findLines(ctx, /\b\w+\.close\s*\(\s*\)/)
        : [];
      if (!terminate.length && !sdkClose.length) {
        return result(
          this,
          'fail',
          'Never sends Terminate: the session stays open, and billed, until the 3-hour cap.',
          findLines(ctx, /new\s+WebSocket\s*\(/)
        );
      }
      const early = [];
      for (const hit of terminate) {
        for (let i = hit.line - 1; i < Math.min(ctx.lines.length, hit.line + 3); i++) {
          const line = ctx.lines[i];
          if (/\.close\s*\(/.test(line) && !/setTimeout|Termination|await/.test(line)) {
            early.push({ line: i + 1 });
            break;
          }
        }
      }
      if (early.length) {
        return result(
          this,
          'fail',
          'close() right after Terminate. "Closing the socket as soon as you send Terminate silently discards your last transcript."',
          [...terminate, ...early]
        );
      }
      if (terminate.length) {
        return result(this, 'pass', 'Sends Terminate and keeps the socket open for the final Turn.', terminate);
      }
      return result(this, 'pass', 'SDK close() sends Terminate and waits for the session to end.', sdkClose);
    },
  },
  {
    id: 'audio-format',
    group: 'audio',
    gap: 'gap-mediarecorder',
    title: 'Audio is PCM16 from an AudioWorklet',
    run(ctx, f) {
      const { mediaRecorder, scriptProcessor, worklet, getUserMedia } = f.capture;
      if (mediaRecorder.length) {
        const mime = ctx.stripped.match(/mimeType\s*:\s*['"]([^'"]+)['"]/)?.[1] || '';
        if (/ogg/i.test(mime)) {
          return result(
            this,
            'fail',
            `Chromium's MediaRecorder cannot record Ogg (isTypeSupported('${mime}') is false in Chromium 153), so this throws NotSupportedError in Chrome and Edge.`,
            mediaRecorder
          );
        }
        return result(
          this,
          'fail',
          `MediaRecorder gives ${mime || 'WebM (the Chromium default)'}; \`encoding\` accepts pcm_s16le, pcm_mulaw, opus, ogg_opus and aac only.`,
          mediaRecorder
        );
      }
      const int16 = /Int16Array/.test(ctx.stripped);
      if (scriptProcessor.length) {
        if (!int16) {
          return result(this, 'fail', 'Float32 samples are sent as-is; the API expects 16-bit PCM.', scriptProcessor);
        }
        return result(
          this,
          'warn',
          'ScriptProcessorNode is deprecated and runs on the main thread, so UI work can drop audio. Move the conversion into an AudioWorklet.',
          scriptProcessor
        );
      }
      if (worklet.length) {
        if (int16) return result(this, 'pass', 'AudioWorklet converts Float32 to Int16 PCM.', worklet);
        return result(this, 'warn', 'AudioWorklet found but no Float32 to Int16 conversion; the API expects PCM16.', worklet);
      }
      if (getUserMedia.length) {
        return result(this, 'fail', 'The mic is opened but its audio is never converted to PCM16.', getUserMedia);
      }
      return result(this, 'na', 'No audio capture in the paste.');
    },
  },
  {
    id: 'sample-rate',
    group: 'audio',
    title: 'Declared sample rate matches the audio',
    run(ctx, f) {
      if (!f.capture.any || f.capture.mediaRecorder.length) {
        return result(this, 'na', 'No PCM capture in the paste.');
      }
      if (f.encoding !== 'pcm_s16le' && f.encoding !== 'pcm_mulaw') {
        return result(this, 'na', `${f.encoding} describes its own sample rate.`);
      }
      const dynamic = findLines(ctx, /sample_rate[^\n]*\.sampleRate|sampleRate\s*:\s*\w+\.sampleRate/);
      if (dynamic.length) return result(this, 'pass', 'sample_rate is read from the AudioContext.', dynamic);

      const declaredHits = findLines(
        ctx,
        /sample_rate=\$\{(\w+)\}|sample_rate=(\d+)|sample_rate['"]?\s*[:=]\s*['"]?([A-Za-z_]\w*|\d[\d_]*)/
      ).map(h => ({ ...h, value: resolveNumber(ctx, h.match[1] || h.match[2] || h.match[3]) }));
      const declared = declaredHits.find(h => h.value)?.value ?? null;

      const fixed = findLines(ctx, /new\s+(?:window\.)?(?:webkit)?AudioContext\s*\(\s*\{[^}]*sampleRate\s*:\s*([\w$]+)/).map(
        h => ({ ...h, value: resolveNumber(ctx, h.match[1]) })
      );
      const native = findLines(ctx, /new\s+(?:window\.)?(?:webkit)?AudioContext\s*\(\s*(?:\)|\{(?![^}]*sampleRate))/);
      const resamples = /resampl|downsampl|TARGET_RATE|targetRate|sampleRate\s*\/\s*(?:TARGET|target|16_?000)/i.test(
        ctx.stripped
      );

      if (!declaredHits.length) {
        return result(this, 'warn', 'No sample_rate in the URL; the server assumes 16000 for PCM. State it.', native);
      }
      if (fixed.length && declared && fixed[0].value && fixed[0].value !== declared) {
        return result(
          this,
          'fail',
          `AudioContext runs at ${fixed[0].value} Hz but the URL says ${declared}.`,
          [...fixed, ...declaredHits]
        );
      }
      if (native.length && !fixed.length && !resamples) {
        return result(
          this,
          'fail',
          `AudioContext runs at the device rate (usually 44.1 or 48 kHz) and nothing resamples, but the URL says sample_rate=${
            declared ?? '?'
          }. The server gets about 3 s of "audio" per second: garbled text, then 3007 once the backlog passes five minutes.`,
          [...native, ...declaredHits]
        );
      }
      return result(this, 'pass', `Audio is produced at the declared ${declared ?? 16000} Hz.`, declaredHits);
    },
  },
  {
    id: 'chunking',
    group: 'audio',
    title: 'Chunks are 20 to 1000 ms',
    run(ctx, f) {
      const { mediaRecorder, scriptProcessor, worklet } = f.capture;
      const outOfRange = ms => ms < 20 || ms > 1000;
      if (mediaRecorder.length) {
        const start = findLines(ctx, /\.start\s*\(\s*(\d+)\s*\)/);
        if (!start.length) return result(this, 'na', 'MediaRecorder without a timeslice sends one blob at stop.', mediaRecorder);
        const ms = Number(start[0].match[1]);
        if (outOfRange(ms)) return result(this, 'fail', `${ms} ms chunks; the API closes the socket (3007) outside 20 to 1000 ms.`, start);
        return result(this, 'pass', `${ms} ms chunks.`, start);
      }
      if (scriptProcessor.length) {
        const frames = Number(ctx.stripped.match(/createScriptProcessor\s*\(\s*(\d+)/)?.[1] || 4096);
        const fixed = ctx.stripped.match(/AudioContext\s*\(\s*\{[^}]*sampleRate\s*:\s*([\w$]+)/);
        const rate = fixed ? resolveNumber(ctx, fixed[1]) : null;
        const rates = rate ? [rate] : [44100, 48000];
        const ms = rates.map(r => Math.round((frames / r) * 1000));
        const label = ms.length > 1 ? `about ${Math.min(...ms)} to ${Math.max(...ms)} ms` : `${ms[0]} ms`;
        if (ms.some(outOfRange)) return result(this, 'fail', `${frames}-frame buffers are ${label}; the API needs 20 to 1000 ms.`, scriptProcessor);
        return result(this, 'pass', `${frames}-frame buffers, ${label} each.`, scriptProcessor);
      }
      if (worklet.length) {
        const batches = findLines(
          ctx,
          /CHUNK|chunkSize|chunk_ms|chunkMs|bufferDuration|samplesPerChunk|\b(?:800|1600|2400)\b|\b0\.05\b|\b0\.1\b|>=\s*(?:50|100)\b/
        );
        if (batches.length) return result(this, 'pass', 'Worklet output is batched into fixed chunks.', batches.slice(0, 2));
        return result(
          this,
          'warn',
          'No batching found. process() gets 128 frames (8 ms at 16 kHz); sending each one breaks the 20 ms minimum (3007).',
          worklet
        );
      }
      return result(this, 'na', 'No audio capture in the paste.');
    },
  },
  {
    id: 'syntax',
    group: 'build',
    gap: 'gap-readme',
    title: 'Doc snippets compile',
    run(ctx) {
      if (!ctx.stripped.trim()) return result(this, 'na', 'Nothing to check.');
      const hits = findText(ctx, /[\w$]\s*\(\s*\{\s*[A-Za-z_$][\w$]*\s*=(?![=>])/).filter(hit => {
        const before = ctx.stripped.slice(Math.max(0, hit.index - 40), hit.index + 1);
        if (/function\s*[\w$]*\s*$|function\s+[\w$]+$/.test(before)) return false;
        const close = ctx.stripped.indexOf('})', hit.index);
        const after = close === -1 ? '' : ctx.stripped.slice(close + 2, close + 12);
        return !/^\s*(?:=>|\{)/.test(after);
      });
      if (hits.length) {
        return result(
          this,
          'fail',
          '`{ name = value }` inside a call: "SyntaxError: Invalid shorthand property initializer" (the SDK README\'s createTemporaryToken snippet).',
          hits.map(h => ({ line: ctx.lineAt(h.index + h.match[0].length - 1) }))
        );
      }
      return result(this, 'pass', 'None of the known doc typos.');
    },
  },
];

export const CHECK_COUNT = CHECKS.length;

/** Runs every check on pasted code. Returns { checks, counts }. */
export function runChecks(source) {
  const ctx = analyze(source);
  const f = facts(ctx);
  const checks = CHECKS.map(check => {
    const { run, ...meta } = check;
    try {
      return run.call(meta, ctx, f);
    } catch {
      return { ...meta, status: 'na', summary: 'Could not evaluate this check on the paste.', lines: [] };
    }
  });
  const counts = { fail: 0, warn: 0, pass: 0, na: 0 };
  checks.forEach(check => counts[check.status]++);
  return { checks, counts };
}
