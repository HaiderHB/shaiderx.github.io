# SPEC: HouseSigma launch film (kit 2.1, launch format)

GOAL:    A stranger at HouseSigma watches 69.5 s, sound on or off, on a laptop or a phone. After 15 s they can say
         what this is (a home-search copilot: ask in a sentence, get a verdict on the asking price) and what problem
         it solves (sold prices are public, but working out fair value is still on the buyer). They see ONE task done
         (a sentence -> filters -> matches -> a verdict with odds and its comps), then the offer-night brief, then the
         weekly pulse for the saved search, and know where to try it.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC. Music: bright-pluck-112-long at -20 LUFS, fades 0.3 / 1.5 s.
         Web encode: H.264 CRF 26, faststart -> public/demo-videos/housesigma.mp4.
RUN:     live (data-kit-run="live"). One take, `flow`, recorded 2026-11-21 from a production build of the demo
         (next build && next start -p 3103) opened with the review key. The server was restarted right before the
         take, so nothing came from cache: the ask -> filters (LLM, 1.6 s), the verdict and chance of competing
         offers (fast decision model, 123 ms), its explanation (LLM, streamed) and the weekly update (LLM, streamed)
         are all live calls. Search, comps, estimate, offer brief and pulse numbers run in the browser. The data is
         the demo's generated sample market (labelled "Sample data" on screen). Footage plays at 1x throughout.

## Beat table

Captions: <= 8 words, reading time max(2.5, 0.5 + 0.6 x words). Text screens 3 s. Result rule: a result stays
max(2.5, 0.5 + 0.3 x words read) s. Times are film seconds; media times are in `flow` (data/clips/flow.json marks).

| # | Beat | Seconds | Picture (real page footage) | Text on screen | Words / needs | Result lands at / held for | Focus box | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | HOOK | 0.0-4.2 | the verdict for 233 Wrenfold Lane just landed: Underpriced, 89% / 11% / 0%, explanation streaming in | "Is this home priced fairly? Underpriced." | 6 / 4.1 s | on screen from frame 0 / 4.2 s | `verdictHead`-`bars` | chips "Live run", "Sample data" |
| 2 | WHAT IT IS | 4.2-7.2 | the matches list, blurred and dimmed | "Ask for a home. Know if the price is fair." + "A prototype built for HouseSigma by Haider Bokhari" | 10 / 3 s | | (statement) | |
| 3 | PROBLEM | 7.2-10.2 | the price card before its verdict, blurred | "Sold prices are public. Fair value is still guesswork." | 9 / 3 s | | (statement) | |
| 4 | HERO 1 | 10.2-17.2 | the ask typed, no filters; Search clicked at 1.04 s; six chips land, 580 -> 12 homes | "One sentence becomes filters you can edit" | 7 / 4.7 s | 3.55 s / 3.45 s | `askIcon`-`chipLast` | |
| 4 | HERO 2 | 17.2-23.0 | the matches with value hints; the second home is clicked at 1.36 s | "Every match is priced against sold homes" | 7 / 4.7 s | 1.4 s / 4.4 s | `card1`-`card3` | |
| 4 | HERO 3 | 23.0-29.0 | its price card; "Is this a fair price?" clicked at 1.4 s; verdict and odds land | "A fast model gives a verdict, with odds" | 8 / 5.3 s | 2.07 s / 3.93 s | `range`-`bars` | |
| 4 | HERO 4 | 29.0-35.0 | the explanation citing two sold homes; "5 figures in this text, all traced to the comps" | "Every figure is traced to real sales" | 7 / 4.7 s | 0 / 6.0 s | `explain` | |
| 5 | FEATURE 2a | 35.0-40.5 | offer-night tiles: 54% sold over asking, 100.2% sale to list, 10 d, 79% chance of competing offers | "Offer night: how this area really sells" | 7 / 4.7 s | 0 / 5.5 s | `offerTiles` | |
| 5 | FEATURE 2b | 40.5-46.0 | suggested offer range $908,000 to $940,000 with three reasons | "A suggested offer range, with the reasons" | 7 / 4.7 s | 0 / 5.5 s | `offerCard` | chip "Sample data, not advice" (also on the card) |
| 6 | FEATURE 3a | 46.0-51.0 | the saved search's week: 6 new matches, 4 price drops, 8 sold | "Your saved search, watched every week" | 6 / 4.1 s | 0 / 5.0 s | `tile1`-`tile3` | |
| 6 | FEATURE 3b | 51.0-58.0 | "Write this week's update" clicked at 1.04 s; three bullets and a takeaway stream in | "The week's changes, written in plain words" | 7 / 4.7 s | 2.92 s / 4.08 s | `digest` | |
| 7 | PROOF | 58.0-64.5 | the top of the page, wide: title and the search with its filters | 12/580 homes matched · 6 sold comps per verdict · "An LLM reads the ask · code picks the comps · a fast decision model decides" | 7 / 4.7 s | | `heroText` | numbers from this run |
| 8 | END | 64.5-69.5 | end card | "Built for HouseSigma by Haider Bokhari" / "Try it live: the link is in my message" / "haiderb.com" | | | | |

Chapters: The problem 0 · Ask and check 10.2 · Offer night 35 · This week 46

## Footage

Take `flow` (86.9 s, 2x, 1360x765). Marks (media s) are in data/clips/flow.json: ask (Search click), chips,
chips-landed, results, pick, fair-still, check, verdict, explained, offer, pulse, digest-still, write, writing,
written, top. Media starts in the compositions were computed from these marks (click 1.04-1.4 s into its shot).
In the pre-roll (not in the footage) the page's example search is cleared with its own clear button and the ask is
typed, so the first hero shot starts from "no filters yet".

## Choices

- Feature 3 is the weekly pulse, not the two-home compare: text streaming into a card beside live counts films
  better and ties back to the saved search.
- The home in the film is the second match (233 Wrenfold Lane): its odds split 89 / 11, which shows the
  probabilities better than the top match (99 / 1), and its area gives a "competitive" offer brief.
- H1 clicks Search at the right edge of the search box, outside the zoomed frame: the cursor leaves to the right,
  then the chips land. Framing the whole box would have dropped the page under 1.5x.
- The proof line keeps two numbers; "0.12 s to a verdict" was cut to stay inside the reading time.

## Cold-viewer test

At 15 s the viewer has seen a verdict ("Underpriced", with odds) land on a listing, the sentence "Ask for a home.
Know if the price is fair.", the problem "Sold prices are public. Fair value is still guesswork.", and a typed
request turning into filter chips. Yes: they can say what it is and what it fixes.
