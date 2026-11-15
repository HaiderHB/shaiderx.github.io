# SPEC: Great Question launch film v3 (kit 1.1, text-first, music bed, no voice)

GOAL:    A hiring manager at Great Question watches 47 s with the sound off or on and leaves knowing Haider
         built a working VOICE AI moderator: it asks the guide's questions out loud, runs each voice turn
         (speech-to-text -> DeepSeek -> speech) in a few seconds, has every line scored live by Jev
         (leading / double-barreled / off-guide), probes neutrally, shows the scores over time (Trace view),
         and turns the interview into quote-backed findings an agent can fetch over MCP.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. renders/great-question-launch-v3.mp4.
TIME:    47.02 s (target 45-55 s), product footage from frame 0, end card <= 3 s, no next steps.
SOUND:   one light instrumental bed (kit music-bed, -20 LUFS, fades), NO voice of any kind: not the moderator's
         TTS, not the simulated participant. On-screen text carries everything (kit 1.1 caption v2 + annotations).
UI:      the revamped demo page (commit "demo UI revamp"): coral accent (data-kit-accent="coral").

FOOTAGE: take3a, 2026-11-15, one live interview on the new UI, recorded with kit/scripts/capture.cjs +
         kit/scripts/fake-mic.cjs against `next start -p 3180` (isolated copy of the repo). Real Fish ASR,
         DeepSeek V3.2 via fal, Fish TTS 1.15x, Jev on every moderator line (all 5 scored live, none cached),
         DeepSeek findings (4 findings, 4 quotes, 0 dropped), MCP get_quote in the browser. The simulated
         participant (Fish stock voice Selene, scripted answers picked to fit each live question) only drives
         the page's real mic path; none of its audio is in the film.
         take3b (second and last take): same script, same flag (leading 65%), but Jev/TTS answered three
         lines from cache ("Jev · cached" on the badges), so it is not used for the interview. Its MCP
         ending scrolls the get_quote result fully into view: used for the MCP beat only, labelled "Second take".

THE TAKE (take3a, DOM seconds; footage = +0.05 s screencast lag)
  T1  6.08  opening + Q1 ("... walk me through what happens after a new customer signs ...")
            Jev: leading 9%, double-barreled 6%, off-guide 2%, on Q1 100% (357 ms)
  T2 22.98-33.58 simulated answer 1 (a1): "Sales hands the account to my team. We run a kickoff call, then
            their admin sets up single sign-on. Honestly, single sign-on is a nightmare. That's where accounts stall."
  T3 39.22  "Tell me about the last time an account got stuck during single sign-on setup."
            Fish ASR 0.5 s · DeepSeek 2.5 s · Fish TTS 1.2 s (= 4.2 s); Jev: LEADING 64% (red, live, 115 ms), on Q2
  T4 45.76-53.63 "Last month, their IT person went on leave, so single sign-on sat untouched for nine days, and nobody told us."
  T5 58.19  "How did your team find out that account was stuck?" 0.5/1.3/0.7 s; Jev: leading 13%, on Q3 99% (139 ms)
  T6 "Honestly, by accident. I check a spreadsheet of every account in setup on Fridays. There's no alert for it."
  T7 73.71  "What do you do today, outside the product, to keep onboarding on track?" leading 22%, on Q4 (216 ms)
  T8 "A spreadsheet of every account in setup, plus a Slack reminder to ping anyone who goes quiet for a week."
  T9 89.88  "Thanks. That's everything I had." wrap-up 83% -> interview ends itself (92.43)
  Trace 96.31-99.5 (5 lines, Jev avg 190 ms, leading peak 64% at T3) · Findings: click 102.18, shown 116.96,
  grid 120.30 · MCP: get_quote 125.83, Run tool 127.63 (T2-1 "Honestly, single sign-on is a nightmare. ...", T2, 00:16, F1)

STORY (final, film s; steps on the progress indicator: Interview, Guardrail, Findings, MCP)
  film s      footage (media s)                 caption (kicker / head / detail)                    annotation (<= 6 words)
  0.00-2.20   hook = take3a 5.95-8.15           cold open: "Prototype for Great Question · Haider Bokhari" / "Voice interviews, *checked* live"
  2.20-5.80   take3a 8.15-11.75 1x              Step 1 · Voice interview / "An AI moderator asks the guide's questions *aloud*"
                                                                                                  dock: "Spoken with Fish TTS"
  5.80-9.80   take3a 21.75-33.75 3x [3x]        Step 1 + chip "Simulated participant" / "The participant answers by *voice*"
                                                                                                  dock: "Stops on a 1.2-second pause"
  9.80-15.35  take3a 33.75-39.30 1x             Step 1 / "Voice turn: speech-to-text → DeepSeek → speech, *4.2 s*"
                                                                                                  T2 text: "Fish ASR 0.5 s"
  15.35-19.55 take3a 39.30-43.50 1x             Step 2 · Live guardrail / "Jev *flags* this follow-up: 64% leading"
                                                                                                  T3 badges: "Scored live in 115 ms"
  19.55-25.40 take3a 55.45-61.30 1x (cut)       Step 2 / "The next probe stays *neutral*: 13% leading" / "Jev also moves the guide to Q3"
                                                                                                  ring on the guide's Q3 (Now)
  25.40-28.65 take3a 96.35-99.60 1x             Step 2 / "Trace view: leading *peaks* at T3"   leading plot: "Only T3 crosses the 30% line"
  28.65-32.25 take3a 101.25-102.45 1x + 102.45-116.85 6x [6x]   Step 3 · Findings / "DeepSeek turns the transcript into *findings*"
  32.25-37.47 take3a 116.85-119.27 + 120.10-122.90  Step 3 / "Every finding quotes the participant *word for word*"
                                                / "Server-checked against the transcript"        F2's quote: "From T6, 00:57"
  37.47-44.42 take3b 116.20-119.20 + 121.65-125.60  Step 4 · MCP tools + chip "Second take" / "Findings become *MCP tools* for agents"
                                                / "get_quote returns the quote, turn and timestamp" result text: "Exact words, ready to cite"
  44.42-47.02 end card, sign-off only (Haider Bokhari · haiderb.com)
  Music: bright-pluck-112, media 12.18-59.20 s, data-volume 0.569 (-20 LUFS), fades 0.3 / 1.5 s.

HONESTY: the live flag is real (T3, leading 64%, scored by Jev during the take; not the page's example check).
         Chip "Simulated participant" while the participant answers. Speed tags on every sped-up clip (3x answer,
         6x findings wait). Cuts: dead time before Answer, the answer-2 recording, turns 3-4 and the wrap-up,
         cursor travel, page scrolls. A ground patch hides the next page section (MCP heading) under the empty
         findings section while they load. MCP beat from take3b, labelled "Second take". No avatar, no cloned
         voice, no narrator, no voice audio; music bed only.
