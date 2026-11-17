# Review: Reacher launch film v2 (launch format)

Rebuilt on kit 2 after Haider's notes on the first films: too fast, hard to know where to look, straight into
the UI without saying what the product is or what problem it solves. v1 was 46.75 s (kit 1.1.1): a cold open,
eight steps, the whole page on screen and captions about mechanics. v2 is 70.1 s in the launch format; the beat
table is in SPEC.md.

## What it shows (70.1 s, kit 2.0.0, accent coral)

| Film s | Beat | Text on screen |
| --- | --- | --- |
| 0.0-4.2 | Hook: the run-at-a-glance card while the top match lands, shown at 2.1x | 40 creators screened in 11 seconds |
| 4.2-10.2 | What it is, over a ranking run, blurred | An AI agent that finds creators who'll say yes. / A prototype built for Reacher by Haider Bokhari |
| 10.2-15.6 | Problem, over the candidates before any score | Most outreach goes to creators who never reply. |
| 15.6-20.3 | Hero 1: Find creators is pressed | Pick a product. Press Find creators. |
| 20.3-25.6 | Hero 2: the filter step lands | It filters 40 sample creators down to 12 |
| 25.6-30.9 | Hero 3: fit and acceptance bars fill, the list re-ranks | It scores fit and the chance they'll accept |
| 30.9-36.2 | Hero 4: the top row, selected | A shortlist of 8, each with a reason |
| 36.2-43.0 | Feature 2: Draft invite is pressed, the invite streams in | A personal invite, drafted from the creator's content |
| 43.0-48.3 | Feature 3a: the creator's reply is picked | The creator asks for more: 20%, 2 samples |
| 48.3-53.6 | Feature 3b: the drafted answer streams into the thread | The agent drafts a counter-offer: 18%, one sample |
| 53.6-58.3 | Feature 3c: the guardrail table | It never goes above the brand's maximum |
| 58.3-65.1 | Proof: the top of the page, wide | 40 sample creators · 8 shortlisted · 10.7 s live run / Under the hood: a decision model scores · an LLM writes · code enforces the commission cap |
| 65.1-70.1 | End card | Built for Reacher by Haider Bokhari / Try it live: the link is in my message / haiderb.com |

Chapters on the progress bar: The problem · The shortlist · The invite · The reply.

## QA (kit/scripts/qa.mjs, launch rules)

- Static: PASS, 0 fail, 0 warn. 70.10 s; beats hook, what, problem, hero, feature, feature, proof, end, in order;
  10 launch cues, each one line at 66 px (hook 72 px), on screen >= its reading time and <= 7 s; 4 chapters;
  hero and feature shots show the page at 2.3-2.8x, the hook at 2.1x, the proof at 1.5x; 10 camera shots and
  17 spotlights inside the safe area; no camera move under a caption; run "example", labelled on screen.
- Render (qa.mjs --video): PASS. H.264 1920x1080 30 fps + AAC, 70.10 s, 8.8 MB; -20.0 LUFS integrated, true
  peak -6.4 dBTP; fade-in and a fade-out landing on the last frame. Web encode (CRF 26, faststart): 3.5 MB.
- HyperFrames check: 0 errors; kept warnings as in the pilot: timeline_track_too_dense (captions host, hero
  scene), nested_media_start_basis_ambiguous (starts are composition-local).
- edges.mjs (advisory): the tight shots slice neighbouring cards at the frame edges; all of them are outside
  the lit box and dimmed. The invite shot puts its left edge in the gutter beside the creator card; the proof
  shot's top edge is the page top, so the site bar is whole.

## Review loop

- Three passes over stills: 35 frames of the composition (every 3.4 s plus every seam), 25 frames at the cuts,
  clicks and landings, then strips of the first render around every spotlight switch (3-5 frames per second)
  and the final render (24 frames, one every 3 s, plus a strip of feature 3b).
- Fixed from the stills: the hook sat beside the page title, which the frame edge slices (the dim outside the
  card is now 0.96, so only the card reads); the lit box in hero 1 cut through the hint beside the button (the
  product card is lit first, then the button); the lit boxes in the invite and reply shots switched before the
  footage showed the change, or covered the reply box under the thread while the draft was still growing (they
  now follow the footage, in steps); the proof shot sliced the site bar (the frame top is now the page top).
- Phone check: twelve frames of the web encode shrunk to 390 px wide. Every caption reads; so do the hook
  card's handle and numbers, the filter step, the creator's ask, the drafted counter-offer, the guardrail
  table and the proof numbers. The small print inside the shortlist rows and the invite body does not read at
  that width: the captions restate what matters. The wide proof shot is not readable at that width by design:
  its three numbers are restated large.
- Cold-viewer test: by 15.6 s the viewer has read the outcome, what it is, who built it for whom, and the
  problem, before the first click. Yes.

## Honesty

- Footage: the real page at /demo/reacher/ from an isolated `next start` copy of the branch, with no demo key
  (preview mode). Every model output on screen is the page's example run for the serum, recorded live on the
  Vercel preview on 2026-11-16 and replayed by the page; the filter, the ranking, the parsing of the ask and
  the commission guardrail re-run in the browser. `data-kit-run="example"`; the hook and four shots carry the
  chip "Example run, recorded live"; the page's own "Example run" pills and its preview notice are in frame.
  No live calls during capture.
- "11 seconds" and "10.7 s live run" are the live run's 10.74 s (the page shows the live timings). The page
  replays the run in about 3.5 s; the film does not present the replay's speed as the product's.
- Footage plays at 1x everywhere; no freeze frames (every hold was recorded).
- The page replays the same recorded run every time Find creators or Decide is pressed. Find creators is
  pressed on camera once (hero 1); the filter step (hero 2), the scores (hero 3) and the hook are further
  replays started off camera. Decide is pressed off camera: the button sits a screen below the thread.
- The problem beat's backdrop is the page right after its filter step (candidates, no scores yet): the capture
  script holds the page's timers there so the state can be filmed. It is shown blurred, under the statement.
- The creator's reply is one of the page's sample replies (a simulated creator). The counter-offer is a draft:
  the page labels it "draft reply, not sent", and the caption says "drafts".
- "Most outreach goes to creators who never reply" is a plain statement of the problem, not a number from the
  demo.
- No voice, no avatar, no Reacher or TikTok logo. Music: the kit's instrumental bed (bright-pluck-112-long).

## Where it falls short of the standard

- Hook: the first frame still reads "Ranking…" (the top match and the time land at 0.4 s), so a player that
  shows frame 0 as its poster shows the card a moment before the result. The card also carries the page's
  internal label "Jev calls" at 2.1x; the captions never use the name.
- Hero 1: the product is already selected when the shot starts, so "Pick a product" is shown, not done; the
  visible result of the click is the page's preview notice (dimmed, running off the right edge), because the
  run itself starts below the frame.
- Hero 2: the filter runs in the browser at once, so its numbers are on screen from the first frame; only the
  check mark and the time land (0.35 s after the cut, not 1 s), and the shot is nearly still for 5 s.
- Hero 3: two things happen under one caption (the bars fill, then the list re-ranks and the reasons land);
  the result holds under 2 s. Hero 2, hero 3 and feature 3b have no click on camera (replays started off camera).
- Hero 4: selecting the top row changes only its outline.
- Feature 3 runs 15.3 s in three shots (the format says 8-10 s per feature); feature 2 is one 6.8 s shot.
  Feature 3c is a still shot: 4.7 s of real footage in which nothing moves.
- The proof shot shows the same card as the hook (wide this time), and the page's tagline in it names "Jev".
  The dimmed line above the guardrail table also reads "Jev's pick".
- The under-the-hood line (15 words) and the end card (17 words in 5 s) are not held to the 0.6 s per word
  rule; the proof numbers are (9 words, 6.8 s).
- 2x capture records about 6-14 changed frames per second (the film itself is 30 fps): the streaming text and
  the cursor glides are slightly stepped.
- Spotlights are boxes that switch in steps: while the draft reply streams, the lit box grows in four steps,
  each a moment ahead of the text.
