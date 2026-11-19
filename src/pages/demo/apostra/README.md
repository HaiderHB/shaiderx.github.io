# Apostra demo: an agent media-buying desk

Unlisted prototype at `/demo/apostra/?k=<key>`, built for Apostra by Haider Bokhari. Sample data
only; the sellers, products, prices and the advertiser are fictional.

A campaign brief goes to a buyer agent. It reads the brief into typed fields, calls each seller's
agent over MCP with AdCP-style tools (`tools/list`, `get_products`, `create_media_buy`), checks every
product and the whole plan in code, shortlists and splits the budget, has each pick scored for fit
and brand-safety risk, and books with idempotency keys. A counteroffer is re-checked against the same
guardrails: inside them the agent accepts it, outside them it stops and asks a person.

## What is on the page

| Section | What it shows |
| --- | --- |
| Hero | The plan at a glance: booked spend of the budget, what is waiting for approval, spend by seller, impressions, blended CPM, tool calls |
| 1 · Brief to tool calls | The brief (preset or your own), the fields the LLM read from it, the MCP call log streaming in, and the JSON-RPC request and result of any call |
| 2 · Screen and pick | Every product the sellers returned against five checks (channel, CPM ceiling, flight dates, brand safety, audience); the LLM's shortlist with its budget split and reasons; fit and risk probabilities from a decision model |
| 3 · Book | Plan guardrails (budget cap, CPM ceiling, brand safety, flight), one booking per seller with its media buy id and a "Retry the call" button, the create_media_buy request log, and the approval card for an escalated counteroffer |
| 4 · Audit | Agent-to-agent messages, the final plan (spend, impressions, CPM by seller, blended CPM) and the audit trail |

## How a run works

1. **Read** (LLM, JSON mode, 220 tokens max): the brief text becomes `{budget, channels, audience,
   flight, cpm_ceiling, exclusions, brand_safe}`. Code validates it (known channels and exclusions,
   real dates, sane numbers) and stops before any seller is called if something is missing.
2. **Discover**: `tools/list` and `get_products` on three sample seller agents, simulated server-side
   in `api/demo/apostra/sellers.js`: Riverline TV (CTV network), Hollow Pine Audio (podcast network),
   The Meridian Post (news publisher). Product shapes follow the public AdCP media-buy reference
   (`format_options`, `delivery_type`, `pricing_options` with `fixed_price`); `availability` and
   `content_adjacency` are demo fields the guardrails need.
3. **Check** (code): each product against the brief. In the preset, 4 of 9 are ruled out: CPM over
   the ceiling (2), a sportsbook-sponsored pod pack (gambling adjacency), a series that starts Dec 26.
4. **Pick** (LLM, 500 tokens max): shortlist and budget split from the survivors only. Code keeps it
   honest: known eligible ids, $500 steps, capped by availability, scaled down if over the budget.
5. **Score** (decision model, one call for all picks): fit as strong / partial / weak with
   probabilities, and the probability of brand-safety risk. A pick at 60% risk or more is kept out.
6. **Book**: one `create_media_buy` per seller with `idempotency_key = <run>-<seller>`. The seller
   claims the key atomically (Redis `SET NX` via `setJSONIfAbsent`) together with its response; the
   same key returns the stored buy, the same key with a different body is refused
   (`IDEMPOTENCY_CONFLICT`), and the media buy id is derived from the key as a second lock.
7. **Counteroffer**: The Meridian Post answers a list-price order with `input-required` and a counter
   at $44 CPM. Code re-checks it: under the brief's ceiling it is accepted automatically, over it the
   agent tells the seller why, holds that budget and raises an approval card. Approve books the
   package at the counter under its own key and marks the CPM check "Approved"; Decline leaves that
   budget unspent.

Routes:

- `POST /api/demo/apostra/run/` `{ brief, live? }` → NDJSON events (`engine.js` `applyEvent`). The
  preset brief replays recorded model outputs and costs nothing (no key needed); a custom brief is a
  live run, key required, 3 cost units (two LLM calls, one decision call), cached per brief for a day.
- `POST /api/demo/apostra/buy/` `{ action: 'retry' | 'accept_counter', seller, args, record? }` → the
  seller's reply. No model, free, no key; IP rate limit applies.

## Modes

- **Preset (everyone):** the LLM's reading of the brief, its shortlist and the decision model's
  scores were recorded from a live run on 2026-11-18 (`example.js`) and replay; the page labels it
  "Example run". The sellers, every guardrail, the bookings, the retry and the counteroffer run on
  the server each time.
- **Live (private link):** any brief you write. About 3 cents a run.

## Assumptions

- AdCP task names and core field names come from the public docs (docs.adcontextprotocol.org,
  media-buy task reference). The demo calls them "AdCP-style" because the sellers are simulated and
  add two fields of their own.
- One buy per seller, one package per product; the advertiser is a fictional coffee brand.
- Idempotency records live in Redis when the site has it. Serverless instances without it do not
  share memory, so each seller reply also carries its record signed with an HMAC, and a retry sends
  it back; the seller only trusts a record it signed. A real seller keeps this in its own database.

## What I cut

- Real seller agents, auth between agents and A2A transport: the "agent-to-agent messages" are the
  `message` fields of the AdCP replies plus the buyer agent's own notes, shown as a conversation.
- `list_creative_formats` is listed but never called; no creative upload, no `get_media_buy_delivery`,
  no pacing or reporting.
- Re-planning after a declined counter (the budget stays unspent).

## With real data

Point the MCP client at real sales agents through the gateway, keep the guardrails as the buyer's
policy (per advertiser, versioned), store idempotency records and the audit trail in Postgres, and
put the approval card in the buyer's inbox with a timeout. The decision model's thresholds would be
tuned on past buys and escalations.

## Testing

`npm run build`, then `next start -p 3103` and open `/demo/apostra/` (preset plays on load), click
"Retry the call" (same media buy id, "replayed"), then Approve or Decline the counteroffer. With the
key, run a custom brief such as `$80K CTV, US adults 25-54, Dec 1-31, brand-safe, CPM ceiling $45`:
the counter at $44 is inside the ceiling and the agent accepts it on its own.

## Take-down

Delete `src/pages/demo/apostra/`, `src/pages/api/demo/apostra/`, the apostra entry in
`src/demos/keys.json`, `video/films/apostra/` and `public/demo-videos/apostra.mp4`.
