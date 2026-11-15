# Great Question capture notes (v3, revamped demo UI)

Everything runs from `video/`. The demo ran from an isolated copy of the repo in a scratch folder
(`src/`, `public/`, config and `.env.local` copied; `node_modules` symlinked; `next build && next start -p 3180`),
so it shared no `.next` folder with other agents. The copy was deleted afterwards.

1. Simulated participant (Fish stock voice "Selene" at 1.15x, the moderator's speed), v3 script:
   `(set -a; . ../.env.local; set +a; node films/great-question/capture/gen-answers.mjs)` then
   `python3 films/great-question/capture/tighten.py` (caps pauses at 0.4 s so the page's 1.2 s
   end-of-answer detector never fires mid-answer) -> `raw/answers3/<id>.tight.wav`.
   The answers are written for the moderator's likely follow-ups (a1 for Q1, a2_* / a3_* / a4_* for the probes);
   `record.cjs` picks one by keyword from the live question, and falls back to waiting for a hand-written
   answer (`need-<k>.json`) when none fits. In both v3 takes every pick fit its question; no fallback was needed.
   v3 is text-first: this audio never reaches the film, it only drives the live interview.
2. Takes: `KEYFILE=<private demo URL file> node films/great-question/capture/record.cjs take3a` (the key is
   read from the file and never printed; the host becomes localhost:3180). One live interview: opening line,
   4 voice turns through the page's real getUserMedia -> MediaRecorder -> silence detector path
   (kit/scripts/fake-mic.cjs), Jev on every moderator line, the moderator's own wrap-up, the Trace view,
   Generate findings, MCP get_quote. Budget 2 takes: `take3a` (used) and `take3b` (same script; Jev and TTS
   answered three repeated lines from cache, so not used for the interview; its MCP ending scrolls the
   get_quote result into view).
3. Footage + data: `node kit/scripts/build-footage.mjs films/great-question take3a take3b`
   (`cuts.json` makes `hook`, take3a 5.95-8.15 s: T1 arriving with Jev's badges, for the cold open).
4. No voice placement in v3 (`voice.json` / `prep-audio.sh` / place-audio were v2 only).

Take 3a (raw/take3a): moderator lines and Jev scores (all live, none cached)
- T1 opening + Q1: leading 9%, double-barreled 6%, off-guide 2%, on Q1 100% (357 ms)
- T3 "Tell me about the last time an account got stuck during single sign-on setup."
  Fish ASR 0.5 s, DeepSeek 2.5 s, Fish TTS 1.2 s; LEADING 64% (red), double-barreled 4%, off-guide 3%, on Q2 100% (115 ms)
- T5 "How did your team find out that account was stuck?" 0.5 / 1.3 / 0.7 s; 13% / 3% / 3%, on Q3 99% (139 ms)
- T7 "What do you do today, outside the product, to keep onboarding on track?" 0.4 / 1.0 / 1.1 s; 22% / 5% / 3%, on Q4 99% (216 ms)
- T9 "Thanks. That's everything I had." 0.3 / 1.0 / 0.7 s; 6% / 2% / 12%, wrap-up 83% (121 ms): the interview ends itself
- Findings (14.8 s): F1 SSO is the stall point (T2), F2 spreadsheet on Fridays (T6), F3 spreadsheet + Slack (T8),
  F4 sales handoff + kickoff (T2); 4 quotes, 0 dropped. MCP get_quote T2-1 -> T2, 00:16, F1.
The live guardrail flagged a real line (T3, 64% leading), so the film does not need the page's example check.
