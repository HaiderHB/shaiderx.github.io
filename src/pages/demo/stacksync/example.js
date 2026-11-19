// Recorded live runs of the three sample deals (2026-11-18): the LLM's write plan exactly as it
// came back, and the decision model's route with its probabilities. The page replays these so the
// presets are instant; the checks, the field map, the rules floor and the apply run on the same code
// as the API, in the browser (preview) or on the server (with a demo key). Times are the live ones.

export const EXAMPLE_META = { recorded: '2026-11-18' };

export const EXAMPLES = {
  clean: {
    plan: {
      recordType: 'salesOrder',
      externalId: 'hs-deal-18842107',
      entity: '4182',
      subsidiary: '1',
      currency: 'USD',
      trandate: '2026-11-17',
      memo: 'Northwind Cold Storage, 3 new sites',
      items: [
        { line: 1, sku: 'TS-200', item: '1204', quantity: 48, rate: 89, amount: 4272 },
        { line: 2, sku: 'GW-10', item: '1188', quantity: 3, rate: 576, amount: 1728 },
        { line: 3, sku: 'MON-ANN', item: '2050', quantity: 3, rate: 1200, amount: 3600 },
      ],
      total: 9600,
    },
    llmMs: 7671,
    decision: { choice: 'auto', probabilities: { auto: 0.97, approval: 0.03, block: 0 }, confidence: 0.96, ms: 155 },
  },
  risky: {
    plan: {
      recordType: 'salesOrder',
      externalId: 'hs-deal-18842219',
      entity: '5120',
      subsidiary: '1',
      currency: 'USD',
      trandate: '2026-11-18',
      memo: 'Brightline Health, 40-site rollout',
      items: [
        { line: 1, sku: 'TS-200', item: '1204', quantity: 600, rate: 71.2, amount: 42720 },
        { line: 2, sku: 'GW-10', item: '1188', quantity: 40, rate: 512, amount: 20480 },
        { line: 3, sku: 'MON-ANN', item: '2050', quantity: 40, rate: 660, amount: 26400 },
        { line: 4, sku: 'INST-DAY', item: '3011', quantity: 12, rate: 1450, amount: 17400 },
      ],
      total: 107000,
    },
    llmMs: 8761,
    decision: { choice: 'approval', probabilities: { auto: 0, approval: 1, block: 0 }, confidence: 1, ms: 122 },
  },
  broken: {
    plan: {
      recordType: 'salesOrder',
      externalId: 'hs-deal-18842305',
      entity: '4877',
      subsidiary: '2',
      currency: 'EUR',
      trandate: '2026-11-16',
      memo: 'Kestrel Foods, Leeds pilot',
      items: [
        { line: 1, sku: 'TS-200', item: '1204', quantity: 24, rate: 82, amount: 1968 },
        { line: 2, sku: 'TS-300-PRE', item: null, quantity: 6, rate: 120, amount: 720 },
        { line: 3, sku: 'MON-ANN', item: '2050', quantity: 1, rate: 1100, amount: 1100 },
      ],
      total: 3788,
    },
    llmMs: 5828,
    decision: { choice: 'block', probabilities: { auto: 0, approval: 0, block: 1 }, confidence: 1, ms: 126 },
  },
};

/**
 * "Simulate a model slip": what a plan looks like when the LLM gets it subtly wrong (it adds a
 * field the ERP doesn't have and rounds a discounted rate). Code catches both and blocks the write,
 * even though the decision model's answer for the honest plan was "auto-apply".
 */
export function slipped(plan) {
  if (!plan?.items?.length) return plan;
  const rounded = rate => Math.round(rate / 10) * 10 + (rate % 10 === 0 ? 5 : 0);
  const items = plan.items.map((entry, index) =>
    index === 1 ? { ...entry, rate: rounded(entry.rate), amount: entry.quantity * rounded(entry.rate) } : entry
  );
  return { ...plan, items, discountApprovedBy: 'sales manager' };
}
