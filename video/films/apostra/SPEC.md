# SPEC: Apostra launch film (kit 2.1, launch format)

GOAL:    Brian O'Kelley (Apostra's CEO) watches about 69 s, sound on or off, on a laptop or a phone. After 10.6 s
         he can say what this is (an AI buying agent that books ads with sellers' agents) and what problem it
         solves (every seller is another integration and another way for an agent to overspend). By the end he
         has seen ONE brief become a booked, guardrail-checked plan through MCP tool calls, seen a retried
         create_media_buy return the same buy, seen a counteroffer over the CPM ceiling stop the agent and go to
         a person, and knows where to try it. Text carries everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF 26, faststart) committed as
         public/demo-videos/apostra.mp4. Music: kit bed bright-pluck-112-long, -20 LUFS, fades 0.3 / 1.5 s.
LOOK:    kit 2.1 launch format, accent cobalt #6896ff (the demo page's accent). Captions one line, no kicker;
         four chapter labels over a thin progress bar.
RUN:     example (data-kit-run="example"). Preview mode, no key. The page plays its preset brief: the LLM's
         reading of the brief, its shortlist and the decision model's scores were recorded from a live run on
         2026-11-18 and replay; the three sample sellers, the guardrails, the bookings, the retry and the
         counteroffer run on the demo's server each time (free routes, no model calls). The page and the film
         label it "Example run" / "Sample sellers".

## Beat table (planned before capture; final numbers in "As built" below)

Caption reading time = max(2.5, 0.5 + 0.6 x words). Result hold = max(2.5, 0.5 + 0.3 x words to read), 6 s max.

| # | Beat | Film s | Picture | Text on screen | Words / needs | Result lands at / held for | Focus box | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.6 | The plan card while the on-load run books: "$32,000 of $50K · $18,000 waiting for your approval" | "Brief in. Ad buys booked across sellers." | 7 / 4.7 | ~1 s / ~3.6 s | `glance` | chip "Example run" |
| 2 | WHAT | 4.6-7.6 | The top of the page, blurred | "An AI agent that buys ads from sellers' agents." + "A prototype built for Apostra by Haider Bokhari" | 9 / 3 s | text screen | statement | |
| 3 | PROBLEM | 7.6-10.6 | The products table with its red crosses, blurred | "Every seller is another integration and another way to overspend." | 10 / 3 s | text screen | statement | |
| 4 | HERO 1 | 10.6-17.6 | The brief card; Plan and book is pressed; the typed fields the LLM read land | "A buyer's brief, in plain words" | 6 / 4.1 | ~2.2 s / ~4.8 s | `briefCard` | chip "Example run" |
| 4 | HERO 2 | 17.6-24.5 | The MCP call log: tools/list and get_products on three seller agents stream in | "It asks three seller agents over MCP" | 7 / 4.7 | ~3 s / ~3.9 s | `callLog` | chip "Sample sellers" |
| 4 | HERO 3 | 24.5-31.0 | Every product against five checks; four ruled out in red | "Code rules out what breaks the brief" | 7 / 4.7 | 0 / 6.5 s | `screenCard` | |
| 4 | HERO 4 | 31.0-38.0 | Plan checks pass; Riverline and Hollow Pine flip to Booked with media buy ids; Meridian "Needs approval" | "Two sellers booked, every guardrail checked" | 6 / 4.1 | ~1 s / 6 s | `checks` + `bookings` | |
| 5 | FEATURE 2 | 38.0-45.0 | The create_media_buy request log: a new row "replayed rl_mb_… attempt 2", same id | "Retry the call: same buy, no double booking" | 8 / 5.3 | ~1 s / 6 s | `requests` | |
| 6 | FEATURE 3a | 45.0-51.5 | The approval card: Meridian countered at $44 CPM, over the $38 ceiling | "A seller counters above your CPM ceiling" | 7 / 4.7 | 0 / 6.5 s | `approval` | |
| 6 | FEATURE 3b | 51.5-58.0 | Approve is pressed; "Approved by you: booked at the counter price" and the new buy id | "The agent stops. A person decides." | 6 / 4.1 | ~2 s / ~4.5 s | `approval` | |
| 7 | PROOF | 58.0-64.0 | The top of the page, wide: title and the plan card at $50,000 of $50K | 3 numbers from the run + "LLM + a fast decision model, typed checks in code" | | | `heroText` | numbers are the card's own |
| 8 | END | 64.0-69.0 | End card | "Built for Apostra by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | | | | |

Chapters: The problem (0) · One brief (10.6) · Booked once (38.0) · Escalated (45.0)

## As built (68.5 s; QA: PASS, 0 fail)

Page shown at = camera zoom x 1.41 (the 1360 px capture on the 1920 stage). Clip `flow` is one take; media
seconds in brackets. "Lands at" is seconds from the shot's start (`data-kit-lands`), "held" is how long the result
then stays (`data-kit-read` words → needs).

| # | Beat | Film s | Picture (clip flow, media s) | Text on screen | Words / needs / gets | Lands at / held (needs) | Focus, page shown at | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.7 | Plan card during the on-load run: $17,000 → $32,000 booked, then "$18,000 waiting for your approval" (7.6-12.3) | "One brief in. Ads booked across sellers." | 7 / 4.7 / 4.7 | ~2.1 / 2.6 (hook, not gated) | `glance`, 2.18x | chip "Example run" |
| 2 | WHAT | 4.7-7.7 | Top of the page, blurred (1.0-4.0) | "An AI agent that buys ads from sellers' agents." + "A prototype built for Apostra by Haider Bokhari" | 9 / 3 s | text screen | statement | |
| 3 | PROBLEM | 7.7-10.7 | The products table with red crosses, blurred (53.5-56.5) | "Every seller is another integration, and another way to overspend." | 10 / 3 s | text screen | statement, `data-kit-cam` on the table | |
| 4 | HERO 1 | 10.7-17.7 | Brief card; Plan and book clicked at 1.03; the LLM's fields land (20.75-27.75) | "A buyer's brief, in plain words" | 6 / 4.1 / 7.0 | 2.2 / 4.8 (13 words: 4.4) | manual box: brief text, button, fields; 1.74x | chip "Example run" |
| 4 | HERO 2 | 17.7-24.0 | MCP call log: tools/list + get_products on three sellers stream in (36.6-42.9) | "It asks three seller agents over MCP" | 7 / 4.7 / 6.3 | 2.9 / 3.4 (8 words: 2.9) | `callLog`, 2.4x | chip "Sample sellers" |
| 4 | HERO 3 | 24.0-30.5 | Products against five checks; premieres takeover (CPM) and the odds pod pack (gambling) crossed out (53.5-60.0) | "Code rules out what breaks the brief" | 7 / 4.7 / 6.5 | 0 / 6.5 (cap 6) | manual box: header + six rows; 2.0x | |
| 4 | HERO 4 | 30.5-37.5 | Riverline is booked (rl_mb_…), Hollow Pine flips to Booked with hp_mb_… at 0.9 (70.3-77.3) | "Two sellers confirm; each buy gets an id" | 8 / 5.3 / 7.0 | 0.9 / 6.1 (cap 6) | manual box: two booking rows; 2.5x | |
| 5 | FEATURE 2 | 37.5-44.5 | Request log; Retry the call pressed off screen at 0.84; row 4 "replayed rl_mb_… attempt 2" (81.8-88.8) | "Retry the call: same buy, no double booking" | 8 / 5.3 / 7.0 | 1.1 / 5.9 (14 words: 4.7) | `requests`, 2.54x | |
| 6 | FEATURE 3a | 44.5-51.0 | Approval card: "The agent stopped: needs a person", Meridian countered at $44, ceiling $38 (90.6-97.1) | "A seller counters above your CPM ceiling" | 7 / 4.7 / 6.5 | 0 / 6.5 (cap 6) | `approval`, 2.26x | |
| 6 | FEATURE 3b | 51.0-57.5 | Same card; Approve $44 clicked at 2.06; "Approved by you: booked at the counter price" + mp_mb_… (97.1-103.6) | "The agent stops. A person decides." | 6 / 4.1 / 6.5 | 2.35 / 4.15 (10 words: 3.5) | `approval`, 2.26x | |
| 7 | PROOF | 57.5-63.5 | Top of the page after approval: $50,000 of $50K, 1.41M impressions, $35.48 blended CPM, 11 tool calls (107.6-113.6) | "$50K booked · 11 tool calls · 0 double bookings" + "An LLM picks · a fast decision model scores · typed checks in code · idempotency keys" | 8 / 5.3 / 6.0 | | `heroText`, 1.41x (wide) | numbers are the page's own |
| 8 | END | 63.5-68.5 | End card | "Built for Apostra by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | 5.0 s | | | |

Chapters: The problem (0) · One brief (10.7) · Booked once (37.5) · Escalated (44.5)

Three shots use manual focus boxes (measured from the footage, QA warns "not from a capture"): the brief shot
(the textarea is not tracked), the products table (the whole card is taller than the frame allows at 1.5x) and the
two booking rows (the third row runs under the viewport while the shot holds). The "MCP" caption warns as
jargon; the brief allows protocol terms the company uses.

## Footage

One take, `flow` (114.7 s), recorded 2026-11-18 with kit/scripts/capture.cjs at 1360x765 CSS px, 2x device pixels,
cursor 0.75 with idle hide, 450 ms rest before clicks, from this worktree's `next build && next start -p 3103`
with no demo key (preview mode: the preset, free routes only, no model calls). Marks (DOM time, media s): load
waiting 9.51 · brief click 21.78, fields 22.59 · calls pressed 35.30, third get_products 39.31 · screen 53.0 ·
book pressed 62.43, first booking 70.05, escalated 72.50 · retry pressed 82.64, replayed 82.66 · approve click
99.16, approved 99.19 · top 106.7. Footage plays at 1x; every hold is real footage, no freeze frames.

## Cold-viewer test

By 10.7 s a stranger has read "One brief in. Ads booked across sellers." over a plan card that books $32,000 and
holds $18,000 for approval, then "An AI agent that buys ads from sellers' agents. A prototype built for Apostra by
Haider Bokhari", then "Every seller is another integration, and another way to overspend." over a table of
products with red crosses. They can say what it is and what it is for before the first click.

## Rules that are easy to break

- No title card, no Apostra logo, no kicker, no stepper, no "If I join" content.
- No model or vendor names anywhere; "the LLM", "a decision model". Protocol terms the company uses (MCP, AdCP,
  CPM) are fine. Implementation terms only in the proof beat's under-the-hood line.
- One focal point per shot, page shown at >= 1.5x. Real page footage only, nothing redrawn.
- A shot never ends as its result appears: take the time from the wait before it.
