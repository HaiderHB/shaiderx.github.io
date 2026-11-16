# GoodTime capture notes

- Server: an isolated copy of the repo (no `node_modules`, `.next`, `video`, `.git`; `node_modules` linked from the
  worktree), `next build && next start -p 3171`, started and stopped around each capture under the shared lock.
  Several agents share this machine: never run `next` inside the shared worktree.
- Preview mode (no key): the page replays its example run, so recording is free and makes no live calls. The model
  outputs in that example were recorded from live runs on the Vercel preview (2026-11-16).
- `DEMO_URL=http://localhost:3171/demo/goodtime/ node films/goodtime/capture/record.cjs top|main`
- The chat's recorded turn plays when the chat card's top reaches the upper half of the screen, so `main` scrolls to
  it only after the decision hold.
- `capture/cuts.json` makes `hook` (top 3.6-6.0 s: "Loop at risk" flips to "Loop rescued").
- The message card is not tracked (its CSS module class has no rule, so it has no class name); the opening shot
  frames it with a measured box `{871, 92, 709, 383}`.

Takes of 2026-11-16: top (Replay at 0.62 s, at risk 2.17 s, rescued 5.05 s), main (Replay 2.94 s, dropout 4.79 s,
trace 6.0-8.4 s, decision 12.9-19.7 s, chat 20.75 s, reply 22.6 s, drafts 31.1 s, audit 38.3 s). Live calls used: 0.
