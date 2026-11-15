import styles from './GreatQuestion.module.css';

const CHECKS = [
  ['leading', 'Leading', 'Suggests an answer, assumes a feeling, or invites agreement'],
  ['doubleBarreled', 'Double-barreled', 'Asks about two things at once'],
  [
    'offGuide',
    'Off-guide',
    'Neither a guide question nor a follow-up on the last answer',
  ],
];

const percent = p => (p == null ? '–' : p < 0.01 ? '<1%' : `${Math.round(p * 100)}%`);
const tone = p => (p == null ? 'muted' : p >= 0.6 ? 'bad' : p >= 0.3 ? 'warn' : 'ok');

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
      <div className={styles.badges} aria-live="polite">
        <span className={styles.badgePending}>Checking with Jev…</span>
      </div>
    );
  }

  if (check.error) {
    return (
      <div className={styles.badges}>
        <span className={styles.badgeMuted}>Guardrail skipped ({check.error})</span>
      </div>
    );
  }

  const position = positionLabel(check.position);

  return (
    <div className={styles.badges}>
      {CHECKS.map(([key, label, help]) => (
        <span
          key={key}
          className={styles.badge}
          data-tone={tone(check[key])}
          title={`${label}: ${help}. Probability from Jev.`}
        >
          {label} <strong>{percent(check[key])}</strong>
        </span>
      ))}
      {position && (
        <span
          className={styles.badgeNeutral}
          title="Which part of the discussion guide this turn covers, per Jev"
        >
          {position} <strong>{percent(check.position.p)}</strong>
        </span>
      )}
      {showMeta && (
        <span className={styles.badgeMeta}>
          Jev{check.ms ? ` · ${check.ms} ms` : check.cached ? ' · cached' : ''}
        </span>
      )}
    </div>
  );
}
