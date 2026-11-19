// POST /api/demo/cointracker/resume/  { runId, answer: 'upload' | 'none' } -> { resumedAt, form, checks, schedule, ms }
// The human handoff. A run pauses at step 6 (interest and dividends) because the 1099-INT is missing.
// The household answers the request: they upload the sample 1099-INT (the LLM reads it, code checks it)
// or they say "none" (no model call; the CPA gets a flag because last year had interest). The run's
// checkpoint is loaded and the agent continues from the step it stopped at; nothing before it re-runs.
import { COST, clampText, demoApi } from 'demos/api';
import { checkInterest, scheduleB } from 'pages/demo/cointracker/agent';
import { documentText } from 'pages/demo/cointracker/data';
import { CACHE_SECONDS, loadRun, readInterestForm, runFromClient, runKey, store, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

const readAnswer = body => (body?.answer === 'none' ? 'none' : body?.answer === 'upload' ? 'upload' : null);

export default demoApi(
  async (req, res) => {
    const runId = clampText(req.body?.runId, 40);
    const answer = readAnswer(req.body);
    if (!answer) return res.status(400).json({ error: 'Answer with an upload or "none".', code: 'input' });
    const run = (await loadRun(runId)) || runFromClient(req.body?.run);
    if (!run) return res.status(404).json({ error: 'That run has expired. Run the agent again.', code: 'no_run' });
    if (run.resumed) {
      return res.status(200).json({ ...run.resumed, replayed: true });
    }

    const started = Date.now();
    let form = null;
    let checks = [];
    let cached = false;
    if (answer === 'upload') {
      const read = await readInterestForm(documentText('int1099'));
      form = read.form;
      cached = read.cached;
      checks = checkInterest(form);
    }
    const schedule = scheduleB(run.record, form, answer === 'none');
    const resumed = { resumedAt: run.pausedAt || 6, answer, form, checks, schedule, cached, ms: Date.now() - started };
    if (runId !== 'example' && !run.fromClient) await store.set(runKey(runId), { ...run, resumed }, CACHE_SECONDS);
    trace('resume', { runId, answer, resumedAt: resumed.resumedAt, interest: form?.interest ?? null });
    res.status(200).json(resumed);
  },
  { cost: req => (readAnswer(req.body) === 'upload' ? COST.llm : COST.free), requireKey: true }
);
