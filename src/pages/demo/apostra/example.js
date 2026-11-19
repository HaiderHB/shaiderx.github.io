// Recorded model outputs for the preset brief, from a live run on 2026-11-18 (run_QzPOXAiFACw).
// The run route replays these for the preset so it is instant and free; the sample sellers, the
// guardrails, the idempotent bookings and the counteroffer check still run server-side every time.
// `raw` is what the LLM returned (before the code checks), `ms` the live time it took.
export const EXAMPLE = {
  recorded: '2026-11-18',
  runId: 'run_QzPOXAiFACw',
  brief: {
    ms: 4470,
    raw: {
      budget: 50000,
      channels: ['ctv', 'podcast'],
      audience: { age_min: 25, age_max: 44 },
      flight: { start: '2026-12-01', end: '2026-12-31' },
      cpm_ceiling: 38,
      exclusions: ['gambling'],
      brand_safe: true,
    },
  },
  shortlist: {
    ms: 6100,
    raw: {
      picks: [
        { product_id: 'rl_prime_ctv', budget: 17000, why: 'Guaranteed CTV, premium entertainment context' },
        { product_id: 'hp_top_shows', budget: 15000, why: 'Guaranteed podcast, perfect audience match' },
        { product_id: 'mp_live_ctv', budget: 18000, why: 'Guaranteed CTV, spreads across sellers' },
      ],
      dropped: [
        { product_id: 'rl_fast_channels', why: 'Non-guaranteed, lower priority' },
        { product_id: 'hp_run_of_network', why: 'Non-guaranteed, lower priority' },
      ],
    },
  },
  scores: {
    ms: 122,
    scores: {
      rl_prime_ctv: { fit: { choice: 'partial', probabilities: { strong: 0.21, partial: 0.79, weak: 0 } }, risk: 0.12 },
      hp_top_shows: { fit: { choice: 'strong', probabilities: { strong: 0.97, partial: 0.03, weak: 0 } }, risk: 0.16 },
      mp_live_ctv: { fit: { choice: 'partial', probabilities: { strong: 0.24, partial: 0.75, weak: 0.01 } }, risk: 0.14 },
    },
  },
};
