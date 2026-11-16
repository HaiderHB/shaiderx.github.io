# SPEC: GoodTime launch film (kit 1.1.1)

GOAL:    A hiring manager at GoodTime watches ~45 s, sound on or off, and leaves knowing Haider built a working
         slice of what Cori does: an interviewer drops out, an agent reads the message with an LLM tool call,
         deterministic tools check every replacement (calendars, working hours per time zone, load caps, notice),
         Jev picks the repair with probabilities under a rules floor, the calendar updates, and a multi-turn
         candidate chat replans on the same state, with drafts per channel and an audit trail.
OUTPUT:  HyperFrames 1920x1080, 30 fps, H.264 + AAC, < 20 MB. Music: kit bed bright-pluck-112, aligned so its own
         ending lands on the last frame, -20 LUFS integrated (QA -22..-18), fades 0.3 / 1.5 s.
TIME:    44.65 s (target 45-55, cap < 60; QA warns at 44.65). Real product from frame 0.
LOOK:    kit 1.1 palette = the demo UI: ground #0a0a0f, ink #f2f1f9, accent cobalt #6896ff (data-kit-accent="cobalt",
         the page's DemoLayout accent). Text-first band: kicker = step, one headline, optional detail, 6-step stepper.

FOOTAGE: two takes recorded 2026-11-16 with kit/scripts/capture.cjs (DOM boxes) from an isolated
         `next build && next start -p 3171` copy, in preview mode (no key, no live calls):
         top    the hero during a Replay of the example run: the glance card goes "Loop at risk" -> "Loop rescued"
         main   Replay in the run card, the trace, the decision, the candidate chat (the recorded turn plays when the
                chat scrolls into view), the drafted messages, the audit trail
         hook   cut of top 3.6-6.0 s
         The example run's model outputs (DeepSeek's report_dropout and reschedule_interview tool calls, Jev's answer,
         the drafted text) were recorded from live runs on the Vercel preview the same day; every tool call, check,
         hold and calendar change is computed in the browser by the same code the API runs.

SHOTS (film s; scene; focus; kicker / headline / detail; annotation)
  0.00-2.40   coldopen  glance card (hook), "Loop at risk" flips to "Loop rescued"
                        PROTOTYPE FOR GOODTIME · HAIDER BOKHARI / "Interviewer out. Loop *rescued*."
  2.40-6.40   rescue    message card + calendar strip + run head; Replay clicked at 4.74
                        STEP 1 · DROPOUT [Example run] / "An interviewer calls in *sick*" / "DeepSeek reads it as a tool call."
  6.40-8.80   rescue    calendar strip zoom 1.75: Priya's block turns red; annotation "Dropped: out sick"
  8.80-13.60  rescue    the run trace (report_dropout ... holdSlot); annotation "Only Wei passes every rule"
                        STEP 2 · CHECK / "Tools check every *replacement* against the rules" / "Calendars, hours, load caps, notice."
  13.60-20.35 rescue    Jev's bars (swap 65%, move one 19%, move loop 16%), the options, beside the calendar (Wei held)
                        STEP 3 · DECIDE / "Jev picks the repair with *probabilities*" / "Wei swaps in at the same time; rules can only escalate."
  20.35-29.55 chat      the chat beside the calendar: request, reply, coding and manager move to Thursday;
                        annotation "Manager moved to stay last"
                        STEP 4 · CHAT / "The candidate asks for Thursday *afternoon*" / "Same state: it replans on top of the swap."
                        STEP 4 · CHAT / "Manager round follows so it stays *last*"
  29.55-35.55 chat      drafted messages beside the calendar
                        STEP 5 · DRAFTS / "Everyone's message drafted on their *channel*" / "Nothing is sent: holds stay tentative until accepted."
  35.55-41.65 chat      audit trail
                        STEP 6 · AUDIT / "Every action lands in the *audit trail*" / "Override the repair or undo any change."
  41.65-44.65 endcard   Haider Bokhari · haiderb.com (no question)

HONESTY: no speed changes. The first cue carries an "Example run" chip; the page itself labels the run "Example run"
         and says the model outputs were recorded live. Jump cuts skip page scrolls only. The opening shot frames the
         message card with a measured box (that take did not track the card; the kit warns). No voice of any kind; the
         only sound is the instrumental bed. No avatar, no GoodTime logo.
