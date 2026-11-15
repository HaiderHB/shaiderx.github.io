# SPEC: Distru launch film v2 (kit 1.0.1)

GOAL:    A hiring manager at Distru watches ~48 s muted and leaves knowing Haider built a working slice
         of their next step: order email in, typed decision out, tools served over MCP, evals green.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264, silent (no music, no voice), < 20 MB.
TIME:    48.32 s (target 45-55, cap < 60). Product footage from frame 0.

FOOTAGE: the four live takes recorded 2026-11-14 at commit 46abc99 (reused, not recaptured):
         s2 (sample 2, uncached live run), s3 (sample 3, uncached live run), evals (sample 1 live,
         samples 2-3 replayed from the same-day cache), mcp (call a tool, runs in the browser).
         Boxes: measured on the frames (capture/boxes/: measure-boxes.py specs + compose.py), since these
         takes predate capture.cjs's DOM boxes.

SHOTS (absolute s; scene; focus component; caption)
  0.00-2.00   coldopen  emailHead+samples+emailText  sample 2 picked; "Order email in. Priced order out."
  2.00-3.60   run2      emailHead+samples+emailText  THE INPUT: a messy order email
  3.60-5.75   run2      emailText+runButton  Run agent clicked
  5.75-8.65   run2      trace (6x)         STEP 1 · EXTRACT [6x]
  8.65-9.75   run2      extract            extraction lands
  9.75-11.72  run2      check              STEP 2 · CHECK: six tool calls, decide
  11.72-15.02 run2      decision + ring finalRoute   STEP 3 · DECIDE: needs review 100%, substitute 96%
  15.02-17.52 run2      reply + ring oneQuestion     STEP 4 · DRAFT
  17.52-19.52 run2      orderBody (no caption; last 1 s is the held final frame)
  19.52-21.42 run3      emailHead+samples+emailText  SAMPLE 3 · LIVE RUN
  21.42-22.12 run3      emailText+runButton (jump cut)
  22.12-23.52 run3      trace (6x)         [6x]
  23.52-26.37 run3      decision + ring finalRoute   HARD RULE: Hold, Jev agreed (68%)
  26.37-28.77 run3      reply + ring oneQuestion     RULES ONLY ESCALATE
  28.77-35.62 evals     evalsSection (6x wait), ring score   EVALS [6x]; RESULT 9/9 [cached replay chip]
  35.62-37.72 mcp       toolPanel          MCP: same 7 tools
  37.72-39.12 mcp       args (Call tool)
  39.12-42.12 mcp       result + ring statusLine     CALL A TOOL: expires_before_delivery
  42.12-45.62 nextsteps First 30 days (3 lines)
  45.62-48.32 endcard   "Where does the Order Agent need a human most today?" Haider Bokhari · haiderb.com

HONESTY: speed changes 6x (three clips) tagged; evals note: sample 1 live, samples 2-3 replayed today's
         cached runs; jump cuts over cursor travel and page scrolls; a 1 s held final frame of s2 (page
         static); the localhost URL row and neighbouring sections are covered by ground patches.
