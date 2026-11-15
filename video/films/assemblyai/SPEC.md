# SPEC: AssemblyAI launch film v3 (kit 1.1: text-first, music bed, no voice)

GOAL:    A hiring manager on AssemblyAI's Agent Experience team watches ~53 s (sound optional) and leaves
         knowing Haider found where coding agents trip on streaming, built a free checker that catches it
         with line refs, a reviewed Explain pass, a reference fix that passes, 8 verified gaps and concrete
         agent-facing fixes (two MCP tools, one README line). Skill, not plans: no next-steps card, and the
         page's own "First 30 days" section is never shown.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Sound = one instrumental bed (bright-pluck-112,
         -20 LUFS, fades 0.3 / 1.5 s). No voice, no avatar.
TIME:    53.0 s (target 45-55, cap < 60). Product footage from frame 0, moving (cursor).
STYLE:   kit 1.1 house style for the UI revamp: ground #0a0a0f, Inter, one accent = the demo's cobalt #6896ff.

FOOTAGE: four takes recorded 2026-11-15 with kit/scripts/capture.cjs (true DOM boxes) from a copy of the
         demos repo at d0c6407 ("demo UI revamp"), `next build && next start -p 3170`:
           top      free  hero -> task prompt -> checker on First try: Run again, pointer on L9, click L43
           explain  LIVE  one uncached "Explain failures" run (DeepSeek V3.2 via fal), fresh server
           fix      free  Reference fix sample (14 pass); the 8 verified gaps (pointer on gap 02's evidence)
           prop     free  section 04: the two MCP tool cards; the one-line README fix
         `hook` = top 0.0-2.5 s (capture/cuts.json).

STORY (6 steps on the stepper: Task · Checker · Explain · Fix · Gaps · Proposals)

SHOTS (absolute s; scene; focus @zoom; caption = kicker / head / detail; annotation)
  0.00-2.50   coldopen  hero verdict card "The agent's first try · 3 failures" @2.0 (left-aligned so the frame
              edge stays clear of the title/tagline); kicker "Prototype for AssemblyAI · Haider Bokhari",
              headline "Where agents *trip* on AssemblyAI"
  2.50-6.40   checker   camera pans to the task prompt @2.79 ("> Add live mic captions to my Next.js app with
              AssemblyAI streaming.")
              Step 1 · The task / "A common task for a *coding agent*" / "First try assembled by hand from
              AssemblyAI's own snippets."  (2.60-8.85)
  6.40-8.80   checker   jump cut over the scroll: chips (First try) + hint + code + verdict @1.51
  8.80-11.80  checker   Run again clicked, results rise: verdict + Terminate card @2.18
              Step 2 · Free checker / "14 free rules flag *3 failures*"  (8.95-11.80)
              annotation on the tally: "No model: deterministic rules"  (9.70-11.75)
  11.80-15.60 checker   token route L1-L12 + verdict @1.53, pointer on L9
              "L9, pasted from the SDK README: a *SyntaxError*"  (11.90-15.50)
              annotation on L9: "Won't parse in Node 22"  (12.70-15.15)
  15.60-20.30 checker   L43 clicked, code pane scrolls to L42-45: verdict + Terminate card + L42-45 @1.53
              "close() right after Terminate drops the *last sentence*"  (15.60-20.20)
              annotation on L43-44: "From the v2→v3 migration guide"  (17.50-20.00)
  20.30-23.85 explain   Explain and fix panel @1.51, ring + dim on the button; click 1x, 13.2 s model wait at 6x
              Step 3 · Explain and fix [Live run · uncached] [6x] / "DeepSeek V3.2 explains what each failure
              *breaks*"  (20.40-24.60)
  23.85-29.60 explain   panel head + the three failures (L43-44, L31, L9) @1.54 as they arrive, 1x
              "The model writes the why; *Fix lines* are reviewed"  (24.70-29.50)
              annotation on the L9 finding: "Same L9 SyntaxError, explained"  (27.30-29.50)
  29.60-35.70 fix       chips + code + verdict @1.51: Reference fix clicked -> 0 fail 0 warn 14 pass
              Step 4 · The fix / "Reference fix: *all 14 checks pass*" / "Rule checks only, not run live yet."
              (29.70-35.50); annotation on the tally: "Was 3 fail, 5 warn"  (32.00-34.45)
  35.70-40.20 fix       jump cut: section 02 head "Checked 13 Nov 2026 · 8 verified gaps" + gaps 01-02 @1.5
              Step 5 · Verified gaps / "8 gaps, each with the source that *misleads* agents"  (35.80-40.00)
              annotation on gap 02's evidence: "Verbatim from the SDK README"  (37.50-40.00)
  40.20-45.45 prop      section 04 head + both tool names @1.5
              Step 6 · Proposed, not shipped / "Two MCP tools let agents *test* streaming"  (40.30-45.35)
              annotations: create_streaming_token "Mints a short-lived streaming token" (40.75-43.20),
              check_streaming_config "Tests config before “done”" (43.30-45.40)
  45.45-50.00 prop      jump cut: the README fix card (-1 +1 diff) @1.51, rest dimmed during the annotation
              "One README line fixes the *SyntaxError*"  (45.55-49.90)
              annotation on the diff: "Fixes L9 at the source"  (45.90-49.75)
  50.00-53.00 endcard   "Which *agent* do new signups use?" Haider Bokhari · haiderb.com

FRAMING: every keyframe frames its focus whole above the band (qa.mjs); edges.mjs: no tracked neighbour
         sliced at a frame edge except the cold open's h1 box (its text ends left of the frame edge).
HONESTY: the Explain run is labelled "Live run · uncached" and its wait "6x"; "First try assembled by hand
         from AssemblyAI's own snippets" (no agent run is claimed); "Rule checks only, not run live yet" on
         the reference fix; proposals under "Proposed, not shipped". Jump cuts over page scrolls only.
