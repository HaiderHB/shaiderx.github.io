# Review: Reacher launch film v1 (kit 1.1.1)

## The film (46.75 s)
- Cold open on the page's run-at-a-glance card as the example ranking lands (funnel 40 → 12 → 10 → 8,
  top match @lenaslabnotes, fit 99, 84% likely to accept), headline "Creators who'll say *yes*".
- Step 1-4 in one take of the match section: pick the product, Find creators, the four agent steps fill
  (filter in code, Jev fit scores, Jev acceptance, pick top 8), then the shortlist with LLM-written whys.
- Step 5: the invite for the top match streams; the rate check (15% offered, 18% max) under it.
- Steps 6-8: the creator asks for 20% and 2 samples; Jev picks counter-offer; the guardrail caps the
  commission at 18% and samples at 1, and the drafted reply carries 18%.
- End card: Haider Bokhari · haiderb.com. Accent coral (the page's DemoLayout accent).

## QA (kit/scripts/qa.mjs)
- 46.75 s, first product frame 0.00 s, 11 camera keyframes + 4 annotations inside the safe area, 8 v2 cues
  each on screen >= its reading time, 8-step stepper, one music bed (bright-pluck-112, -20 LUFS planned),
  no voice: 0 fail, 0 warn.
- edges.mjs: 1 advisory hit, the Next action card's top border in the guard shot (the shot frames the
  card's inside: action bars, guardrail table and timings, with the frame edge in the gap above the bars).
  Column close-ups put the frame edge in the 24 px gutter (x 859); frame tops sit in the gaps under the
  section heads or the preview notice.
- HyperFrames check: 0 errors; kept warnings: timeline_track_too_dense (one captions host by design),
  nested_media_start_basis_ambiguous (starts are composition-local).
- Looked at renders/qa/contact-sheet.jpg and renders/qa/framing-sheet.jpg; render QA below.

## Honesty
- All footage is the real page at /demo/reacher/ from an isolated `next start` copy of the branch, in
  preview mode (no key). Every model output on screen (Jev fit scores, acceptance, next action; DeepSeek
  whys, invite, reply) is the example run the page replays, recorded live on the Vercel preview on
  2026-11-16. The filter, ranking, ask parsing, guardrail and output check re-run in the browser.
  The film says so with an "Example run" chip on steps 1, 5 and 6, and the page's own "Example run"
  pills, notes and preview notice are in frame.
- No speed changes. The page replays the example faster than the live run took (its note says the times
  shown are the live ones: the why step took 10.4 s live).
- The cold open's replay was started by the page's own Replay button, which sits below the fold.
- Live calls made for the film: none. No voice, no avatar; the only sound is the bed.

## Weakest shot
- Step 2 (5.7-9.0 s): the filter happens in the first 0.4 s of the run, so the "Code filters 40 down to
  12" caption reads while the fit bars are already filling. The 12-of-40 line is on screen in the
  timeline the whole time, and the next shot zooms on it.
