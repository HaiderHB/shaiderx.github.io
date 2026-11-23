# Resend demo: an agent that ships an email, safely

Unofficial prototype for a job application (Software Engineer, Developer Tools). Not affiliated with Resend, no
Resend data, no logo. A fictional workspace (Lumen Labs, a small analytics SaaS) with sample audiences. Live at
`/demo/resend/` (unlisted, noindex). **Sandbox: nothing is ever sent.**

## What is on the page

1. **The agent.** One sentence ("Send our beta users a launch email for the new dashboard, with a plain-text
   version, tomorrow 9am ET") goes to an agent that works only through six MCP-style tools. It drafts a React
   Email-style component tree, previews it (desktop / mobile, light / dark client, plain text, JSX source), lints
   it, fixes what the linter flags (each version is kept: v1 → v3), sends a sandbox test to the team's test inbox,
   dry-runs the broadcast, then queues it with an idempotency key for a person to approve. Every `tools/call`
   streams into the call log with its arguments and result.
2. **Safety for agents as users.** A store-backed broadcast endpoint the page calls like an agent would: queue,
   lose the response, retry (same broadcast back, `replayed`), retry without a key (400), reuse the key for a
   different time (409), approve twice (counted once). Free: no model calls, so it works without a key.
3. **Agent UX report.** The same task through the same tool server twice: once with one-line descriptions, bare
   schemas and bare errors, once with the improved wording. Tool calls, errors, retries, tokens and seven outcome
   checks are computed in code from the two runs; the stumbles list shows each error as the agent read it and what
   it said next. Diffs of two `tools/list` entries show what changed.
4. **Call the tools yourself** (in the browser, either wording) and **How it works**.

## How a run works

| Step | Who | What |
| --- | --- | --- |
| Pick tools, write the copy | LLM | OpenAI-style tool calling, up to 14 turns and 26 calls, temperature 0 |
| `create_template` | code | validates the component tree (8 components), keeps every version |
| `render_preview` | code | HTML and plain text from the tree; placeholders filled with a sample contact |
| `lint_email` | code | 9 rules: plain-text part, image alt, unsubscribe (marketing, HTML and text), postal address, links, subject length, preview text, dark-mode contrast (WCAG ratios against a light and a dark client), spam phrases. Errors block sends |
| `send_test` | code | only to the workspace test inbox, only a version linted with 0 errors; lands in the in-page outbox |
| `schedule_broadcast` | code | dry run by default; `dry_run: false` needs an idempotency key, a clean lint, a known audience id and an ISO time with an offset; it only queues, a person approves |
| Report | code | outcome checks (plain text, lint, test of the final version, queued, audience, exact send time for "tomorrow 9am ET" with DST, key) |

`tools.js` is pure and synchronous: the API route, the replay and the in-browser tool panel run the same code. In a
replay the page recomputes every tool result and the sandbox world from the recorded calls.

## Modes

- **Preview (no key):** replays two runs recorded through the live route on 2026-11-21 (`example.js`, written by a
  script, not edited): the hero task with the improved wording (10 tool calls, 0 errors, 1 lint fix, 7/7 checks)
  and with the vague wording (14 calls, 9 errors, stopped at the step budget, 1/7). The safety section is live.
- **Live (private link):** `POST /api/demo/resend/run/` streams one run (40-75 s, about two cents). No new turn
  starts after 95 s, so a slow run (the vague wording) ends with "Stopped at the time budget" inside the route's
  120 s limit. "Run both live" in the report runs both wordings at once (tested: about 3 minutes locally). A repeat of the same task, wording and New York day replays
  from cache, free. `POST /api/demo/resend/broadcast/` is the store-backed endpoint (free, rate-limited).

Env vars: `FAL_API_KEY` (LLM). Optional `DEMO_RESEND_LLM_SLOTS` (default 3), the gate that keeps concurrent LLM calls
under the provider's account cap. Durable idempotency needs the Redis store (`KV_REST_API_URL`, `KV_REST_API_TOKEN`);
without it the claims last per server instance.

## What I assumed

- "Agents as users" means the tool server's descriptions, schemas and error messages are the product's UI for the
  agent, and they can be measured like a UI: steps, errors, retries, tokens, outcome.
- The vague set changes wording only: descriptions, schema detail and the text of errors. The server logic is the
  same, so the report measures wording alone. This is said on the page.
- Compliance rules are not listed in the `create_template` description: the linter checks them and returns the
  exact fix. Short descriptions plus errors that teach is the design under test, and it is why the recorded hero
  run fixes the missing unsubscribe link after the first lint.
- Placeholders follow broadcast conventions: `{{{FIRST_NAME|there}}}` and `{{{RESEND_UNSUBSCRIBE_URL}}}`.
- The dark-mode check models a client that darkens unset backgrounds and keeps colours the template sets; real
  clients vary (some invert everything).

## What I cut

- A real MCP transport: the tools are plain functions with `tools/list`-shaped definitions and MCP-shaped results.
- Real React Email rendering: the tree renders with a small renderer in code; the JSX view shows what the
  template would be in React Email.
- Webhooks, bounces, domains and analytics; multiple languages; image upload (the hero image is drawn in code).
- More than one recorded pair for the report: agents are not deterministic, so a real version would repeat each
  wording several times and show the spread.

## With real data

- Point the six tools at the real API behind an MCP server and keep the checks in code; the idempotency claim is
  already a set-if-absent write, the same shape as an `Idempotency-Key` header.
- Run the UX report as a CI eval on every change to a tool description, with several tasks and trials, and gate
  on outcome checks and errors per task.
- Feed the stumbles list (the error the agent read, the guess it made next) back into the descriptions.

## Files

- `email.js`: component tree, renderer, plain text, JSX, linter. `tools.js`: the tool server, both wordings,
  time zones, idempotency. `agent.js`: prompt, loop, run reducer, outcome checks and the report.
- `panels.js`, `index.page.js`, `Resend.module.css`: the page. `example.js`: recorded runs.
- `src/pages/api/demo/resend/`: `run.api.js` (stream), `live.js` (model calls, cache), `broadcast.api.js`.

## Testing

`npm run build`, then `next start` and open `/demo/resend/?k=<key>` at 1440 and 390 px: run a preset live, press
every safety button, approve the broadcast, run both wordings in the report, call a tool in the panel.

## Take-down

Delete this folder, `src/pages/api/demo/resend/`, `public/demo-videos/resend.mp4`, `video/films/resend/` and the
`resend` entries in `src/demos/keys.json` about 30 days after sending, or when asked.
