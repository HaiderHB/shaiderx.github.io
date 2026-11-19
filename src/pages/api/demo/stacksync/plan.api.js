// POST /api/demo/stacksync/plan/  { deal (JSON text) } -> { plan, checks, decision, final, hash, key }
// The live path for a custom deal: the LLM drafts the ERP write plan (JSON mode), code validates it
// against the schema and the ERP tables, the decision model picks the route with probabilities, and
// code has the final say (a failed hard check blocks; a policy flag needs approval). The route is
// stored under the plan's hash so /apply only writes what a run cleared. The same deal is drafted
// once (cached); a repeat costs 1 unit, not 2.
import { COST, clampText, demoApi } from 'demos/api';
import {
  decisionState,
  finalRoute,
  idempotencyKey,
  planHash,
  readDeal,
  validatePlan,
} from 'pages/demo/stacksync/sync';
import { CACHE_SECONDS, cachedPlan, decide, draftPlan, runKey, store, trace } from './server';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

const MAX_DEAL_CHARS = 6000;

const readInput = req => readDeal(clampText(req.body?.deal, MAX_DEAL_CHARS));

export default demoApi(
  async (req, res) => {
    const { deal, facts, error } = readInput(req);
    if (error) return res.status(400).json({ error, code: 'input' });

    const started = Date.now();
    const drafted = await draftPlan(deal, facts);
    const plan = drafted.plan;
    const checks = validatePlan(plan, facts);
    const decision = await decide(decisionState(facts, checks));
    const final = finalRoute(decision.choice, checks);
    const hash = plan ? await planHash(plan) : null;
    if (hash) {
      await store.set(runKey(hash), { dealId: facts.id, decision, final, at: Date.now() }, CACHE_SECONDS);
    }

    trace('plan', {
      deal: facts.id,
      hash,
      cached: drafted.cached,
      llmMs: drafted.llmMs,
      model: decision.choice,
      route: final.route,
      failed: checks.filter(check => check.status === 'fail').map(check => check.id),
      review: checks.filter(check => check.status === 'warn').map(check => check.id),
      ms: Date.now() - started,
    });

    res.status(200).json({
      plan,
      llmMs: drafted.llmMs,
      cached: drafted.cached,
      checks,
      decision,
      final,
      hash,
      key: hash ? idempotencyKey(facts.id, hash) : null,
    });
  },
  {
    cost: async req => {
      const { deal, error } = readInput(req);
      if (error) return COST.free;
      return (await cachedPlan(deal)) ? COST.decision : COST.llm + COST.decision;
    },
    requireKey: true,
  }
);
