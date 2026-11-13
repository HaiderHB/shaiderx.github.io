# Great Question demo: AI Moderator

`/demo/great-question/`. A realtime voice interview moderator that runs a short discussion
guide, probes with neutral follow-ups, has every question it asks checked by a live guardrail,
and turns the transcript into quote-backed findings exposed as MCP tools.

## What is on the page

1. **Discussion guide**: a sample study (B2B customer onboarding) with 3 research goals and 4
   questions with probe cues. It includes a pre-rendered guardrail example (a leading question vs.
   a neutral one). During an interview the guide shows which questions are covered and which is
   current, based on Jev's `guide_position` answer.
2. **Interview**, in one of two modes:
   - **Voice**: the browser talks to the OpenAI Realtime API over WebRTC. `session.api.js` mints a
     60-second client secret with the whole session fixed on the server: model, moderator
     instructions, voice, input transcription, server VAD and noise reduction. The browser posts its
     SDP offer straight to `/v1/realtime/calls` with that secret. The live transcript is built from
     Realtime server events (`voice.js` → `applyRealtimeEvent`). The call is capped at 3 minutes on
     the client. At 30 seconds left, a system message tells the moderator to wrap up. When the
     closing line is detected (by text match or by Jev's `wrapup` choice), the call ends after the
     moderator finishes speaking.
   - **Type instead**: the same moderator prompt streamed through `chatStream`
     (`moderate.api.js`), for reviewers without a mic.
3. **Live guardrail** (`guardrail.api.js`): after each moderator turn, one Jev call with four typed
   questions: `leading`, `double_barreled` and `off_guide` (noul probabilities), plus
   `guide_position` (choice over Q1-Q4, wrapup, other). The results show as badges on the turn.
   Results are cached by state hash.
4. **Findings** (`findings.api.js`): the LLM returns JSON with 3-5 findings and 1-2 quotes each.
   The server keeps a quote only if it appears word for word (after normalization) in a
   participant turn, takes the timestamp from the transcript rather than the model, and reports how
   many quotes it dropped. Results are cached by transcript hash.
5. **MCP surface** (`mcp.js`, `McpPanel.js`): `search_findings` and `get_quote` tool definitions
   in `tools/list` shape (with `outputSchema` and read-only annotations), and a "call the tool" box.
   The box runs the handlers in the browser and shows the JSON-RPC `tools/call` request and result
   (`content` text block plus `structuredContent`).
6. **Example run**: a pre-baked 11-turn transcript with badges and findings, shown by default and
   in preview mode (no key). It is labeled "Example run", and visitors can switch back to it after
   a live interview.

## API shape used (checked 2026-11-13)

- Realtime over WebRTC: https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime
- Client secrets: https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create
- `POST /v1/realtime/client_secrets` with
  `{ expires_after: { anchor: 'created_at', seconds: 60 }, session: { type: 'realtime', model, instructions, output_modalities: ['audio'], audio: { input: { transcription: { model }, turn_detection: { type: 'server_vad', ... }, noise_reduction }, output: { voice } } } }`
  returns `{ value, expires_at, session }`.
- Browser: `POST /v1/realtime/calls` with `Authorization: Bearer <value>` and
  `Content-Type: application/sdp`. The body is the SDP offer and the response is the SDP answer.
  Events travel over the `oai-events` data channel.
- Events used: `response.output_audio_transcript.delta|done`,
  `conversation.item.input_audio_transcription.delta|completed|failed`,
  `input_audio_buffer.speech_started|speech_stopped`, `output_audio_buffer.started|stopped|cleared`,
  `error`.
- Jev: https://docs.typesafe.ai/api (`POST /v1/systemone`; questions keyed by id; `noul` returns a
  probability, `choice` returns `probabilities`).

## Env vars

Required (already in Vercel): `OPENAI_API_KEY`, `JEV_API_KEY`. Optional overrides:

| Var                     | Default               | Used for                                                                                                                 |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `DEMO_REALTIME_MODEL`   | `gpt-realtime-2.1`    | Voice session model                                                                                                      |
| `DEMO_REALTIME_VOICE`   | `marin`               | Voice                                                                                                                    |
| `DEMO_TRANSCRIBE_MODEL` | `gpt-live-transcribe` | Participant transcription (fallback: `gpt-4o-mini-transcribe`)                                                           |
| `DEMO_CHAT_MODEL`       | `gpt-6-luna`          | Typed moderator and findings                                                                                             |
| `DEMO_FINDINGS_MODEL`   | `DEMO_CHAT_MODEL`     | Findings only                                                                                                            |
| `DEMO_CHAT_REASONING`   | unset                 | `reasoning_effort` to send when a model override is set. The defaults send `none` for typed turns and `low` for findings |
| `JEV_MODEL`             | `jev-1.13.0`          | Guardrail (shared helper default)                                                                                        |

`src/demos/models.js` gained an optional `reasoningEffort` on `chat()` and `chatStream()`. The
default chat model reasons at `medium` unless told otherwise, which would eat a small
`max_completion_tokens` budget and slow every typed turn.

## Cost per interview (cost units, about 1 cent each)

The voice route bills 30 units up front (`COST.realtimeMinute * 3`). Each guardrail check costs 1
unit (at most 16 per interview), each typed turn 1 (at most 10 answers), and findings 1. One voice
interview with findings is about 47 units, which fits the 60-unit daily IP budget once.

## Assumptions

- A 3-minute, 4-question guide is enough to show probing and wrap-up without burning budget.
- Reviewers will often be on a laptop without headphones, so server VAD uses a longer silence window
  (800 ms) and noise reduction, and the page suggests headphones to avoid echo barge-in.
- The participant "joins" with a short user message, and `response.create` makes the moderator open
  the interview.
- Guardrail checks run after the moderator speaks, so they audit the moderator rather than gate it.
  Gating would need a text-first turn and add latency to every question.

## What I cut

- **Editable guide.** The server builds the moderator prompt from a fixed guide, so a visitor cannot
  turn the minted voice session into a general assistant. With real accounts, the guide would come
  from the study record, keyed by study id.
- **Server-side hard stop.** The client secret only lives for 60 seconds, but an established call
  is ended by the page, and the cost is billed up front. A production version would also watch
  the call from the server through the Realtime server-side controls (sideband connection by call
  id) and hang up at the cap.
- **Tool calling inside the voice session** (for example `end_interview` or `mark_goal_covered`).
  Jev's `guide_position` covers progress and wrap-up more cheaply, without adding a tool
  round-trip to the voice loop.
- **A real MCP server.** The tool box runs in the browser. A public MCP endpoint would need its own
  auth and abuse limits, and for a short-lived demo the in-browser box shows the same contract.
- Persistence, multiple participants and cross-interview synthesis.

## What I would do with real data

- Calibrate the guardrail against researcher-labeled moderator turns from real studies, and pick
  per-check thresholds from that data instead of the fixed 30% and 60% bands.
- Act on the guardrail: when `leading` or `double_barreled` is high, tell the moderator (through a
  system item) to rephrase on its next turn, and log the event for study QA.
- Synthesize across interviews: embed quotes, cluster findings across participants, and have
  `search_findings` rank by evidence count and participant segment. Add a `list_studies` tool and
  scope every call to the caller's workspace with OAuth.
- Keep audio and link each quote to its offset in the recording, so a citation plays the clip.
- Add evals: a simulated-participant harness that scores probe depth, guide coverage, leading-rate
  and time-to-wrap across prompt and model versions.

## Testing without keys

Paid APIs only run on Vercel. Locally, every route was exercised against a small mock
(`OPENAI_BASE_URL` and `JEV_BASE_URL` pointed at it) using a throwaway key that was reverted from
`keys.json`. The voice UI was tested in Playwright with a fake `RTCPeerConnection` that replays
Realtime events: transcript streaming, badges, guide progress, wrap-up auto-end, findings,
quote-to-turn jumps and both MCP tools. The mic-blocked, preview and budget-exhausted states were
also checked. The real WebRTC media path, the actual model behavior and the transcription model
choice can only be verified with the live key.
