# AssemblyAI capture notes

All four takes were recorded on 2026-11-15 with `record.cjs` (on `kit/scripts/capture.cjs`), so every
focused component has true DOM boxes. The demo ran locally from the portfolio worktree on port 3170:

    cd /home/claude/demos-all && npx next dev -p 3170          # .env.local there (FAL_API_KEY)
    cd video && DEMO_KEY_FILE=<file holding the demo URL with ?k=...> \
      PLAYWRIGHT_PATH=/opt/npm-tools/node_modules/playwright node films/assemblyai/capture/record.cjs <clip>
    node kit/scripts/build-footage.mjs films/assemblyai        # footage, data/clips, hook (cuts.json)

`record.cjs` swaps the key file's host for localhost:3170 and never prints the key (errors are redacted).

| clip | cost | what | used |
| --- | --- | --- | --- |
| top | free | hero, scroll to the checker, Run again, pointer on L9, click L43 (code scrolls, line flashes) | cold open (`hook` = 0.2-2.7 s), checker 5.0-16.0 s |
| explain | 1 live run | "Explain failures" on First try right after a server restart (in-memory cache empty): click 1.83 s, reply 9.24-12.24 s; text in `raw/explain/reply.txt` | explain 0.55-14.4 s |
| fix | free | Reference fix (click 1.82 s), scroll to the gaps (6.08-7.22 s), pointer on gap 02's evidence | fix 0.9-6.0, 7.2-11.6 s |
| prop | free | section 04 tool cards, scroll (5.1-5.9 s) lifting the README fix to the top, pointer on the + line | prop 0.5-4.9, 6.0-9.8 s |
| probe | free | no recording: prints every tracked box at the clip scroll positions | — |

Code rows (`l1`..`l45`) are tracked with the capture `clip` option: only the part visible in the code
pane is recorded, and rows scrolled out of the pane are `absent`.

Live runs used: 1 (the explain take). The "Explain and fix" server streams the finished, uncached model
answer word by word (8 ms per word) after the model call returns; the 7.2 s wait before it is the call.
