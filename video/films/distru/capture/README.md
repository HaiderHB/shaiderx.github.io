# Distru capture notes

The footage is the four live takes recorded on 2026-11-14 (demo commit 46abc99) with the earlier
Playwright CDP recorder (scratchpad rec/record.js), reused for v2: s2, s3, evals, mcp. Marks came with
them. Those takes predate `kit/scripts/capture.cjs`, so they have no DOM boxes; `boxes/` holds the
frame-measured equivalent:

- `boxes/<clip>.spec.json` -> `python3 ../../kit/scripts/measure-boxes.py assets/footage/<clip>.mp4 boxes/<clip>.spec.json --out boxes/<clip>.boxes.json`
  (card boxes, flood mode below the page's sticky header)
- `boxes/compose.py` adds the inner components measured on full-resolution frames, with their media-time
  windows, and writes `boxes/<clip>.final.json`
- `node ../../kit/scripts/build-footage.mjs . --import <clip>=assets/footage/<clip>.mp4 --boxes <clip>=capture/boxes/<clip>.final.json`
- `cuts.json` makes `hook` (s2 1.0-3.1 s) for the cold open; `--still s2@35.45` made the held frame.

A recapture would use capture.cjs with `track` selectors for the same component names (emailCard,
samples, emailText, runButton, trace, extract, check, decision, routeBars, finalRoute, reply, replyBody,
oneQuestion, orderBody, evalsSection, score, toolPanel, args, result, statusLine) and needs up to three
live runs (sample 2, sample 3, and sample 1 inside Run evals); the MCP call is free.
