# SPEC: GC AI launch film (kit 1.1.1)

GOAL:    A hiring manager at GC AI (the role: Microsoft Office integrations) watches ~45 s, sound on or off, and
         leaves knowing Haider built a working Word-style redlining assistant: a playbook-driven review that
         streams tracked changes into a contract, anchors every edit to the exact words in code (refusing what it
         can't pin down), lets Jev decide each clause and score each edit's fit to its rule, supports accept /
         reject / accept all and a clean view, and exports a real .docx with tracked changes. Text carries
         everything; no voice.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Web encode (CRF ~26, faststart) committed as
         public/demo-videos/gc-ai.mp4. Music: kit bed bright-pluck-112, its own ending on the last frame,
         -20 LUFS integrated, fades 0.3 / 1.5 s.
TIME:    45.23 s. Real product from frame 0.
LOOK:    kit 1.1 palette, accent cobalt #6896ff (data-kit-accent="cobalt", the demo page's DemoLayout accent).
         Text-first band: kicker = step, one headline, optional detail, 7-step stepper.

FOOTAGE: two takes recorded 2026-11-16 with kit/scripts/capture.cjs (DOM boxes) from an isolated
         `next build && next start -p 3167` copy of the branch, with no demo key (preview mode):
         s1     Review with the Customer-side SaaS playbook. In preview mode the page replays its example: the
                exact event stream of a live run on the Vercel preview (DeepSeek V3.2 via fal + Jev, 22.9 s live),
                replayed 2x by the page, which labels it "Example run". Then: select a §11 change, Accept, Accept
                all, No markup, .docx.
         s2     the anchoring section: six checks run by the page's own anchoring code in the browser, one raw edit.
         hook   cut of s1 5.4-7.6 s (redlines landing in §4-§5).
         Live runs: none during capture (the example was recorded earlier on the preview).

SHOTS (film s; scene; focus; kicker / headline / detail; annotation)
  0.00-2.20   coldopen  document pane while redlines land (manual box)
                        PROTOTYPE FOR GC AI · HAIDER BOKHARI / "Redlines, *anchored* in code"
  2.20-5.20   review    task pane: playbook picker, Review clicked (preview notice appears)
                        STEP 1 · PLAYBOOK / "Pick a negotiating *playbook*, then Review"
  5.20-13.20  review    document + task pane: redlines stream in, Jev cards appear
                        STEP 2 · STREAM [Example run] / "Redlines *stream* into the document" / "Recorded live run, replayed 2x."
  13.20-18.75 review    §12 card (rule fit 23%, "Jev doubts this enforces R3") and the refused edits; held frame at media 14.4
                        STEP 3 · ANCHOR / "Each quote must match its clause *exactly once*" / "Otherwise the edit is refused, never guessed."
                        annotation on the refused list: "Refused: document left unchanged"
  18.75-24.30 review    §11 clause and its Jev card (negotiate 92%, rule fit 75% / 80%); held frame at media 19.3
                        STEP 4 · DECIDE / "Jev decides each clause with *probabilities*" / "Plus a rule-fit score for every edit."
                        annotation on the §11 card: "Jev: negotiate at 92%"
  24.30-31.20 review    Accept (§11), Accept all, then No markup: the clean contract
                        STEP 5 · REVIEW / "Accept, reject or *accept all*" / "No markup shows the clean contract."
  31.20-35.73 review    .docx clicked in the task pane footer
                        STEP 6 · EXPORT / "Download a *.docx* with tracked changes" / "Real w:ins and w:del revisions."
  35.73-42.53 checks    anchoring checks (6/6) + one raw edit with its computed anchor; held last frame 0.8 s
                        STEP 7 · CHECKS / "Six anchoring checks run in your *browser*" / "Paraphrases and duplicate quotes are refused."
  42.53-45.23 endcard   Haider Bokhari · haiderb.com

HONESTY: no speed changes in the film (all footage at 1x). The streamed review is the page's example run (a recorded
         live run replayed 2x by the page): "Example run" chip plus the detail line say so, and the page's own pill reads
         "Example run". Two held frames in the review scene (2.35 s at media 14.4, 0.65 s at 19.3) and one 0.8 s held
         last frame in the checks scene. No voice, no avatar.
