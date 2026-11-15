import { Meter, Tag, formatTime } from 'demos/ui';
import { FiCornerUpRight } from 'react-icons/fi';
import styles from './GreatQuestion.module.css';
import { GOALS } from './study';

const goalName = id => {
  const goal = GOALS.find(item => item.id === id);
  return goal ? `${goal.id} · ${goal.label}` : 'Other';
};

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Counts over the findings: how many, how many quotes back them, and the spread by goal. */
export function FindingsSummary({ findings }) {
  const quotes = findings.reduce((sum, finding) => sum + finding.quotes.length, 0);
  const turns = new Set(
    findings.flatMap(finding => finding.quotes.map(quote => quote.turn))
  ).size;
  const perGoal = GOALS.map(goal => ({
    ...goal,
    count: findings.filter(finding => finding.goal === goal.id).length,
  }));

  return (
    <div className={styles.findingsSummary}>
      <dl className={styles.summaryStats}>
        <div>
          <dd>{findings.length}</dd>
          <dt>{findings.length === 1 ? 'finding' : 'findings'}</dt>
        </div>
        <div>
          <dd>{quotes}</dd>
          <dt>{quotes === 1 ? 'verbatim quote' : 'verbatim quotes'}</dt>
        </div>
        <div>
          <dd>{turns}</dd>
          <dt>{turns === 1 ? 'turn quoted' : 'turns quoted'}</dt>
        </div>
      </dl>
      <ul className={styles.goalSpread} aria-label="Findings by research goal">
        {perGoal.map(goal => (
          <li key={goal.id}>
            <span className={styles.goalSpreadLabel}>
              <Tag soft>{goal.id}</Tag>
              {goal.label}
            </span>
            <Meter
              size="s"
              value={findings.length ? goal.count / findings.length : 0}
              segments={Math.max(findings.length, 1)}
              label={`${plural(goal.count, 'finding')} for ${goal.label}`}
            />
            <span className={styles.goalSpreadCount}>{goal.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Findings as cards; each quote links back to its turn in the transcript. */
export function FindingCards({ findings, onQuote }) {
  return (
    <div className={styles.findings}>
      {findings.map(finding => (
        <article key={finding.id} className={styles.finding}>
          <div className={styles.findingHead}>
            <span className={styles.findingId}>{finding.id}</span>
            <Tag soft>{goalName(finding.goal)}</Tag>
            <span className={styles.findingCount}>
              {plural(finding.quotes.length, 'quote')}
            </span>
          </div>
          <h3 className={styles.findingTitle}>{finding.title}</h3>
          <p className={styles.findingInsight}>{finding.insight}</p>
          <div className={styles.quotes}>
            {finding.quotes.map(quote => (
              <blockquote key={quote.id} className={styles.quote}>
                <p>“{quote.text}”</p>
                <button
                  type="button"
                  className={styles.quoteRef}
                  onClick={() => onQuote(quote.turn)}
                  title="Show this turn in the transcript"
                >
                  {formatTime(quote.t)} · {quote.turn}
                  <FiCornerUpRight aria-hidden />
                </button>
              </blockquote>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
