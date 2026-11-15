# Great Question capture notes

Everything runs from `video/`. The demo ran from an isolated copy of the portfolio worktree
(`next build && next start -p 3180`, its own `.next`, same `src/` and `.env.local`), so it shared no build
folder with other dev servers.

1. Simulated participant (Fish stock voice "Selene" at 1.15x, the moderator's speed):
   `(set -a; . ../.env.local; set +a; node films/great-question/capture/gen-answers.mjs)` then
   `python3 films/great-question/capture/tighten.py` (caps pauses at 0.4 s so the page's 1.2 s
   end-of-answer detector never fires mid-answer) -> `raw/answers/<id>.tight.wav`.
   Take 1 used the first `a1` ("We run a kickoff call, ..."), kept as `raw/answers/a1_take1.tight.wav`;
   `a1` was regenerated ("My team runs ...") for take 2.
2. Take: `KEYFILE=<private demo URL file> node films/great-question/capture/record.cjs take` (the key is
   read from the file and never printed; the host becomes localhost:3180). One live interview: opening line,
   3 voice turns through the page's real getUserMedia -> MediaRecorder -> silence detector path
   (kit/scripts/fake-mic.cjs), Jev on every moderator line, End interview, Generate findings, MCP get_quote.
   Two takes were recorded (budget: 2): `take` (used) and `take2` (not used).
   `node films/great-question/capture/record.cjs check`: the guide's static example check (no API call).
3. Footage + data: `node kit/scripts/build-footage.mjs films/great-question take check` (`cuts.json` makes
   `hook`, take 6.40-8.45 s, for the cold open).
4. Frame lag: `python3 kit/scripts/frame-lag.py films/great-question/raw/take --watch dock=dock`
   -> median 0.043 s (27 events); voice.json uses 0.05 s.
5. Voice: `films/great-question/capture/prep-audio.sh` (run in the film folder) normalizes the take's moderator
   MP3s (`raw/take/mod*.mp3`, what the page played) and the answers that went into the mic to -18 LUFS
   (`assets/audio/`). `node kit/scripts/place-audio.mjs films/great-question --write` places them from
   `capture/voice.json` (file times of each word group from silencedetect) and writes the speech cues.
   After a render: `node kit/scripts/place-audio.mjs films/great-question --check renders/<file>.mp4`.

Take 1 (raw/take): moderator lines and Jev scores
- T1 opening (13.69 s at 1.15x): leading 9%, double-barreled 7%, off-guide 2%, on Q1 100% (224 ms)
- T3 "Got it. Who is involved from your side in that kickoff call?" 13% / 3% / 4%, on Q1 93%
- T5 "Thanks. What happens next after that kickoff call?" 18% / 4% / 6%, on Q1 100%
- T7 "Tell me about the last time an account got stuck during setup." 25% / 3% / 6%, on Q2 99%
- Findings: 3 (F1 kickoff + SSO, F2 SSO is where accounts stall, F3 spreadsheet on Fridays), 0 quotes dropped.
No live line crossed Jev's 30% band, so the film shows the page's own example check for a flagged question.
