# Distru capture notes (v3)

All footage is re-recorded on the revamped demo UI ("demo UI revamp", 2026-11-15) with
`kit/scripts/capture.cjs`, so every component has its true DOM box per frame (`raw/<clip>/boxes.json` ->
`data/clips/<clip>.json`). The v2 frame-measured boxes (`capture/boxes/`) are gone.

- Server: an isolated copy of the repo (no `node_modules`, `.next`, `video`; `node_modules` linked from the
  portfolio worktree; `.env.local` copied), `next build && next start -p 3160`. Several agents run demo servers
  on this machine, so never run `next` inside the shared worktree. The run cache is in memory: record s2 and s3
  before `evals` and do not restart the server in between, so samples 2-3 replay from cache in the eval run.
- Private link: pass it as `DEMO_URL` (host swapped for `localhost:3160`); never commit or print it.
- `node films/distru/capture/record.cjs <clip>` for `s2`, `s3`, `evals`, `mcp` (`DRY=1 ... s2` replays the
  page's example instead of a live run, to check selectors and scroll targets for free).
- `capture/cuts.json` makes `hook` (s2 33.3-36.1 s, the page top after the live run).
- `node kit/scripts/build-footage.mjs films/distru --still s2@27.2` made the held frame.

Takes of 2026-11-15: s2 live (12.48 s, $2,352.00), s3 live (Jev Hold 63%), evals (sample 1 live 16.6 s,
samples 2-3 from cache, 9/9), mcp (free). Live runs used: 3.
Note: the pipeline strip is `Timeline_flow__` (fixed in record.cjs after these takes; the takes did not
track it, so the cold open frames the hero with a measured box).
