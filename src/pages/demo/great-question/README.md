# Great Question demo: AI Moderator

`/demo/great-question/`. A voice interview moderator that runs a short discussion guide, probes
with neutral follow-ups, has every question it asks checked by a live guardrail, and turns the
transcript into quote-backed findings exposed as MCP tools.

Stack: Fish Audio speech-to-text → DeepSeek (through fal) → Fish Audio text-to-speech for voice,
Jev for the guardrail, DeepSeek for findings. No OpenAI.

## What is on the page

1. **Discussion guide**: a sample study (B2B customer onboarding) with 3 research goals and 4
   questions with probe cues, plus a guardrail example (a leading question vs. a neutral one, real
   Jev scores). During an interview the guide shows which questions are covered and which is
   current, from Jev's `guide_position` answer.
2. **Interview**, in one of two modes:
   - **Voice** (turn-based). The participant taps **Answer**; the browser records with
     `MediaRecorder` (`audio/webm;codecs=opus`, else `audio/mp4` on Safari) and stops after
     1.2 s of silence (RMS from an `AnalyserNode`, adaptive noise floor), on **Done**, or at
     45 s. `turn.api.js` then runs Fish ASR, asks DeepSeek for the next moderator line and
     returns it with Fish TTS audio. The dock under the transcript shows the state (listening
     with a level meter and clock, transcribing, moderator thinking, moderator speaking). Tapping
     Answer while the moderator speaks cuts it off. The interview ends on the closing line, on
     Jev's `wrapup` choice, at 10 answers, or when the participant ends it.
   - **Type instead**: the same prompt and model, streamed (`moderate.api.js`).
3. **Live guardrail** (`guardrail.api.js`): after each moderator turn, one Jev call with four typed
   questions: `leading`, `double_barreled` and `off_guide` (noul probabilities), plus
   `guide_position` (choice over Q1-Q4, wrapup, other). Shown as badges on the turn; cached by
   state hash.
4. **Findings** (`findings.api.js`): DeepSeek returns JSON with 3-5 findings and 1-2 quotes each.
   The server keeps a quote only if it appears word for word (after normalization) in a
   participant turn, takes the timestamp from the transcript, and reports how many it dropped.
   Cached by model and transcript hash.
5. **MCP surface** (`mcp.js`, `McpPanel.js`): `search_findings` and `get_quote` in `tools/list`
   shape (with `outputSchema` and read-only annotations), and a box that runs them in the browser
   and shows the JSON-RPC request and result.
6. **Example run** (default view, and preview mode without a key): an 11-turn written sample
   transcript. Its badges and findings are real outputs recorded on 2026-11-14 through the live
   routes (Jev via `/guardrail`, DeepSeek via `/findings`), so the label says "scores and findings
   recorded live". The transcript itself is not a recording.

## Voice turn

`POST /api/demo/great-question/turn/`

- `{}` → the opening line. Its text is fixed (`OPENING_LINE` in `study.js`) so its speech is
  cached for 30 days: the first call costs `COST.voice`, later ones cost 0 (still key-gated).
- `{ audio: base64, mimeType, turns: [{ role, text }], stream?: true }` →
  `{ participant: { text, duration }, moderator: { text, audio: base64 mp3 }, done, timing: { asr, llm, tts } }`.
  With `stream: true` (what the page sends) the reply is NDJSON: a `participant` event as soon
  as ASR finishes, then `result` (the object above) or `error`. Cost `COST.voice + COST.llm`
  (4 units); body limit 2 MB, audio ≤ 1.2 MB, 10 answers per interview.

Steps:

1. **ASR**: `fishTranscribe()` (`transcribe-1-pro`). Chromium's MediaRecorder webm/opus (no
   duration header), Chromium mp4/opus and fragmented mp4/AAC (Safari-style) all transcribe
   directly, so there is no server-side conversion and no ffmpeg on Vercel. Fish tags non-speech
   sounds (`[beep]`); those are stripped, and an answer without words returns 422 `silence`.
2. **LLM**: `chat()` with `DEMO_LLM` (`deepseek/deepseek-v3.2` on fal's OpenAI-compatible
   router), `moderatorInstructions('voice')`, temperature 0.6, 160 max tokens. On the 10th answer
   the prompt gets a time check so the moderator wraps up. `done` is the closing line or the cap.
3. **TTS**: `fishSpeak()` (`s2.1-pro`), stock library voice **Adrian** ("a steady and reliable
   narrator": even and unhurried, so it does not sound like it favors an answer), 64 kbps MP3
   (about 8 KB per second). Cached by exact text for 7 days.

The browser plays the MP3 on one `<audio>` element. The Start tap plays 50 ms of silence on it
first, so later replies can play without a tap on iOS Safari; if a browser still blocks
playback, the dock shows **Play reply**.

Measured live on 2026-11-14 (local `next start`, real providers):

| Step                                             | Typical              |
| ------------------------------------------------ | -------------------- |
| Fish ASR, 10-16 s answer                         | 0.4-0.8 s            |
| DeepSeek, one line                               | 0.5-1.2 s            |
| Fish TTS, one line                               | 0.7-1.6 s            |
| Pause detected → moderator audio starts (browser) | 1.8-4.1 s (plus the 1.2 s pause) |
| Opening, first call / cached                     | 4.1-4.3 s / 11-13 ms |
| Jev guardrail                                    | 80-230 ms            |
| Findings (DeepSeek, JSON)                        | 7-12 s               |

## Env vars

Required (already in Vercel): `FAL_API_KEY`, `FISH_AUDIO_API_KEY`, `JEV_API_KEY`. Optional:
`DEMO_LLM_MODEL` (default `deepseek/deepseek-v3.2`), `FISH_TTS_MODEL` (`s2.1-pro`),
`FISH_ASR_MODEL` (`transcribe-1-pro`), `JEV_MODEL` (`jev-1.13.0`).

## Cost per interview (cost units, about 1 cent each)

Opening 3 units once (then cached), 4 per voice answer, 1 per typed answer, 1 per guardrail check
(at most 16 per interview), 1 for findings. A 5-answer voice interview with findings is about 30
units; the 10-answer maximum is about 55, which fits the 60-unit daily IP budget once.

## Assumptions

- Turn-based beats speech-to-speech here: a research interview is already turn-taking, the
  participant never talks over the moderator's audio (no echo or barge-in handling), and each
  turn is one auditable server call.
- A 1.2 s pause ends an answer. People pause longer mid-thought; **Done** and the 45 s cap cover
  both ends, and a recording with no detected speech is dropped in the browser without a call.
- Guardrail checks run after the moderator speaks, so they audit the moderator rather than gate
  it. Gating is possible now that each line is text first, but it would add ~100 ms per turn.

## What I cut

- **Streaming speech.** A turn waits for the full LLM line and full TTS clip. Streaming DeepSeek
  into Fish's streaming TTS would start audio about a second sooner.
- **Realtime speech-to-speech** (WebRTC, server VAD, voice barge-in). It needed OpenAI Realtime;
  the turn-based loop does the same job for an interview with the requested providers.
- **Editable guide.** The server builds the prompt from a fixed guide, so a visitor cannot turn
  the moderator into a general assistant. With real accounts the guide would come from the study
  record.
- **A real MCP server.** The tool box runs in the browser. A public endpoint would need its own
  auth and abuse limits.
- Persistence, audio storage, multiple participants and cross-interview synthesis.

## What I would do with real data

- Calibrate the guardrail against researcher-labeled moderator turns, and pick per-check
  thresholds from that data instead of the fixed 30% and 60% bands. (Jev already rates "Tell me
  about the last time a new account got stuck" 48% leading; a researcher might disagree.)
- Act on the guardrail: since each line is text before it is spoken, regenerate a line whose
  `leading` or `double_barreled` score is high before it reaches TTS, and log it for study QA.
- Synthesize across interviews: embed quotes, cluster findings across participants, rank
  `search_findings` by evidence count and segment, scope every call to the caller's workspace.
- Keep the answer audio and link each quote to its offset, so a citation plays the clip.
- Evals: a simulated-participant harness (Fish TTS answers in, as in the tests below) that scores
  probe depth, guide coverage, leading-rate and time-to-wrap across prompt and model versions.

## Testing

Run live with real keys against `next start`, with a throwaway demo key reverted from
`keys.json` afterwards:

- Participant answers were generated with Fish TTS (voice Selene, so it differs from the
  moderator) and sent to `/turn/` as webm/opus, mp4/AAC and real Chromium MediaRecorder output.
  ASR matched the scripts apart from punctuation and two slips ("mid-size" → "mid-sized",
  "I'd missed" → "I'd miss").
- Opening (fresh and cached), typed mode, guardrail, findings, no-key 401, bad format 400 and a
  silent clip (422 `silence`) were exercised.
- Playwright with Chromium's fake mic fed from a 48 kHz WAV of those answers ran the real
  getUserMedia → MediaRecorder → VAD path: two full voice turns, auto-stop on silence, guardrail
  badges, findings, a cut-in during playback at 390 px, and no horizontal scroll at 1280 or 390.
