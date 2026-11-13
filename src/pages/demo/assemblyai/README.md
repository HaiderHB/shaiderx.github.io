# AssemblyAI demo: first-try streaming

Unlisted prototype for the "Software Engineer, Agent Experience" application, live at
`/demo/assemblyai/?k=<key>`. It takes one common task ("Add live mic captions to my Next.js
app with AssemblyAI streaming"), shows where a coding agent following AssemblyAI's own
material goes wrong, and gives the fix.

## What is on the page

1. **Integration checker** (`checks.js`, `Checker.js`). 14 deterministic rules that run in the
   browser for free on pasted code, with line refs and links to the evidence. Three samples:
   "First try" (built only from current AssemblyAI snippets), "Stale v2" (what the legacy page
   in llms.txt leads to) and the reference fix. An optional LLM pass
   (`/api/demo/assemblyai/explain/`) explains the failures and proposes one diff.
2. **8 verified gaps** (`gaps.js`), each with what the agent does, a verbatim quote and link,
   what breaks, and the fix.
3. **The fix** (`reference.js`): token route, PCM16 AudioWorklet, captions component.
4. **Proposals**: two MCP tool definitions, the README diff, an eval design (no results).
5. **First 30 days**.

## Env vars

| Var | Needed for | Without it |
| --- | --- | --- |
| `OPENAI_API_KEY` | "Explain failures" | Route returns 502 with a clear message; checks still work |
| `DEMO_LLM_MODEL` | Optional model override | Uses `gpt-6-luna` |
| `ASSEMBLYAI_API_KEY` | "Try the fix live" captions | Button is not rendered (decided at build time in `getStaticProps`); the token route returns 503 `no_assemblyai_key` |
| `ASSEMBLYAI_TOKEN_URL` | Optional, e.g. the EU token host | `https://token.assemblyai.com/v1/token` |

Both paid routes go through `demoApi`: explain costs `COST.llm`, the token route `COST.voice`.
Without a demo key (`?k=`) visitors get the preview banner and the explain button shows the
key notice; the rule checks are unaffected.

## How the gaps were verified (13 Nov 2026)

- Every quote is copied from the raw page (`.md` docs, raw GitHub files) on that date.
- README snippet: ran it under Node 22 (`SyntaxError: Invalid shorthand property initializer`).
- MediaRecorder: `MediaRecorder.isTypeSupported` in headless Chromium 153
  (`audio/ogg;codecs=opus` false, `audio/webm;codecs=opus` true).
- SDK token path: read `assemblyai@4.43.0/dist/assemblyai.streaming.umd.js` (`GET /v3/token`).
- Endpoints, probed with no key or a junk key only: `/v2/realtime/token` and `/v2/realtime/ws`
  return 404; `GET streaming.assemblyai.com/v3/token` and `POST token.assemblyai.com/v1/token`
  both still answer (422 without a key), and a junk key gets 404 `Invalid API key`.
- Next.js 14 GET caching: the Next.js 15 release post.
- Reference worklet: rendered a 440 Hz tone through it in an `OfflineAudioContext` at 48, 44.1
  and 16 kHz in Chromium. Each gave 800-sample (50 ms at 16 kHz) chunks, 32,000 samples per 2 s,
  and 440 Hz out. The token route and explain route were run against local mocks (stream,
  cache hit, empty reply, model error, missing keys). No real AssemblyAI session was opened.

## What I assumed

- The agent reads what AssemblyAI points it to: the agent prompt, skill, SDK README, docs MCP,
  llms.txt and the examples it links. I did not run agents; the "First try" sample is assembled
  by hand from those snippets, with a comment naming the source of each part.
- App Router and Next.js 14 or 15 for the reference, since that is what agents scaffold today.
- `gpt-6-luna` is the current small, fast OpenAI model (developers.openai.com models page). It
  reasons by default and `chatStream` has no reasoning-effort option, so the budget is 3000
  tokens; an empty reply returns a clear error and is not cached.

## What I cut

- Running the reference live without an AssemblyAI key. It is written against the current
  docs and checked by the rules, but I could not open a real session. The live button exists
  for a deployment that has a key.
- Real agent runs and eval numbers. The eval section is a design only.
- A JS parser for the checker. The rules are regexes over comment-stripped code, so they can
  be fooled; each finding names the line it matched.
- Python, pre-recorded and voice-agent integrations. Same method, different rules.

## With real access

- Run the eval: Claude Code, Cursor and Codex, four conditions, Next.js 14 and 15, headless
  Chrome with a fake mic file, these rules as graders. Publish the baseline, then the delta
  per fix.
- Build `check_streaming_config` server-side, where the session knows which parameters it
  ignored and when Termination was sent.
- Turn the rules into a docs CI over every agent-facing file (prompt, skill, README,
  examples) so contradictions like the Bearer rule and the two token endpoints fail a build.

## Take-down

Delete `src/pages/demo/assemblyai/`, `src/pages/api/demo/assemblyai/` and the slug's entries in
`src/demos/keys.json`.
