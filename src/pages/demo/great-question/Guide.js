import { FiCheck, FiX } from 'react-icons/fi';
import { Badges } from './Badges';
import styles from './GreatQuestion.module.css';
import { EXAMPLE_CHECKS, GOALS, GUIDE, STUDY } from './study';

const goalLabel = id => GOALS.find(goal => goal.id === id)?.label;

/** The discussion guide, with live progress (covered / current question) from Jev. */
export function Guide({ covered, current }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <span className={styles.eyebrow}>
            <span className={styles.step}>1</span> Discussion guide
          </span>
          <h2 className={styles.h2}>{STUDY.title}</h2>
        </div>
      </div>
      <p className={styles.meta}>
        {STUDY.participant} · {STUDY.length} · sample study
      </p>

      <h3 className={styles.h3}>Research goals</h3>
      <ul className={styles.goals}>
        {GOALS.map(goal => (
          <li key={goal.id}>
            <span className={styles.goalTag}>{goal.id}</span>
            <span>
              <strong>{goal.label}.</strong> {goal.text}
            </span>
          </li>
        ))}
      </ul>

      <h3 className={styles.h3}>Questions</h3>
      <ol className={styles.questions}>
        {GUIDE.map(q => {
          const state =
            current === q.id ? 'current' : covered.has(q.id) ? 'covered' : 'todo';
          return (
            <li key={q.id} className={styles.question} data-state={state}>
              <span className={styles.questionId}>
                {state === 'covered' ? <FiCheck aria-label="Covered" /> : q.id}
              </span>
              <div>
                <p className={styles.questionText}>{q.text}</p>
                <p className={styles.probe}>
                  <span>
                    {q.goal} {goalLabel(q.goal)}
                  </span>{' '}
                  · Probe: {q.probe}
                </p>
              </div>
              {state === 'current' && <span className={styles.nowPill}>Now</span>}
            </li>
          );
        })}
      </ol>

      <div className={styles.exampleCheck}>
        <h3 className={styles.h3}>Guardrail, example check</h3>
        <p className={styles.small}>
          Example scores. In a live interview, every moderator turn gets one Jev call that
          returns these probabilities.
        </p>
        {EXAMPLE_CHECKS.map(item => (
          <div key={item.text} className={styles.exampleItem} data-verdict={item.verdict}>
            <span
              className={styles.verdict}
              aria-label={item.verdict === 'bad' ? 'Flagged' : 'Passes'}
            >
              {item.verdict === 'bad' ? <FiX /> : <FiCheck />}
            </span>
            <div>
              <p className={styles.exampleText}>“{item.text}”</p>
              <Badges check={item.check} showMeta={false} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
