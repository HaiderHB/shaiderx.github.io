# SPEC: AssemblyAI launch film v2 (kit 1.0.1 + capture `clip`)

GOAL:    A hiring manager on AssemblyAI's Agent Experience team watches ~46 s muted and leaves knowing
         Haider found where agents trip on streaming, built a free checker that catches it, a reviewed
         Explain pass, a passing reference fix, and concrete agent-facing fixes (MCP tools, README line).
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264, silent (no music, no voice, no avatar), < 20 MB.
TIME:    45.95 s (target 45-55, cap < 60). Product footage from frame 0, moving (cursor + push-in).

FOOTAGE: four takes recorded 2026-11-15 with kit/scripts/capture.cjs (true DOM boxes) from the demo at
         localhost:3170 (portfolio worktree at 8dea554; only video/ and unrelated files uncommitted):
           top      free  hero -> checker on First try: Run again, pointer on L9, click L43
           explain  LIVE  one uncached "Explain failures" run (DeepSeek V3.2 via fal), fresh server
           fix      free  Reference fix sample; the 8 verified gaps (row 1, pointer on gap 02)
           prop     free  section 04: the two MCP tool definitions; the one-line README fix
         `hook` = top 0.2-2.7 s (capture/cuts.json).

SHOTS (absolute s; scene; focus; caption)
  0.00-2.30   coldopen  hero (task + "3 failures"), push 1.60->1.70, top-aligned
              kicker "Prototype for AssemblyAI · Haider Bokhari", headline "Where coding agents *trip* on AssemblyAI"
  2.30-4.60   checker   code+results+Run again (1.17x): Run again clicked, results rise
              INTEGRATION CHECKER · 14 RULES · FREE: First try, built from AssemblyAI's own snippets: 3 fail.
  4.60-9.30   checker   L1-L12 + verdict + Terminate card (1.77x); ring on L9 6.70-9.30
              L9 · FROM THE SDK README: The README's token snippet is a SyntaxError.   (6.55-9.55)
  9.30-13.30  checker   verdict + Terminate card + L42-L45 (1.77x): L43 clicked, code scrolls; ring L43-44 10.90-13.20
              L43–44 · FAIL: close() right after Terminate drops the last sentence.
  13.30-16.40 explain   llmPanel (1.72x): click 1x, model wait 7.2 s at 4x (14.70-16.50)
              EXPLAIN AND FIX [Live run · uncached] [4x]: DeepSeek V3.2 via fal explains each failing check.
  16.40-21.75 explain   panel head + findings 1-4 (1.46x) as they arrive and when done; ring on the L9 finding 19.30-21.60
              REVIEWED FIXES: The model writes what breaks. Each Fix line is reviewed text.
  21.75-26.85 fix       sample buttons + verdict (1.59x): Reference fix clicked -> 0 fail 0 warn 14 pass
              REFERENCE FIX · 3 FILES: Same checker: all 14 checks pass. (note: Rule checks only; no live AssemblyAI session yet.)
  26.85-31.25 fix       gaps 01-02 (1.33x), pointer on gap 02's README snippet
              8 VERIFIED GAPS · CHECKED 13 NOV: Each one quotes the AssemblyAI source that misleads the agent.
  31.25-35.65 prop      the two MCP tool cards (1.46x)
              PROPOSED, NOT SHIPPED: Two MCP tools so agents test streaming instead of guessing.
  35.65-39.45 prop      the README fix diff (1.72x, top-left)
              PROPOSED · README FIX: One line in the SDK README fixes the SyntaxError.
  39.45-42.95 nextsteps If I join / First 30 days: baseline first-try rates per agent; docs CI: every snippet
              compiles; ship both MCP tools, re-run the eval
  42.95-45.95 endcard   "Which *agent* do new signups use?" Haider Bokhari · haiderb.com

FRAMING: every keyframe frames its whole component above the band (qa.mjs); edges.mjs finds no tracked
         neighbour sliced at the frame edges (one hit: the Run again button, hidden under the demo's sticky
         header). Shot fit options put the frame edges in whitespace (see shot labels).
HONESTY: the Explain run is labelled "Live run · uncached"; its 7.2 s wait is tagged 4x; Fix lines are
         called reviewed text (they are canonical per check, the model writes only the "what breaks"
         sentence); the reference fix carries "Rule checks only; no live AssemblyAI session yet";
         proposals are captioned "Proposed, not shipped". Jump cuts over page scrolls only.
