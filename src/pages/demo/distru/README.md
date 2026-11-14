# Distru demo: order email to confirmed order

Unlisted prototype at `/demo/distru/`. A buyer's wholesale order email goes in; an agent
extracts it, checks it against a small sample ERP through the same tools an MCP client would
use, routes it with Jev (visible probabilities), then drafts the sales order and the reply.

## How a run works

| Step | What | Cost |
| --- | --- | --- |
| Extract | LLM in JSON mode: customer, license, delivery date, PO, lines (buyer's words, qty, unit, vague flag) | `COST.llm` |
| Check | Fixed pipeline of deterministic tools: `lookup_account`, `match_products`, `check_inventory`, `propose_substitution` (only for out-of-stock lines), `check_license`, `check_credit` | free |
| Decide | One `askJev` call, two typed questions: `route` (choice: auto_confirm, needs_review, hold) and `substitution_ok` (noul) | `COST.decision` |
| Draft | `draft_sales_order` (tool), then a streamed LLM reply that asks the one question the rules picked | `COST.llm` |

The run route bills `COST.llm * 2 + COST.decision` (3 units). Identical emails on the same day
replay the cached event stream at no cost (the key is still required).

Guardrails: hard rules run in code after Jev. A license that is missing, expired, mismatched or
expiring before delivery, an unknown account, a credit hold or an over-limit order floors the
route at `hold`; vague quantities, uncertain matches, short or out-of-stock lines and missing dates
floor it at `needs_review`. The final route is the stricter of Jev's pick and the floor, so rules
can escalate a route but never relax one. Substitutes ship without asking at `substitution_ok` of
0.8 or more, are pencilled in and confirmed with the buyer at 0.5 to 0.8, and are not offered
below 0.5.

## Files

- `erp.js`: fictional sample data (12 products, 4 accounts) and the tool layer: implementations,
  JSON Schemas, `MCP_TOOLS`, `callTool()`. Shared by the agent, the MCP route and the page.
- `agent.js`: the pipeline (`runOrderAgent` with injected `extract`/`decide`/`draftReply`), prompts,
  Jev questions, rules, the one-question picker, the trace reducer, samples with expectations,
  and the pre-recorded example run.
- `index.page.js`, `ui.js`, `Distru.module.css`: the page.
- `src/pages/api/demo/distru/run.api.js`: `POST /api/demo/distru/run/` streams NDJSON events.
- `src/pages/api/demo/distru/mcp.api.js`: `POST /api/demo/distru/mcp/`, a minimal stateless MCP
  server (`initialize`, `ping`, `tools/list`, `tools/call`; JSON responses, no SSE). Free, since
  it only reads sample data. Tested with the official TypeScript SDK client over Streamable HTTP.

## Modes

- **Preview (no key):** the page replays an example run of sample 2. Only the model outputs
  (extraction, Jev answers, reply text) are canned; every tool call, rule and order line is
  computed live in the browser by the same code the API runs. Live buttons show a preview note.
- **Live (`?k=` key):** runs and evals call the run route. The MCP "call a tool" box always runs
  in the browser for free.

## Env vars

- `FAL_API_KEY` (DeepSeek V3.2 via fal's OpenAI-compatible router), `JEV_API_KEY` (required for live runs)
- `DEMO_LLM_MODEL` (optional, default `deepseek/deepseek-v3.2`)
- `JEV_MODEL`, `FAL_LLM_URL`, `JEV_BASE_URL` (optional overrides, see `demos/models`)

## What I assumed

- California-style retailer licenses checked against the requested delivery date, not just today.
  License numbers use a 90xxxxx range, chosen to be unlikely to match real ones.
- Quantities arrive as cases or units; cases convert by the product's case pack. Vague quantities
  ("a few cases") get the model's estimate and a `needs_review` flag.
- One price tier per account (T1 list, T2 volume, T3 key account), no taxes, fees or discounts.
- Substitutes come from the same category, ranked by brand, price and stock. Whether the buyer
  would accept one is a judgement on their email, so Jev makes it, not a keyword match.

## What I cut

- No writes: `draft_sales_order` drafts only. Nothing is allocated, submitted or reported to
  METRC; package tags are shown as they would be carried onto the manifest.
- The LLM does not choose tools. The pipeline is fixed so runs are cheap, fast and evaluable; the
  same tools are exposed over MCP for clients that do choose.
- No auth on the MCP endpoint, no sessions, no SSE, no resources or prompts. It shares the demo
  rate limit (12 requests a minute per IP), enough for a short client session.
- Three eval cases, graded on final route, license flag and substitution call.

## With real data

- Back the tools with Distru's APIs (inventory by batch and package, customers, price lists,
  credit) and the state track-and-trace system for licenses, keeping the same schemas so the agent,
  MCP clients and evals don't change.
- Product matching: embeddings over SKUs plus the buyer's order history ("the usual" resolves to
  their last order), with confidence still gating auto-confirm.
- Evals from history: replay past order emails against what reps actually did (route, quantities,
  swaps), track per-check accuracy and the auto-confirm false-positive rate, and gate prompt, model
  and threshold changes on them.
- Learn the thresholds per customer: some buyers always accept same-brand swaps; Jev's
  `substitution_ok` plus their history can set that.
- Add the write path behind approval: create the sales order, allocate packages, send the reply
  from the rep's inbox, and log every tool call and decision for audit.

## Testing

Tested end to end with live DeepSeek (via fal) and Jev calls: extraction, tool calls, Jev's
route and substitution answers, the reply and all three evals. The example run shown in preview
mode is a recorded live run of sample 2.
