// The row the eval table shows for one finished investigation (from its events).
export function evalRow(scenarioId, events) {
  const summary = events.find(event => event.t === 'summary');
  const findings = events.filter(event => event.t === 'finding');
  const grounded = [...findings.map(finding => finding.grounded), summary?.grounded].filter(Boolean);
  return {
    scenario: scenarioId,
    result: summary?.grade.result || 'wrong',
    queries: summary?.totals.queries ?? 0,
    ms: summary?.totals.ms ?? 0,
    llmCalls: summary?.totals.llmCalls ?? 0,
    explained: summary?.proof.explained_pct ?? 0,
    confidence: summary?.confidence ?? null,
    answer: summary ? { service: summary.answer.service, culprit: summary.answer.culprit } : null,
    figures: grounded.reduce((sum, item) => sum + item.checked, 0),
    untraced: grounded.reduce((sum, item) => sum + item.missing.length, 0),
  };
}
