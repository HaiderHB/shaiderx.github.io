# SPEC: Reacher launch film v2 (kit 2, launch format)

GOAL:    A stranger at Reacher watches 70 s, sound on or off, on a laptop or a phone. After 16 s they can say
         what this is (an AI agent that finds creators who'll say yes to a TikTok Shop product) and what problem
         it solves (most outreach goes to creators who never reply). By the end they have seen ONE match done
         (a product in, 40 sample creators filtered and scored, a shortlist of 8 out, each with a reason), a
         personal invite drafted, and a creator's ask for more answered with a counter-offer that stays inside
         the brand's maximum, and they know where to try it. Text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/reacher.mp4. Music: kit bed bright-pluck-112-long, its own ending on the last frame,
         -20 LUFS integrated, fades 0.3 / 1.5 s.
TIME:    70.1 s, 8 scenes, 3 features (the shortlist, the invite, the reply).
LOOK:    kit 2 launch format, accent coral #ff8060 (the demo page's accent). Captions 66 px (hook 72 px), one
         line, no kicker; four chapter labels over a thin progress bar.
RUN:     example (data-kit-run="example"). Preview mode, no keys, no live calls: the page replays its recorded
         live run for the serum (a decision model + DeepSeek V3.2, recorded on the Vercel preview on
         2026-11-16, 10.74 s live) and labels it "Example run".

## Beat table (as built)

Reading time = max(2.5, 0.5 + 0.6 x words). Page shown at = camera zoom x 1.41 (the 1360 px capture on the 1920 stage).

| # | Beat | Film s | Picture (clip, media s) | Text on screen | Words / needs / gets | Focus box, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.2 | The run-at-a-glance card at the top of the page while a run lands: the funnel 40, 12, 10, 8 is on screen on frame 0; the top match (@lenaslabnotes, fit 99, 84% likely to accept) and the total time (10.74 s) land at 0.4 s; then a 3.8 s hold (top 4.55-8.75) | "40 creators screened in 11 seconds" | 6 / 4.1 / 4.2 s | `glance`, 2.1x | chip "Example run, recorded live"; 11 seconds = the live run's 10.74 s, not the replay's 3.5 s |
| 2 | WHAT IT IS | 4.2-10.2 | A ranking run on the page, blurred 10 px and dimmed (main 12.2-18.2) | "An AI agent that finds creators who'll say yes." + "A prototype built for Reacher by Haider Bokhari" | 9 / 5.9 / 6.0 s | statement | |
| 3 | PROBLEM | 10.2-15.6 | The candidates before any score: names, follower counts, empty score bars, scrolled slowly, blurred 5 px and dimmed (before 0.6-6.0), list column only | "Most outreach goes to creators who never reply." | 8 / 5.3 / 5.4 s | statement | a plain statement, no number; the "before" picture is the page right after its filter step, held there by the capture script |
| 4 | HERO 1 | 15.6-20.3 | The serum's product card with the brand's terms (lit first), then the Find creators button; it is pressed at 18.21; the page's preview notice appears under it (main 0.5-5.2) | "Pick a product. Press Find creators." | 6 / 4.1 / 4.7 s | `product1` + `findButton`, 2.8x | the hint beside the button and the notice say the page replays a recorded run |
| 4 | HERO 2 | 20.3-25.6 | The agent's first step lands at 20.7: 12 of 40 sell skincare to US audiences (23 other niches, 3 audience outside the US, 2 under 4k average views) (main 12.55-17.85) | "It filters 40 sample creators down to 12" | 8 / 5.3 / 5.3 s | `stepFilter`, 2.8x | chip "Example run, recorded live" |
| 4 | HERO 3 | 25.6-30.9 | Four candidates: the fit bars fill from 26.0, the acceptance bars from 27.4, the list re-ranks at 28.9 and the one-line reasons land (main 20.25-25.55) | "It scores fit and the chance they'll accept" | 8 / 5.3 / 5.3 s | `row1` + `row2` + `row3`, 2.3x | chip "Example run, recorded live" |
| 4 | HERO 4 | 30.9-36.2 | The top row: rank 1, Lena Fischer, fit 99, accept 84%, the reason; it is selected at 33.44 (main 36.9-42.2) | "A shortlist of 8, each with a reason" | 8 / 5.3 / 5.3 s | `row1`, 2.7x | 8 = the page's "Top 8 creators" |
| 5 | FEATURE 2 | 36.2-43.0 | Draft invite is pressed at 38.31; the invite streams in until 40.5: "Hey Lena! I love your lab notes series where you grade formulas on the whiteboard..."; the rate check lands under it (main 46.0-52.8) | "A personal invite, drafted from the creator's content" | 8 / 5.3 / 6.8 s | `inviteBody` (+ `draftButton`, `checks`), 2.5x | chip "Example run, recorded live"; her content notes on the page: "grades formulas on a whiteboard" |
| 6 | FEATURE 3a | 43.0-48.3 | The creator's reply is picked at 45.33: "Love it! Can you do 20% and send 2 samples first?" (main 57.2-62.5) | "The creator asks for more: 20%, 2 samples" | 8 / 5.3 / 5.3 s | `presets` + `replyInput`, 2.7x | a sample reply on the page (simulated creator), labelled "The creator replies" |
| 6 | FEATURE 3b | 48.3-53.6 | The thread: her message, then the drafted answer streams in from 49.4: "We can offer 18% commission and 1 free sample" (main 66.9-72.2) | "The agent drafts a counter-offer: 18%, one sample" | 8 / 5.3 / 5.3 s | `bubbleCreator` + `bubbleDraft`, 2.8x | chip "Example run, recorded live"; the bubble is labelled "draft reply, not sent" |
| 6 | FEATURE 3c | 53.6-58.3 | The guardrail table: commission asked 20%, brand limit max 18%, in reply 18% (capped); samples asked 2, limit 1 per creator, in reply 1 (capped) (main 73.0-77.7) | "It never goes above the brand's maximum" | 7 / 4.7 / 4.7 s | `guardTable`, 2.8x | the cap is code on the page (it re-runs in the browser), not model output |
| 7 | PROOF | 58.3-65.1 | The top of the page, wide: the title and the run-at-a-glance card (funnel 40, 12, 10, 8; total time 10.74 s) (main 82.0-88.8) | "40 sample creators · 8 shortlisted · 10.7 s live run" + "Under the hood: a decision model scores · an LLM writes · code enforces the commission cap" | 9 / 5.9 / 6.8 s | `heroText` + `glance`, 1.5x (wide) | the run's own counts; 10.7 s is the recorded live run (10.74 s), not the replay |
| 8 | END | 65.1-70.1 | End card | "Built for Reacher by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | |

Chapters on the progress bar: The problem (0) · The shortlist (15.6) · The invite (36.2) · The reply (43.0).

## Checked against the page and its recorded run (src/pages/demo/reacher, example.js "serum")

- 40 sample creators; the filter keeps 12 (23 other niches, 3 audience outside the US, 2 under 4k average
  views); 12 fit scores; acceptance estimated for the 10 best fits; 8 shortlisted. The page's card reads
  40, 12, 10, 8, "22" model calls and "10.74 s" total (0.57 ms + 187 ms + 118 ms + 10.43 s, the live timings).
- Top match: Lena Fischer, @lenaslabnotes, 24k followers, fit 99, 84% likely to accept. Her reason on the page:
  "Their usual 12% commission is lower than your 15% offer, and they read ingredient lists aloud."
- The invite opens "Hey Lena! I love your lab notes series where you grade formulas on the whiteboard." and
  offers a free sample and 15% (the brand's opening offer; brand max 18%). Her content notes on the page:
  "Former cosmetics lab tech; reads ingredient lists aloud and grades formulas on a whiteboard."
- The reply "Love it! Can you do 20% and send 2 samples first?" gets Counter-offer (100%); the guardrail caps
  the commission at 18% and the samples at 1; the drafted answer says "We can offer 18% commission and 1 free
  sample". The page labels it "draft reply, not sent".

## What changed from the suggested story, and why

- Hook: "40 creators screened in 11 seconds", not "ranked": all 40 are screened (the filter), 12 are scored and
  ranked, 8 are shortlisted. The card under the caption shows 40, 12, 10, 8 and 10.74 s.
- Proof says "10.7 s live run": the page shows 10.74 s, and that is the recorded live run's time, not the
  replay's (the page replays the example in about 3.5 s).
- "It filters 40 sample creators down to 12" gets its own shot: the page shows the real counts for it.
- Feature 3 has three shots (the ask, the drafted counter-offer, the cap), feature 2 has one: the reply is the
  coolest part and needs the ask, the answer and the limit to be read one at a time. It runs 15.3 s, longer
  than the format's 8-10 s per feature; the film is still 70.1 s.
- "The agent drafts a counter-offer", not "answers": the page drafts the reply and labels it "not sent".
- "the creator", not "she": the page's own reason for the top match says "they".
- "It never goes above the brand's maximum" keeps "code" out of the caption; the under-the-hood line says
  "code enforces the commission cap".

## Footage

Three takes with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels (frames 2720x1530), cursor 0.75
with idle hide, 450 ms rest before clicks, from an isolated `next start -p 3171` copy of the branch with no demo
key (preview mode). No live calls. `main` was recorded 2026-11-16, `top` and `before` 2026-11-17.

- `top` (10.7 s): the top of the page; Find creators is pressed off camera at 1.22 (no cursor); the card shows
  "Ranking…" until the top match and the total time land at about 4.95. The hook is 4.55-8.75.
- `before` (8.4 s): Find creators is pressed with the page's timers held by the capture script, so the replay
  stops right after its filter step: 12 candidates with names, follower counts and empty score bars; the list
  is scrolled slowly.
- `main` (90.2 s): one continuous take. Find creators pressed on camera at 3.11; the page replays the same
  recorded run on every press, so it is pressed again off camera at 12.46 (the filter step, hero 2) and 20.14
  (the scores, hero 3; re-ranked at 23.56); the top row is selected at 39.44; Draft invite 48.11, drafted
  50.29; the sample reply picked 59.53; Decide pressed off camera at 66.55 (the button sits a screen below the
  thread), reply drafted 69.28; the guardrail table 73-78; the top of the page, wide, 81.2-90.2.
  Footage plays at 1x everywhere: no speed changes, no freeze frames (every hold was recorded).
  The footage shows each change about 0.1-0.2 s after its DOM time, so spotlights switch on what the footage
  shows (checked on frames), not on the event times.

## Cold-viewer test

After 15.6 s a stranger has read: "40 creators screened in 11 seconds", "An AI agent that finds creators who'll
say yes. A prototype built for Reacher by Haider Bokhari", and "Most outreach goes to creators who never reply",
over a card naming a top match (fit 99, 84% likely to accept), a ranking run, and a list of creators with
follower counts and no scores. They can say what it is and what it is for before the first click.
