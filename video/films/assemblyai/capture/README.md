# AssemblyAI capture notes (v3, demo UI revamp)

All four takes were recorded on 2026-11-15 with `record.cjs` (on `kit/scripts/capture.cjs`) against the
revamped demo UI (demos repo at d0c6407, "demo UI revamp"), so every focused or annotated component has
true DOM boxes. The demo ran from a COPY of the repo, never inside `/home/claude/demos-all` (parallel agents
share its `.next`):

    copy the repo without node_modules/.next/video/.git; symlink node_modules from the portfolio worktree;
    copy .env.local (FAL_API_KEY); npx next build && npx next start -p 3170
    cd video && DEMO_KEY_FILE=<file holding the demo URL with ?k=...> \
      PLAYWRIGHT_PATH=/opt/npm-tools/node_modules/playwright node films/assemblyai/capture/record.cjs <clip>
    node kit/scripts/build-footage.mjs films/assemblyai        # footage, data/clips, hook (cuts.json)

`record.cjs` swaps the key file's host for localhost:3170 and never prints the key (errors are redacted).
Record when no other capture or render is running: the CDP screencast drops to ~10 fps on this 2-core box
under load (~25-35 fps during motion when idle). Each take tracks only the components its shots use.

| clip | cost | what | used |
| --- | --- | --- | --- |
| top | free | hero (pointer into the verdict card), task prompt, scroll (6.43-7.55 s) to the checker, Run again (10.11 s), pointer on L9 (13.85 s), click L43 (18.01 s: code pane scrolls, line flashes) | cold open (`hook` = 0-2.5 s), checker 2.5-6.4 and 7.6-21.5 s |
| explain | 1 live run | "Explain failures" on First try on a fresh server (in-memory cache empty): click 1.73 s, first text 15.28 s, done 18.55 s; reply in `explain-reply.txt` | explain 0.6-20.9 s (wait at 6x) |
| fix | free | Reference fix (click 1.77 s) -> 0 fail 0 warn 14 pass, scroll (6.74-7.87 s) to the gaps, pointer on gap 02's evidence | fix 0.6-6.7, 7.95-12.45 s |
| prop | free | section 04 tool cards (pointer beside each name), scroll (5.68-6.61 s) lifting the README fix to y 300, pointer beside the + line | prop 0.4-5.65, 6.7-11.25 s |
| probe | free | no recording: prints every tracked box at the clip scroll positions | — |

Code rows (`l1`..`l45`) and result cards (`failTerminate`, ...) are tracked with the capture `clip` option:
only the part visible in their scroll pane is recorded. The Explain panel has no module class of its own:
`llmPanel` is the parent of `llmHead`; reply findings are `rp0`.. (one `<p>` each: title, what breaks, Fix).

Live runs used: 1 (the explain take; 13.2 s model call, then the server streams the composed answer word by
word at 8 ms/word). Before it, the reply height was measured with a MOCKED reply (Playwright `page.route`,
v2's text), so no extra paid call was made.
