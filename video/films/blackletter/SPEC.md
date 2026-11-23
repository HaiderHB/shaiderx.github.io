# SPEC: Blackletter launch film (kit 2.1, launch format)

GOAL:    A stranger at Blackletter watches 69 s, sound on or off. After 15 s they can say what this is (an AI
         contract reviewer that improves from lawyer decisions) and what problem it solves (a flag is only useful
         if lawyers can trust it). They see ONE task (a seed term sheet reviewed against the playbook), then a
         lawyer's rejection becoming a test case, then the feedback becoming a rule change that is re-scored.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC. Music: bright-pluck-112-long at -20 LUFS, fades 0.3 / 1.5 s.
         Web encode: H.264 CRF 26, faststart -> public/demo-videos/blackletter.mp4.
RUN:     live (data-kit-run="live"). One take, `flow`, recorded 2026-11-21 from a production build of the demo
         (next build && next start -p 3102, freshly started, nothing cached) with a demo key. Every model call in
         the take is live: the review (13.0 s), the confidence scores, the clarification call, the ten eval
         reviews (19 s). Footage plays at 1x; waits are cut and the long one is labelled ("19 s wait cut").

## Beat table

| # | Beat | Seconds | Picture (real page footage) | Text on screen | Words / needs | Result lands at / held for | Focus box | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.5 | The first flag lands with confidence bars while its words light up in the document (media 4.9) | "Contract review that learns from lawyers" | 6 / 4.1 s | 0.3 s / 4.2 s | `clause1` + `flagPool` (wide) | chip "Live run" |
| 2 | WHAT IT IS | 4.5-7.5 | the reviewed document, blurred (media 18) | "An AI reviewer that gets better with every lawyer decision." + "A prototype built for Blackletter by Haider Bokhari" | 10 / 3 s | | (statement) | |
| 3 | PROBLEM | 7.5-10.5 | the flags, blurred (media 27) | "A flag is useless if lawyers can't trust it." | 9 / 3 s | | (statement) | |
| 4 | HERO 1 | 10.5-16.0 | the term sheet: clauses get a "checked" chip one by one under the highlighted option pool words | "The agent checks each clause against the playbook" | 8 / 5.3 s | 2.4 s / 3.1 s | `clause1`-`clause5` | chip "Live run, sample document" |
| 4 | HERO 2 | 16.0-21.5 | the option pool flag: severity, quote, rule, redline, "Pinned to the exact words" | "Each flag: exact quote, the rule, a redline" | 8 / 5.3 s | 0 / 5.5 s | `flagPool` | |
| 4 | HERO 3 | 21.5-27.0 | the pro-rata flag's confidence bars: real issue 92% | "A fast second model scores its confidence" | 7 / 4.7 s | 0 / 5.5 s | `confPR` | |
| 5 | FEATURE 2a | 27.0-34.0 | the option pool flag's reject form with the reason filled in; Save rejection clicked at 1.1 s | "A lawyer rejects one flag and says why" | 8 / 5.3 s | 1.2 s / 5.8 s | `poolForm` | |
| 5 | FEATURE 2b | 34.0-39.5 | golden set: 12 eval cases, "Must not flag Option pool on Seed term sheet §1" | "That rejection becomes a permanent test case" | 7 / 4.7 s | 0 / 5.5 s | `goldenCount` + `case1` | |
| 6 | FEATURE 3a | 39.5-46.0 | playbook rule POOL with the added line "Flag only if the option pool percentage ... exceeds 15%" | "The reason becomes a clearer playbook rule" | 7 / 4.7 s | 0.3 s / 6.2 s | `ruleChanged` | |
| 6 | FEATURE 3b | 46.0-52.0 | score tiles land: precision 83% (was 77%), recall 91% (no change), false alarms 2 (was 3) | "Every document re-scored: precision 77% to 83%" | 7 / 4.7 s | 1.1 s / 4.9 s | `scoreTiles` | chip "19 s wait cut" |
| 6 | FEATURE 3c | 52.0-57.5 | "No longer flagged: Option pool, Seed term sheet §1 ... correct: it was a false alarm" | "And it shows exactly which flag changed" | 7 / 4.7 s | 0 / 5.5 s | `change1` | |
| 7 | PROOF | 57.5-64.0 | top of the page, wide: title + tiles (83%, was 77%; 12 eval cases) | 77% → 83% precision after one rejection · 11 labelled issues · "An LLM reviews · code pins every quote · a fast decision model scores · evals run in code" | 9 / 5.9 s | | `heroText` | numbers from this take |
| 8 | END | 64.0-69.0 | end card | "Built for Blackletter by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | | | | |

Chapters: The problem 0 · Review 10.5 · Lawyer feedback 27 · Evals 39.5

## Footage

Take `flow` (102.6 s, 2x, 1360x765). Marks (media s): review click 3.15 · flag1 5.18 · review-done 17.07 ·
conf-hold 25.6 · reject 35.9 · reason 37.95 · save-reject 41.14 · golden 48.68 · rerun 57.17 · harness 58.62 ·
scores 77.42 · changes 85.93 · top 94.1 · end 102.6. Before the review click the page shows its recorded example;
no footage from before 3.2 s is used.

## Choices

- Numbers are this take's: precision 10/13 = 77% before, 10/12 = 83% after; recall 10/11 before and after (the
  board control flag on the Series A sheet was missed in both runs). One rejection, so the gain is one false alarm.
- The option pool flag is the thread: it lands in the hook, is read in hero 2, rejected in feature 2, becomes the
  clarified rule in 3a and is the flag that changed in 3c.
- Reject and the sample reason are clicked just before feature 2a starts, so the shot has one click.
- QA warns that the hook shows the page at 1.44x (both columns are in frame so the flag and its highlighted
  words are seen together); the caption carries the idea.

## Cold-viewer test

At 15 s the viewer has seen a flag land next to highlighted contract words, "Contract review that learns from
lawyers", "An AI reviewer that gets better with every lawyer decision", "A flag is useless if lawyers can't
trust it", and the agent ticking off clauses. Yes.
