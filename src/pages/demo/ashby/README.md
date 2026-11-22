# Ashby demo: rediscover the candidate you already met

Unofficial prototype for a job application (Senior Product Engineer, Canada). Not affiliated with Ashby, no Ashby
data, no logo. Live at `/demo/ashby/` (unlisted, noindex). Every person, company, resume and interview note is
invented.

## What is on the page

1. **Rediscover.** Pick one of three job descriptions (Senior Product Engineer, Staff Data Engineer, Founding
   Product Designer) or paste your own. The agent lists the must-haves and nice-to-haves, screens all 92 past
   candidates, reads the best 14 in full and builds a shortlist. Every match cites the exact line it rests on
   (resume or interview note), highlighted in place. Each candidate shows why they were passed on last time, years
   of experience then and now, roles started since, and how likely it is that the old reason still applies. A fast
   decision model gives each one a fit verdict (reach out / maybe / not now) with visible probabilities. The hero
   card shows the best "second look": someone passed on for level or skills whose reason no longer holds.
2. **Why this order.** Switch any requirement between must, nice and off and the shortlist re-ranks at once (code,
   no model call), with movement arrows. "What drove the rank" breaks one candidate's score into requirement points,
   years and the past-concern penalty. "What the models read" shows the redacted profile, exactly as sent. Guardrail
   checks run on the page: a leak scan of all 92 redacted profiles, the ranking re-run with names, schools and
   places shuffled and with every career gap closed (top 10 must be identical, in order), proxy requirements removed
   from the job description, quotes found word for word.
3. **Eval.** For each role I hand-labelled who a recruiter would actually reach out to, by reading every profile.
   Precision@10 and recall@10 for the agent and for a keyword search over the same resumes and notes, computed in
   code. Recorded runs: agent precision@10 0.8 / 0.6 / 0.5 (the maximum possible with 8 / 6 / 5 labels) and recall
   1.0 on all three; keyword search 0.5 / 0.2 / 0.1 precision and 0.63 / 0.33 / 0.20 recall.
4. **Re-engagement note** (in the candidate panel). The LLM drafts a short note that refers back to the last
   conversation; code checks that the part it refers to is in the interview notes word for word, that no
   placeholder is left in, that it is short, and that it mentions pay only if pay was the reason last time.

## How a run works

| Step | Who | What |
| --- | --- | --- |
| Requirements | LLM + code | The LLM lists requirements with the exact words from the job description. Code drops any whose quote is not in the text, drops protected or proxy attributes (school prestige, "digital native", culture fit, no gaps...), and turns "5+ years" into a check computed from role dates. Two of the three sample roles contain a proxy on purpose |
| Screen | LLM | All 92 redacted profiles in three parallel batches; each requirement rated 2 / 1 / 0 / -1. Picks who gets read in full |
| Read in full | LLM + code | The best 14, in batches of 5: the LLM cites a line id and copies the words; code keeps a quote only if it appears verbatim in that line (or re-points it to the line where it does), at most two per requirement |
| Verdicts | decision model | Per candidate: fit (choice of three, with probabilities) and "the old reason still applies" (probability). It reads the checked evidence, years then and now, roles since, pay band and remote flag, nothing personal |
| Rank | code | must ×3, nice ×1; clear evidence 1, some 0.5; evidence against −0.5, or a half-point discount when evidence on both sides, unless the positive evidence is from a role started since; years met +1.5; past concern −2 × probability |

The redacted profile drops the name (and replaces it inside notes), school, employer, location and every date, so no
gap between jobs can show. Interview notes in the sample data are written without gendered pronouns.

## Modes

- **Preview (no key):** the page replays one recorded run of the first role on load; the other two roles show their
  recorded runs instantly; the eval uses all three; the top three candidates of each role have a recorded note. All
  of it came through the real routes on 2026-11-21 (written to `example.js` by a script, not edited by hand).
- **Live (private link):** `POST /api/demo/ashby/run/` streams one run (60-80 s: 7 short LLM calls, 14 decision
  calls; cost set to 4 units). `POST /api/demo/ashby/email/` drafts one note (1 unit). Identical requests replay from
  cache for free. "Run the eval live" re-runs the three roles one after another.

Env vars: `FAL_API_KEY` (LLM), `JEV_API_KEY` (decision model). Optional `DEMO_ASHBY_LLM_SLOTS` (default 3) caps
concurrent LLM calls; 429s retry with backoff.

## What I assumed

- The value of rediscovery is trust: a recruiter will only reach out on a match they can verify in five seconds,
  so every claim points at a line, and the reason a person was passed on is re-examined rather than inherited.
- "Rejected" is a snapshot. Level and skills reasons expire; timing, comp and closed roles often do too. Years of
  experience are computed from role dates (gaps are neither counted nor penalised).
- The ranking should be code a recruiter can push on, not a model's opinion, so models extract and judge and code
  decides the order.
- Fairness has to be testable on the page, not promised in copy.

## What I cut

- Real resumes, parsing and a real ATS: the 92 profiles are hand-written (30) or generated from templates with a
  fixed seed (62).
- Adding a new requirement from the override panel (that needs a model call); overrides re-rank the 14 profiles read
  in full, so someone outside that pool cannot enter the shortlist after an override.
- Experience in the discipline: years count all roles, so a career changer's earlier years still count.
- Multiple trials in the eval: one recorded run per role; the agent is not deterministic, and live runs vary
  (a live run of the first role put two designers at #9 and #10, still 8 of 8 labelled people in the top 10).

## With real data

Embed and pre-filter the pool instead of screening everyone with an LLM, read scorecards as structured fields, label
outreach outcomes (replied, advanced, hired) as the eval set instead of my judgement, run the eval on every prompt
change with several trials, and log every rediscovery with its quotes so a recruiter can audit why someone was
surfaced or not.

## Testing

`npm run build`, then `next start` and open `/demo/ashby/` with and without `?k=`: replay, the three roles, an
override, the three detail tabs, a draft, the live run, at 1440 px and 390 px, in both themes.

## Take-down

Delete `src/pages/demo/ashby/`, `src/pages/api/demo/ashby/`, the `ashby` entries in `src/demos/keys.json`,
`public/demo-videos/ashby.mp4` and `video/films/ashby/`.
