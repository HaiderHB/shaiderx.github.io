# SPEC: Reacher launch film (kit 1.1.1)

GOAL:    A hiring manager at Reacher watches ~47 s, sound on or off, and leaves knowing Haider built a working
         creator matchmaker for one TikTok Shop product: code filters 40 creators, Jev scores fit and the chance
         each one accepts, the top 8 come with LLM-written whys, the LLM drafts a personal invite inside the
         brand's terms, and when the creator asks for 20% and 2 samples, Jev picks the move while code caps the
         commission at the brand's 18% max. On-screen text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Music: kit bed bright-pluck-112, aligned so its
         own ending lands on the last frame, -20 LUFS integrated (QA -22..-18), fades 0.3 / 1.5 s.
TIME:    46.75 s (target 45-55, cap < 60). Real product from frame 0.
LOOK:    kit 1.1 palette = the demo UI: ground #0a0a0f, ink #f2f1f9, accent coral #ff8060 (data-kit-accent="coral",
         the Reacher page's DemoLayout accent). Text-first band: kicker = step, one headline, optional detail,
         8-step progress stepper (Match, Filter, Score, Rank, Invite, Reply, Decide, Guard).

FOOTAGE: two takes recorded 2026-11-16 with kit/scripts/capture.cjs (DOM boxes) from an isolated
         `next build && next start -p 3160` copy of branch demo/reacher, in preview mode (no key):
         top    page top; the page's Replay button (below the fold) replays the example ranking, so the
                run-at-a-glance card fills: funnel 40 -> 12 -> 10 -> 8, top match @lenaslabnotes, 22 Jev calls
         main   step 1 Find creators (example replay for the serum) -> shortlist; Invite on the top match ->
                Redraft invite (recorded invite replays); step 3 first sample reply -> Decide (recorded Jev
                answer and reply replay; the ask parsing, guardrail and output check run in the browser)
         hook   cut of top 2.4-5.1 s (accept stage -> pick -> top match lands at 1.66 s)
         Every model output on screen is the example run recorded live on the Vercel preview on 2026-11-16
         (Jev jev-1.13.0, deepseek/deepseek-v3.2 via fal). Live calls made for the film: none.

SHOTS (film s; scene; focus; kicker / headline / detail; annotation)
  0.00-2.40   coldopen  hero title + run-at-a-glance card (zoom 1.39-1.45, push-in, aligned so the bar is whole)
                        PROTOTYPE FOR REACHER · HAIDER BOKHARI / "Creators who'll say *yes*"
  2.40-5.70   match     step 1 head + 3 products; Find creators clicked at 5.38
                        STEP 1 · MATCH [Example run] / "One product, 40 sample *creators*"
  5.70-9.00   match     timeline + candidates (edge under the preview notice); filter, fit and acceptance fill
                        STEP 2 · FILTER / "Code filters 40 down to *12*"
  9.00-14.80  match     the four agent steps, zoom 1.7, frame edge in the column gutter (x 859)
                        STEP 3 · SCORE / "Jev scores fit and the odds they *accept*" / "22 typed calls, run in parallel."
                        annotation on Score fit: "12 scored in 187 ms"
  14.80-21.15 match     top of the shortlist (rows 1-3), edge in the gutter
                        STEP 4 · RANK / "Top 8 by fit × chance of *yes*" / "Lena: 24k followers, 84% likely to accept."
                        annotation on row 1's why: "Each why written by the LLM"
  21.15-29.75 invite    creator profile + invite card, then the invite card; Redraft clicked at 22.04
                        STEP 5 · INVITE [Example run] / "A personal invite built on her *content*" /
                        "It opens with her whiteboard reviews and offers 15%."
                        annotation on the checks row: "Checked against the 18% max"
  29.75-33.95 reply     DM thread + composer; preset 1 picked at 32.07
                        STEP 6 · REPLY [Example run] / "She asks for *20%* and 2 samples"
  33.95-38.15 reply     thread + Next action card; Decide clicked at 33.94, bars, final action Counter-offer
                        STEP 7 · DECIDE / "Jev picks the move: *counter-offer*" / "Probabilities that code acts on."
  38.15-44.25 reply     thread + action bars + guardrail table + timings (edge between the bars and the question)
                        STEP 8 · GUARD / "Code caps it at the brand's *18%*" / "Checked again after the reply is drafted."
                        annotation on the commission row: "Asked 20%, offered 18%"
  44.25-46.75 endcard   Haider Bokhari · haiderb.com (no question)

HONESTY: the whole film is the page's example run (preview mode): an "Example run" chip on steps 1, 5 and 6, and the
         page's own "Example run" pills and notes are in frame. No speed changes. The cold open's run was started
         by the page's Replay button, which is off-screen. No voice, no avatar; the only sound is the bed.
