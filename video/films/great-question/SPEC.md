# SPEC: Great Question launch film v2 (kit 1.0.1)

GOAL:    A hiring manager at Great Question watches ~53 s and leaves knowing Haider built a working voice
         AI moderator: it asks the guide's questions out loud, probes neutrally on the participant's own
         words, has every line scored by Jev for leading / double-barreled / off-guide, and turns the
         interview into quote-backed findings an agent can fetch over MCP.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB.
TIME:    53.32 s (target 45-55, cap < 60). Product footage from frame 0; the moderator speaks from 0.3 s.
SOUND:   only the recorded interview, no music, no narrator: the AI moderator's real replies from the take
         (Fish stock voice Adrian, 1.15x, the MP3s the page played) and a SIMULATED participant (Fish stock
         voice Selene, 1.15x, fed through the page's real mic path). Both normalized to -18 LUFS.

FOOTAGE: one live take, 2026-11-15, recorded with kit/scripts/capture.cjs + kit/scripts/fake-mic.cjs
         against `next start` on :3180 (raw/take; DOM boxes for every component; 0.05 s frame lag measured
         with kit/scripts/frame-lag.py). Plus raw/check: the guide's static example check (no API call).
         A second take (raw/take2) was recorded and not used (same probes, an off-guide-ish third line).

SHOTS (absolute s; scene; focus; sound / caption)
  0.00-2.00   coldopen   mod1+dock 1.2x (bottom) T1 arrives live with Jev badges; "Hi, thanks for joining."
                                                 headline "Voice AI interviews, *checked* for leading"
  2.00-3.45   interview  mod1+dock 1.2x          "I'm an AI moderator," (0.4 s pause cut)
  3.45-9.60   interview  mod1+dock 1.2x          jump over "this takes about three minutes, ..." to Q1:
                                                 "To start, walk me through ... on their own." ring on Jev
                                                 badges 4.40-7.00; note: leading questions ruin research
  9.60-17.43  interview  card (whole) 1.02x      Your turn -> cursor taps Answer -> Listening; simulated
                                                 answer 1 "We run a kickoff call ... where it stalls."
  17.43-19.58 interview  status..dock 1.2x       2x: pause -> Transcribing -> thinking -> speaking [2x]
  19.58-32.90 interview  part1+mod2+dock 1.8x    probe "Got it. Who is involved from your side in that
                                                 kickoff call?" ring on badges 21.40-23.70; Answer;
                                                 simulated answer 2 "Me and one onboarding specialist. ..."
  32.90-34.10 interview  mod2+part2+dock 1.76x   hard cut over 1.6 s: answer 2 transcribed, moderator thinking
  34.10-37.30 check      exampleCheck 1.9x       the page's example check: "Don't you think ...?" 96% leading
  37.30-42.62 findings   head+F1+F2 1.72x        Generate findings, wait at 5x [5x], 3 findings, ring on F2,
                                                 last 0.68 s = the static page's frame held
  42.62-47.12 mcp        toolSeg+callBox 1.72x   get_quote, Run tool; 44.62 -> result JSON (mcpPre2) 1.8x
  47.12-50.62 nextsteps                          First 30 days (3 rows)
  50.62-53.32 endcard                            "How do you measure *moderator quality* today?"

HONESTY: chips "Real run · Fish stock voice Adrian, 1.15x", "Simulated participant · Fish voice Selene, 1.15x",
         "The page's example check"; speed tags 2x (pipeline) and 5x (findings wait). Cuts: 0.4 s pause and
         the opening line's middle sentence, 1.6 s wait before turn 3 thinking, turn 3 and turn 4 of the take,
         0.75 s cursor travel before Run tool. Ground patches: the example run's transcript next to the
         example check; the next page section under the band while findings load.
