import { BadgeMeta, BadgeRow, ScoreBadge, percent, riskTone } from 'demos/ui';

/** The three risk scores on every moderator turn: [key, label, what it means]. */
export const CHECKS = [
  ['leading', 'Leading', 'Suggests an answer, assumes a feeling, or invites agreement'],
  ['doubleBarreled', 'Double-barreled', 'Asks about two things at once'],
  [
    'offGuide',
    'Off-guide',
    'Neither a guide question nor a follow-up on the last answer',
  ],
];

function positionLabel(position) {
  if (!position?.choice) return null;
  if (position.choice === 'wrapup') return 'Wrap-up';
  if (position.choice === 'other') return 'No guide match';
  return `On ${position.choice}`;
}

/** Guardrail badges for one moderator turn: Jev's probabilities, colored by risk. */
export function Badges({ check, showMeta = true }) {
  if (!check) return null;

  if (check.pending) {
    return (
      <BadgeRow aria-live="polite">
        <ScoreBadge variant="pending">Checking with Jev…</ScoreBadge>
      </BadgeRow>
    );
  }

  if (check.error) {
    return (
      <BadgeRow>
        <ScoreBadge variant="muted">Guardrail skipped ({check.error})</ScoreBadge>
      </BadgeRow>
    );
  }

  const position = positionLabel(check.position);

  return (
    <BadgeRow>
      {CHECKS.map(([key, label, help]) => (
        <ScoreBadge
          key={key}
          label={label}
          value={percent(check[key])}
          tone={riskTone(check[key])}
          title={`${label}: ${help}. Probability from Jev.`}
        />
      ))}
      {position && (
        <ScoreBadge
          variant="neutral"
          label={position}
          value={percent(check.position.p)}
          title="Which part of the discussion guide this turn covers, per Jev"
        />
      )}
      {showMeta && (
        <BadgeMeta>
          Jev{check.ms ? ` · ${check.ms} ms` : check.cached ? ' · cached' : ''}
        </BadgeMeta>
      )}
    </BadgeRow>
  );
}
