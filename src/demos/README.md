# Company demos

Small, unlisted prototypes sent with job applications, live at
`https://haiderb.com/demo/<slug>/?k=<private key>`.

## What a demo should show off

Pick the technology that solves *their* problem best, then make it feel current. Strong options:

| Tech | Good for | How here |
| --- | --- | --- |
| LLM agents | Tool calls, structured output, streaming "agent steps", RAG over sample docs | `chat()` / `chatStream()` in `demos/models`: OpenAI, Anthropic, Gemini (`provider: 'gemini'`) or any OpenAI-compatible API |
| Jev decision models | Judgements code acts on: pick an option, score on a scale, yes/no probability, each with a confidence (lead routing, triage, "which reply/offer/next step", risk flags) | `askJev(state, { id: jevQuestion.choice(...) })`. Cheap and fast (~120 ms, input tokens only). Show the probabilities: that is the wow. Pair with an LLM for anything that writes text |
| Voice | Voice interviews and agents, call triage, voice notes to actions, narration | Fish Audio ASR via `fishTranscribe()` and TTS via `fishSpeak()`. Turn-based loop (record in the browser, one route for ASR → LLM → TTS): see `api/demo/great-question/turn.api.js` |
| Video models | Product videos, ad variants, personalised clips | kie.ai (`kieStartJob()` / `kieJobStatus()`, one API for Veo, Kling and others) or fal.ai (`falStartJob()` / `falJobStatus()`); client `pollJob()`. Pre-render 1–2 examples and show them first |
| Image generation | Mockups, product shots, creatives, style transfer | kie.ai or fal.ai jobs, same pattern as video |

Keys available (Vercel env, mirrored in the gitignored `.env.local`): `OPENAI_API_KEY`,
`GOOGLE_API_KEY`, `JEV_API_KEY`, `FAL_API_KEY`, `FISH_AUDIO_API_KEY`, `KIE_API_KEY`,
`HIGGSFIELD_API_KEY`. Fuller clients for these providers live in the Ad-Base repo
(`lib/jev.ts`, `lib/generate/*`) if a demo needs more than the helpers here.

Other fair game: embeddings/search, OCR/vision, evals dashboards, realtime collaboration.
One wow moment in the first 10 seconds, works on mobile, sample data only.

Look up current model ids and API shapes in the provider docs when you build; nothing here
hardcodes a model.

## Add a demo

1. Slug: company name in lowercase with dashes (`acme`, `blue-guardian`).
2. Copy `src/pages/demo/sample/` to `src/pages/demo/<slug>/` (page files end in `.page.js`).
3. Wrap the page in `<DemoLayout company="Acme" title="…" tagline="…">`.
4. Server code goes in `src/pages/api/demo/<slug>.api.js` or
   `src/pages/api/demo/<slug>/<name>.api.js`, wrapped in `demoApi(handler, { cost })`.
   Call it from the page with `postJson`, `streamFromApi` or `pollJob` from `demos/client`,
   with a trailing slash: `/api/demo/<slug>/`.
5. Mint a private link per recipient: `node scripts/demo-key.js <slug> --label "Founder email"`.
   Commit the updated `src/demos/keys.json` (hashes only) and send the printed link.
6. `npm run build` before pushing. A broken demo blocks the whole site's deploy.

## Abuse prevention (so nobody burns the API credits)

Every paid route goes through `demoApi()`:

1. **Private key per recipient.** A route with a cost refuses calls without a valid,
   unexpired key from `keys.json` (default 45 days). Visitors without one see the page in
   preview mode. Revoke a link by deleting its entry.
2. **Rate limit:** 12 requests a minute per IP (`DEMO_IP_REQUESTS_PER_MINUTE`).
3. **Daily budgets in cost units** (about 1 US cent each, see `COST`):
   60 per IP, 150 per key, 300 per demo, 1,000 across all demos
   (`DEMO_IP_UNITS_PER_DAY`, `DEMO_KEY_UNITS_PER_DAY`, `DEMO_UNITS_PER_DAY`,
   `DEMOS_TOTAL_UNITS_PER_DAY`). Variable work (video length, image count) passes
   `cost: req => …`.
4. **Input caps:** `clampText()` on every user input, `bodyParser.sizeLimit` per route,
   small max tokens, short clips and low resolutions by default.
5. **Cache repeats:** `cached(key, ttl, fn)` from `demos/store` for identical requests.
6. **Kill switch:** `DEMOS_DISABLED=true` in Vercel pauses every paid route at once.
7. **Provider spend caps** on every key (OpenAI project budget, fal.ai and voice provider
   limits). This is the backstop if everything else fails.

Budgets are durable only with Upstash Redis connected to the Vercel project (Marketplace,
free tier; it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`). Without it, limits reset per
serverless instance.

## Rules

- Sample data only. No scraped customer data, nothing behind their login, no logos
  presented as the company's own product. Label stays "unofficial prototype".
- Don't link demos from the portfolio, sitemap or anywhere public.
- Keys live in Vercel env vars, never in code or `NEXT_PUBLIC_*`.
- Take demos down (delete the folder and its keys) about 30 days after sending, or when asked.

Stack note: this site is Next.js 12 (pages router, React 18). Keep demos to plain React,
CSS modules and fetch so they build cleanly here.
