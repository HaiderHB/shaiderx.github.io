# SPEC: {{COMPANY}} launch film (kit 1.1)

GOAL:    A hiring manager at {{COMPANY}} watches ~50 s with the sound off or on and leaves knowing <the one
         thing>. On-screen text carries everything (no voice); a light instrumental bed sits under it.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Music: one kit/music bed at -20 LUFS
         integrated (QA -22..-18), true peak <= -1 dBTP, fade in 0.3 s, fade out 1.5 s on the last frame.
TIME:    target 45-55 s, hard cap 60 s (QA fails >= 60 s).

RETENTION (QA-checked)
  - Product footage on screen and moving by 2.0 s (cold-open block, headline over footage).
  - No standalone problem/title card longer than 2 s; fold the why into the headline or a caption.
  - No next-steps card ("a demo shows skill, not plans"). End card <= 3 s: name · haiderb.com
    (a closing question is optional).

TEXT (QA-checked; the band carries the story in a product-demo format)
  - One v2 cue at a time: kicker = the step ("Step 2 · Check"), ONE headline <= ~10 words on one line
    (58 px), optional detail <= ~14 words on one line; data-kit-step lights the progress stepper.
  - Each cue on screen >= 0.6 s + 0.35 s per word (head + detail + chips). 8 + 6 words = 5.5 s.
  - At most one annotation (ring + <= 6-word label) beside the caption, inside one camera hold.

LOOK:    kit/tokens.css. Ground = the demo canvas #0a0a0f, Inter, ink #f2f1f9, ONE accent = the demo page's
         accent (data-kit-accent: iris / cobalt / coral). No glow/gradients/glass, no {{COMPANY}} logo.
         Real UI only, captured with kit/scripts/capture.cjs.
FRAMING: every camera keyframe shows its whole component above the caption band (Kit.camera.fit,
         QA framing check). A deliberate crop is "partial": true with a reason in the shot data.
         Run kit/scripts/edges.mjs so frame edges fall in whitespace.
HONESTY: footage is the real demo. Every speed change carries a .kit-speed tag ("2.5x"). Cached
         replays, example runs and simulated participants carry a .kit-chip or a detail line.
         No avatar, no voice of any kind (no narrator, no clone, no TTS), music bed only.

SHOTS (fill in: time, scene, focus component, kicker / headline / detail, annotation)
  0.0-2.2   cold open: <clip/component>, headline "<= 4 words"
  2.2-...   ...
  ...       end card: Haider Bokhari · haiderb.com
