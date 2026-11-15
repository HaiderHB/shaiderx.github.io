# Review: AssemblyAI launch film v3

## What changed from v2 (45.95 s silent -> 53.0 s text-first with a music bed)
- Haider's new direction: no voice of any kind; the caption band carries everything in a product-demo
  format (kit 1.1 v2 cues: step kicker, one headline, optional detail, a 6-step progress stepper) over one
  instrumental bed (bright-pluck-112, -20 LUFS). Annotations (ring + <= 6-word label) point at the proof.
- No "If I join / First 30 days" card, and the page's own "What I'd do in the first 30 days" section is
  never on screen (the closest frames stop at the eval box in section 04; the site bar with its
  "First 30 days" nav link is kept out of every frame).
- All footage re-recorded on the demo UI revamp (d0c6407): new hero verdict card (cold open), the
  checker's split-bar tally, the green 14-pass bar, the section heads, the -1/+1 README card.
- New beats: the task prompt itself (step 1); the reference fix's 14-pass tally against "Was 3 fail,
  5 warn"; the gaps section head ("Checked 13 Nov 2026 · 8 verified gaps"). Kept: L9 SyntaxError, L43-44
  Terminate, one live Explain run, MCP tools, README fix. Dropped: next steps.

## QA (kit 1.1 qa.mjs)
- `qa.mjs --video renders/assemblyai-launch-v3.mp4`: PASS, 0 fail, 1 warn. 53.00 s, first product frame
  0.00 s, cold open 2.5 s (5-word headline), end card 3.0 s, 10 v2 cues each on screen >= its reading
  time, 7 annotations, 1 speed change (6x) labelled, H.264 1920x1080 30 fps + AAC, 13.2 MB, -20.0 LUFS
  integrated, true peak -6.3 dBTP, fade-in (first 30 ms -48.7 dB) and fade-out on the last frame
  (-92.5 dB). Exactly one music bed, no other audio.
- Kept warning: the "Was 3 fail, 5 warn" label sits over the results list's group header (no whitespace
  beside the tally at that zoom; it covers "Keys and tokens 6", nothing that changes meaning).
- `hyperframes check`: 0 errors; kept lint warnings nested_media_start_basis_ambiguous (starts are
  composition-local) and timeline_track_too_dense (one captions host by design).
- `edges.mjs`: 1 advisory hit, the cold open's h1 box (its text ends left of the frame edge; nothing
  visible is sliced).
- Looked at: renders/qa/contact-sheet.jpg and framing-sheet.jpg (from the render), and full frames of the
  MP4 at 1.2, 4.5, 10.5, 13.8, 18.8, 22.0, 28.5/28.6, 33.0, 38.5, 42.0, 47.5, 51.8 s.

## Framing notes
- Frame edges sit in whitespace: the task shot (2.79x) puts its top edge between the page title and the
  tagline and its right edge just before the verdict card, with the stat tiles under the band; the
  Run-again shot (2.18x) puts its left edge in the gap between the code and results panes so the label
  sits in the page margin; checker/fix shots put the top edge between the site bar and the sample chips
  or between the chips and the panes; the README shot's top edge is in the 16 px gap above the card.
- The cold open is left-aligned on the verdict card (2.0x): centring it would slice the hero tagline at
  the left edge. The right third of that frame is the page's dark margin, where the pointer enters.
- Explain: the wait is framed on the panel with a ring + dim on the button ("Explaining…"); the gaps
  section below it shows dimmed. The reply is framed on the panel head + the three failures (1.54x).
- An annotation on the L9 finding was replaced by a ring + dim: its label (forced below the finding)
  covered the start of the next sentence and left "...documented GET endpoint" readable, the opposite
  of what the model wrote.

## Honesty
- Explain and fix: ONE live, uncached run (DeepSeek V3.2 via fal) on First try on a fresh `next start`
  (in-memory cache empty), labelled "Live run · uncached"; the 13.2 s model wait is shown at 6x (tagged
  "6x"). The server streams the finished answer at 8 ms/word after the call; the film does not claim
  token streaming. Full reply in capture/explain-reply.txt, read in full. The three failures shown are
  correct. One warning finding (L8, "Token minted on the documented endpoint") calls GET /v3/token
  "undocumented" although the system prompt says not to; it is visible only dimmed under the L9 ring for
  ~2 s and is not captioned. Fix lines are canonical per check (b99700c onwards), so "Fix lines are
  reviewed" is true.
- First try: "First try assembled by hand from AssemblyAI's own snippets" (the demo README: no agent was
  run); the page's own label "The agent's first try" is visible in the cold open.
- Reference fix: "Rule checks only, not run live yet" (no real AssemblyAI session was opened).
- Proposals: the kicker reads "Proposed, not shipped" (also the page's own section kicker). The eval box
  below the README card shows dimmed with its "Design only. No results yet." badge.
- Jump cuts over page scrolls only (task -> checker, reference fix -> gaps, tools -> README fix). No held
  frames, no stills. Sound: one instrumental bed; no voice, no avatar, no AssemblyAI logo.

## Weakest shots
- The cold open's card sits left of centre (see framing notes).
- The task prompt at 2.79x is soft (upscaled 1080p screen capture); it reads clearly but is not crisp.
- The Explain findings at 1.54x are ~23 px text: fine on a laptop, small on a phone; the captions carry
  the point.
