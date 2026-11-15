import { Tag, formatTime } from 'demos/ui';
import styles from './GreatQuestion.module.css';
import { GOALS } from './study';

const goalName = id => {
  const goal = GOALS.find(item => item.id === id);
  return goal ? `${goal.id} · ${goal.label}` : 'Other';
};

/** Findings as cards; each quote links back to its turn in the transcript. */
export function FindingCards({ findings, onQuote }) {
  return (
    <div className={styles.findings}>
      {findings.map(finding => (
        <article key={finding.id} className={styles.finding}>
          <div className={styles.findingHead}>
            <Tag soft>{goalName(finding.goal)}</Tag>
            <span className={styles.findingId}>{finding.id}</span>
          </div>
          <h3 className={styles.findingTitle}>{finding.title}</h3>
          <p className={styles.findingInsight}>{finding.insight}</p>
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
              </button>
            </blockquote>
          ))}
        </article>
      ))}
    </div>
  );
}
