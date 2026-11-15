# Review: Great Question launch film v3 (kit 1.1)

renders/great-question-launch-v3.mp4 · 47.03 s · 1920x1080 30 fps H.264 + AAC · 10.2 MB

## What changed from v2 (53.3 s -> 47.0 s)
- Haider's new direction: no voice of any kind (no moderator TTS, no simulated participant audio). The only
  sound is one instrumental bed (kit music-bed, bright-pluck-112). Text carries everything: kit 1.1 caption
  v2 (kicker = step, one-line headline, optional detail, progress stepper Interview · Guardrail · Findings · MCP)
  plus 6 annotations (ring + <= 6-word label) and 1 callout ring on DOM boxes.
- No "If I join / First 30 days" card. The end card is the sign-off alone (2.6 s).
- All footage re-recorded on the revamped demo UI (commit "demo UI revamp"): coral accent, new voice dock
  (call stage), guide column with live coverage, the new Trace view ("Wording risk, turn by turn").
- A REAL live guardrail flag: in take3a Jev scored the moderator's live follow-up T3 ("Tell me about the last
  time an account got stuck during single sign-on setup.") 64% leading (red, 115 ms). The film shows it
  instead of the page's example check. The next probe (T5) scored 13%, and the Trace view shows the spike.
- Coherent interview: the scripted answers were written for the moderator's likely follow-ups and picked by
  keyword from each live question; all four fit (Q1 -> Q2 -> Q3 -> Q4 -> the moderator's own wrap-up).

## Shot list (film seconds)
  0.00-2.20   cold open, take3a 5.95-8.15: T1 arrives with Jev's scores, guide + dock "Moderator speaking"
              "Prototype for Great Question · Haider Bokhari" / "Voice interviews, *checked* live"
  2.20-5.80   take3a 8.15-11.75: "Step 1 · Voice interview" / "An AI moderator asks the guide's questions *aloud*"
              ann (dock) "Spoken with Fish TTS"
  5.80-9.80   take3a 21.75-33.75 at 3x [3x] [Simulated participant]: Answer tapped, dock "Listening"
              "The participant answers by *voice*"; ann (dock) "Stops on a 1.2-second pause"
  9.80-15.35  take3a 33.75-39.30: Transcribing -> T2 text -> Moderator thinking -> T3
              "Voice turn: speech-to-text → DeepSeek → speech, *4.2 s*" (0.5 + 2.5 + 1.2 s, the page's own timing row)
              ann (T2 text) "Fish ASR 0.5 s"
  15.35-19.55 take3a 39.30-43.50: guide on Q2, T3 + Jev badges
              "Step 2 · Live guardrail" / "Jev *flags* this follow-up: 64% leading"; ann (T3 badges) "Scored live in 115 ms"
  19.55-25.40 take3a 55.45-61.30 (cut over answer 2's recording): T3 (64%) above T4 and T5 (13%), guide on Q3
              "The next probe stays *neutral*: 13% leading" / "Jev also moves the guide to Q3"; ring on guide Q3 (Now)
  25.40-28.65 take3a 96.35-99.60: Trace view / "Trace view: leading *peaks* at T3"; ann (leading plot) "Only T3 crosses the 30% line"
  28.65-32.25 take3a 101.25-102.45 + 102.45-116.85 at 6x [6x]: Generate findings, "Reading transcript…"
              "Step 3 · Findings" / "DeepSeek turns the transcript into *findings*"
  32.25-37.47 take3a 116.85-119.27 + 120.10-122.90 (cut over the scroll): 4 findings, 4 quotes, 3 turns
              "Every finding quotes the participant *word for word*" / "Server-checked against the transcript"
              ann (F2's quote) "From T6, 00:57"
  37.47-44.42 take3b 116.20-119.20 + 121.65-125.60 [Second take]: get_quote, Run tool, the result
              "Step 4 · MCP tools" / "Findings become *MCP tools* for agents" / "get_quote returns the quote, turn and timestamp"
              ann (structuredContent text) "Exact words, ready to cite"
  44.42-47.02 end card: Haider Bokhari · haiderb.com

## QA (kit/scripts/qa.mjs, kit 1.1.0)
- `--frames` and `--video renders/great-question-launch-v3.mp4`: PASS, 0 fail, 0 warn. 47.02 s, first product
  frame 0.00 s, 13 camera keyframes + 1 ring + 6 annotations inside the safe area, 2 speed changes labelled
  (3x, 6x), 9 v2 cues each on screen >= its reading time, cold open 4 words in 2.2 s, accent coral.
- Render: H.264 1920x1080 30 fps + AAC, 47.03 s, 10.2 MB. Loudness -20.0 LUFS integrated, true peak -6.2 dBTP;
  fade-in (first 30 ms -50.8 dB) and fade-out on the last frame (last 50 ms -96 dB).
- No voice in the mix (measured): the render's audio correlates 0.9998 with the bed excerpt (media 12.18-59.20 s)
  at gain 0.567 = the bed's data-volume 0.569; the residual is -52 dB RMS (codec noise), worst 1 s window -31 dB
  below the mix.
- `npx hyperframes check`: ok, 0 errors; kept warnings timeline_track_too_dense, nested_media_start_basis_ambiguous.
- `kit/scripts/edges.mjs`: frame edges in page margins or gaps for the cold open, Q1, the voice turn, the
  trace (right edge in the gap before the page's example check) and the MCP result (left edge in the gap
  between the two MCP columns). Remaining advisories are bubbles above the focus sliced at the top edge in the
  transcript shots (the list scrolls 20 px under the camera when T5 arrives, so no gap stays put) and container
  edges.
- Looked at renders/qa/contact-sheet.jpg (frames of the real render), renders/qa/framing-sheet.jpg and full-size
  snapshots of every annotation. Fixed while looking: a leader line that crossed F2's quote (annotation moved to
  F2's own quote), the MCP result shown small at the left (now 1.8x, left edge in the column gap), a label over
  the guide's questions (replaced by a ring + the detail line), a cue that ended 0.3 s before its scene.

## Honesty
- take3a: one live interview, 2026-11-15, local `next start` of the revamped page, real Fish ASR, DeepSeek V3.2
  via fal, Fish TTS 1.15x, Jev on all 5 moderator lines (all scored live, none cached), DeepSeek findings
  (4 findings, 4 quotes, 0 dropped). The participant is simulated (Fish stock voice Selene, scripted answers
  played into the page's real mic path by kit/scripts/fake-mic.cjs): chip "Simulated participant" while it answers.
  None of the moderator's or the participant's audio is in the film.
- The flag is real: T3 was scored 64% leading by Jev during the take (the page shows it red, >= 60%). The film
  reports the score; it does not claim why Jev scored it so.
- The MCP beat is from take3b (the second and last take, same scripted answers), labelled "Second take" on screen:
  take3a's get_quote result ran 41 px past the recorded window, take3b scrolled it into view. Its quote T2-1
  ("Honestly, single sign-on is a nightmare. That's where accounts stall."), turn T2, timestamp 00:16 and
  finding F1 equal take3a's. take3b is not used for the interview: Jev and TTS answered three of its repeated
  lines from cache.
- Speed: the answer recording at 3x, the findings wait at 6x, both labelled. Cuts: the dead time before Answer,
  answer 2's recording, turns 3-4 and the wrap-up, the page scrolls (findings grid, MCP result).
- Ground patch: while findings load (film 28.65-32.25), a patch the colour of the page keeps the next page
  section (the MCP heading) from showing under the empty findings section; nothing in the findings section is hidden.
- The "4.2 s" voice turn is the server's sum of the page's own timing row (ASR 0.5 + DeepSeek 2.5 + TTS 1.2 s);
  the wait the viewer sees also includes the page's 1.2 s end-of-answer pause.
- Screencast lag: median 0.09 s (kit/scripts/frame-lag.py, 28 events); the T3 badges reached the screen ~0.5 s
  after the DOM had them, so "Checking with Jev…" shows for a moment under the flag headline.
- No avatar, no cloned voice, no narrator, no voice audio; one instrumental bed.

## Weakest parts
- The voice-turn shot (9.8-15.35 s) is the whole workspace at 1.08x: complete, but the transcript text is small;
  the caption carries the point.
- The MCP beat comes from the second take (labelled). A take3a-only cut would have had to crop the result box.
- 47 s is on the short side of the 45-55 s target; turns 3-4 (the spreadsheet workaround, Q4) are not shown.
