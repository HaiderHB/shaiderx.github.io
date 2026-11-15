# SPEC: Distru launch film v3 (kit 1.1.1)

GOAL:    A hiring manager at Distru watches ~50 s, sound on or off, and leaves knowing Haider built a working
         slice of their order intake: email in, typed extraction, deterministic tool checks, a typed decision
         with probabilities, a priced draft order and one question back, a hard rule that holds a risky order,
         green evals, and the same tools over MCP. On-screen text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Music: kit bed bright-pluck-112, aligned so its
         own ending lands on the last frame, -20 LUFS integrated (QA -22..-18), fades 0.3 / 1.5 s.
TIME:    50.24 s (target 45-55, cap < 60). Real product from frame 0.
LOOK:    kit 1.1 palette = the revamped demo UI: ground #0a0a0f, ink #f2f1f9, accent iris #8e78ff
         (data-kit-accent="iris", Distru's DemoLayout accent). Text-first band: kicker = step, one headline,
         optional detail, 8-step progress stepper.

FOOTAGE: four takes recorded 2026-11-15 on the "demo UI revamp" commit with kit/scripts/capture.cjs (DOM boxes),
         from an isolated `next build && next start -p 3160` copy:
         s2     sample 2 ("Out of stock + vague qty"), LIVE run (Live · deepseek/deepseek-v3.2), 12.48 s total
         s3     sample 3 ("License expires before delivery"), LIVE run
         evals  Run evals: sample 1 LIVE (16.6 s); samples 2 and 3 replayed today's cache of s2 / s3
         mcp    the MCP "call a tool" box (runs in the browser on sample data; free)
         hook   cut of s2 33.3-36.1 s (the page top after the live run: "Live run · Needs review", stats)
         Live runs used: 3 (s2, s3, sample 1 inside Run evals).

SHOTS (film s; scene; focus; kicker / headline / detail; annotation)
  0.00-2.40   coldopen  hero: page title + run-at-a-glance card + pipeline strip (zoom 1.43-1.46 push-in)
                        PROTOTYPE FOR DISTRU · HAIDER BOKHARI / "Email in, *priced order* out"
  2.40-5.80   run2      email card + trace head; Run agent clicked at 5.63
                        STEP 1 · EMAIL / "A messy wholesale order *email* comes in"
  5.80-7.37   run2      trace (Live pill + 4 stages) zoom 2.5, the extraction call at 6x
                        STEP 2 · EXTRACT [6x] / "DeepSeek extracts the order as *typed JSON*"
  7.37-9.10   run2      the extraction (customer, delivery, 3 lines, VAGUE tag) zoom 1.75 (same cue)
                        annotation on the vague line: "Flagged vague"
  9.10-12.27  run2      six tool calls zoom 1.75
                        STEP 3 · CHECK / "Six tool calls check the *ERP*"; annotation "Garlic Cookies out of stock"
  12.27-16.12 run2      decision + reply cards zoom 1.48 (gauge 100% Needs review, substitute OK 96%)
                        STEP 4 · DECIDE / "Jev routes it with *probabilities*" / "The LLM never decides."
  16.12-18.48 run2      same view (a 2.03 s held frame of the static page from 16.45)
                        STEP 5 · DRAFT / "A priced order and *one question*" / "The reply asks only for the missing quantity."
  18.48-21.64 run2      draft sales order SO-D97059, $2,352.00, zoom 1.34 (same cue)
  21.64-25.24 run3      email card: sample 3 picked, Run agent clicked at 25.01
                        STEP 6 · RULES / "Next email: the license expires before *delivery*"
  25.24-27.04 run3      trace zoom 2.5, the whole live run at 6x
                        STEP 6 · RULES [6x] / "A hard rule *holds* the order" / "Rules set the floor; Jev agreed at 63%."
  27.04-31.24 run3      decision + reply (gauge 63% Hold, final route Hold, reply asks for the renewed license) (same cue)
  31.24-39.74 evals     evals section zoom 1.47: Run evals, the wait at 6x, 9/9 checks
                        STEP 7 · EVALS [6x] [Cached replay] / "Evals: *9 of 9* checks pass" /
                        "Sample 1 ran live; 2 and 3 replayed today's runs."
  39.74-42.64 mcp       section title + callers diagram (agent and Claude/Codex -> distru-orders -> sample ERP)
                        STEP 8 · MCP / "Same 7 tools, served over *MCP*"
  42.64-43.64 mcp       the tool panel: check_license, Call tool clicked at 43.53
                        STEP 8 · MCP / "Claude or Codex can call them *too*" / "check_license: expires before delivery."
  43.64-47.74 mcp       the result JSON zoom 2.0 (status expires_before_delivery) (same cue)
                        annotation "Same verdict the agent got"
  47.74-50.24 endcard   Haider Bokhari · haiderb.com (no question)

HONESTY: every speed change is tagged (6x: s2 extraction call, s3 run, eval wait). The evals cue carries a
         "Cached replay" chip and says which sample ran live. Jump cuts skip page scrolls and cursor travel; a
         2.03 s held frame of the static decision/reply view (s2 media 27.2 s). Ground patches keep the local
         "claude mcp add ... http://localhost:3160/..." row of the recording out of frame. The cold open's focus
         is a measured box (the hero: title, glance card, pipeline strip) because the take did not track the hero.
         No voice of any kind; the only sound is the instrumental bed. No avatar.
