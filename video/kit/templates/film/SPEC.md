# SPEC: {{COMPANY}} launch film

GOAL:    A hiring manager at {{COMPANY}} watches ~50 s muted and leaves knowing <the one thing>.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264, < 20 MB, silent unless the demo's own sound is the point.
TIME:    target 45-55 s, hard cap 60 s (QA fails >= 60 s).

RETENTION (QA-checked)
  - Product footage on screen and moving by 2.0 s (cold-open block, headline over footage).
  - No standalone problem/title card longer than 2 s; fold the why into the headline or a caption.
  - Next steps 3-4.5 s; end card <= 3 s.

LOOK:    kit/tokens.css. Ground #111111, Inter, one cyan accent #00e5ff, no glow/gradients/glass,
         no {{COMPANY}} logo. Real UI only, captured with kit/scripts/capture.cjs.
FRAMING: every camera keyframe shows its whole component above the caption band (Kit.camera.fit,
         QA framing check). A deliberate crop is "partial": true with a reason in the shot data.
HONESTY: footage is the real demo. Every speed change carries a .kit-speed tag ("2.5x"). Cached
         replays, example runs and simulated participants carry a .kit-chip or caption note.
         No avatar, no voice clone, no narrator, no music.

SHOTS (fill in: time, scene, focus component, caption)
  0.0-2.2   cold open: <clip/component>, headline "<...>"
  2.2-...   ...
  ...       next steps
  ...       end card: question + Haider Bokhari · haiderb.com
