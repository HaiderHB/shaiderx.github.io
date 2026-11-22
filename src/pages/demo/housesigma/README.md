# HouseSigma demo: ask, then know if it's a fair price

Unofficial prototype of an AI home-search copilot, built for a Product Builder application.
Live at `/demo/housesigma/` (unlisted, noindex). Not HouseSigma's product, no HouseSigma data.

## What is on the page

1. **Ask**: one sentence ("3-bed semi in Brampton under $1.1M, walk to a GO station, quiet
   street") becomes filter chips. The LLM proposes a small JSON object; `validateFilters()` keeps
   only cities, areas, home types and ranges that exist in the data, reports what it dropped and
   shows phrases with no matching field as "not searchable yet". Chips can be removed or edited;
   each chip shows how many homes are left after it. An empty result suggests which chip to drop.
2. **Matches**: listing cards with a value hint (asking price against the code estimate) and a
   price-against-size chart over homes sold nearby in the last six months.
3. **Is this a fair price?**: comparable sold homes picked and adjusted in code, an estimate
   range, a fast decision model's verdict (underpriced / fair / overpriced) with a probability
   for each, a range check in code beside it, and two sentences from the LLM citing the comps.
   Every figure in that text is checked against the facts the model was given.
4. **Offer-night brief**: sold-over-asking share, sale-to-list ratio and days-on-market trend for
   the area and home type, the home's own list-to-sold history, the model's chance of competing
   offers, and a suggested offer range with reasons. Labelled sample data, not advice.
5. **This week on your saved search**: new matches, price drops and what sold against its
   estimate in the last 7 days, counted in code and worded by the LLM (figures checked again).

## How a run works

| Step | Who | Cost |
| --- | --- | --- |
| Sentence to filters | LLM, JSON reply, 220 tokens max; validated in code | 1 unit, cached per ask |
| Search, comps, estimate, brief, pulse stats | code (`engine.js`), in the browser | free |
| Verdict and chance of competing offers | fast decision model, one call, two questions | part of 2 units |
| Explanation | LLM, streamed, 160 tokens max | cached per listing |
| Weekly update | LLM, streamed, 220 tokens max | 1 unit, cached per search |

Routes: `POST /api/demo/housesigma/parse/`, `/fair/` (NDJSON stream), `/pulse/` (text stream), all
behind `demoApi()` (private key, rate limit, daily budgets) with `clampText()` on inputs.

## Modes

- **Preview (no key)**: the page opens on a run recorded through the live routes on 2026-11-21
  (`example.js`): the ask, its filters, the price check for one home and the weekly update, each
  labelled "Example run" / "recorded run". Filters, search, comps, estimates, the chart and the
  offer brief still run live in the browser for any home. A price check on another home shows the
  code range check only and says the model verdict needs the private link.
- **Live (with `?k=`)**: every ask, price check and weekly update calls the models.

## Env vars

`FAL_API_KEY` (LLM through fal's router, `DEMO_LLM`), `JEV_API_KEY` (decision model). Optional:
`DEMO_LLM_MODEL`, `KV_REST_API_URL` / `KV_REST_API_TOKEN` for durable budgets and caches.

## Sample data

`data.js` generates the market from a fixed seed, the same on server and browser: 580 active
listings and 3,200 sold records over 12 months in six areas (Brampton, Mississauga, Oakville,
Toronto). Cities, areas and GO stations are real places; every street name, home, price and date
is invented by a small price model (size, bedrooms, station distance, school score, street type,
an area price trend, and sellers who list under, at or over market). The market is frozen on
2026-11-20, so "this week" always means the same seven days.

## What I assumed

- The buyer's real question is "is this asking price fair, and what do I do on offer night",
  which sold data answers better than more search filters.
- Trust comes from showing the work: the comps, the range, the odds, and a check that the model
  did not invent a number.
- Mobile first: most of this is read on a phone, one hand, in a car outside an open house.

## What I cut

- Maps, photos, saved-search alerts by email or push, accounts.
- Side-by-side compare of two homes (the weekly pulse made the stronger third feature).
- Condition, renovations and lot shape in the estimate; multi-area searches in the edit panel
  (the LLM can still return several cities).
- Follow-up questions in a chat thread: one ask, then direct manipulation of chips.

## With real data

- Run the comp picker and the estimate against actual sold history and back-test it: median
  error by area and home type, and how often the sold price lands inside the range.
- Calibrate the verdict: do homes called "underpriced" at 80% sell over asking about 80% of the
  time? Log every verdict with its outcome.
- Log asks that produced "not searchable yet" phrases: that is the roadmap for new fields.
- Tie the weekly pulse to the watchlist and alert only when something crosses a threshold.

## Testing

`pnpm build`, then `next start -p 3103` and open `/demo/housesigma/?k=<key>`. Checked at 1280 px
and 390 px: live ask, price check and weekly update end to end, no console errors, no sideways
scroll.

## Take-down

Delete `src/pages/demo/housesigma/`, `src/pages/api/demo/housesigma/`, the `housesigma` entries
in `src/demos/keys.json`, `video/films/housesigma/` and `public/demo-videos/housesigma.mp4`.
