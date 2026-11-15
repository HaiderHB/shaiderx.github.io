import { Card, CardHead, CardTitle, Pill, Sparkline, percent, riskTone } from 'demos/ui';
import { CHECKS } from './Badges';
import styles from './GreatQuestion.module.css';

const WARN_AT = 0.3; // riskTone's default warn threshold, drawn on every plot

/**
 * The guardrail over time: one small plot per risk score, across the moderator turns
 * Jev has scored so far. Same 0–100% scale on all three, so they compare at a glance.
 */
export function GuardrailTrace({ turns, sourceLabel }) {
  const scored = turns.filter(
    turn => turn.role === 'moderator' && turn.check && turn.check.leading != null
  );
  const timings = scored.map(turn => turn.check.ms).filter(Boolean);
  const averageMs = timings.length
    ? Math.round(timings.reduce((sum, ms) => sum + ms, 0) / timings.length)
    : null;

  return (
    <Card className={styles.trace}>
      <CardHead aside={averageMs != null && <Pill>Jev · avg {averageMs} ms</Pill>}>
        <CardTitle size="s">Wording risk, turn by turn</CardTitle>
      </CardHead>
      <p className={styles.small}>
        {scored.length} moderator turn{scored.length === 1 ? '' : 's'} scored in{' '}
        {sourceLabel}. Each line is one score across those turns.
      </p>
      <div className={styles.traceGrid}>
        {CHECKS.map(([key, label, help]) => {
          const values = scored.map(turn => turn.check[key] ?? 0);
          const peak = values.length ? Math.max(...values) : null;
          const peakTurn = peak == null ? null : scored[values.indexOf(peak)];
          const tone = riskTone(peak);
          return (
            <div key={key} className={styles.tracePlot} title={`${label}: ${help}.`}>
              <div className={styles.traceLabel}>
                <span>{label}</span>
                <strong data-tone={tone}>{percent(peak)}</strong>
                <em>
                  {peak == null
                    ? 'no turns scored yet'
                    : `peak${peakTurn?.label ? ` at ${peakTurn.label}` : ''}`}
                </em>
              </div>
              {values.length > 1 ? (
                <Sparkline
                  values={values}
                  min={0}
                  max={1}
                  threshold={WARN_AT}
                  tone={tone === 'muted' ? 'ink' : tone}
                  height={44}
                  label={`${label} probability across ${
                    values.length
                  } moderator turns, peak ${percent(peak)}`}
                />
              ) : (
                <span className={styles.traceEmpty} aria-hidden />
              )}
            </div>
          );
        })}
      </div>
      <p className={styles.traceLegend}>
        <i aria-hidden /> Dashed line: {Math.round(WARN_AT * 100)}%, where a score turns
        amber. Plots run 0–100%.
      </p>
    </Card>
  );
}
