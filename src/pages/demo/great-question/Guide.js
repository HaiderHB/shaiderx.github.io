import { Card, CardHead, CardTitle, Ring, SectionHead, Tag } from 'demos/ui';
import { FiCheck, FiX } from 'react-icons/fi';
import { Badges } from './Badges';
import styles from './GreatQuestion.module.css';
import { EXAMPLE_CHECKS, GOALS, GUIDE, STUDY } from './study';

const goalLabel = id => GOALS.find(goal => goal.id === id)?.label;

/** The discussion guide, with live progress (covered / current question) from Jev. */
export function Guide({ covered, current }) {
  const coveredCount = GUIDE.filter(q => covered.has(q.id)).length;

  return (
    <Card>
      <SectionHead
        variant="eyebrow"
        compact
        step={1}
        kicker="Discussion guide"
        title={STUDY.title}
      />
      <p className={styles.meta}>
        {STUDY.participant} · {STUDY.length} · sample study
      </p>

      <div className={styles.coverage}>
        <Ring
          value={coveredCount / GUIDE.length}
          size={52}
          stroke={6}
          label={`${coveredCount} of ${GUIDE.length} guide questions covered`}
        >
          {coveredCount}/{GUIDE.length}
        </Ring>
        <p>
          <strong>Guide coverage</strong>
          <span>
            {coveredCount} of {GUIDE.length} questions covered
            {current ? ` · on ${current} now` : ''}
          </span>
        </p>
      </div>

      <h3 className={styles.h3}>Research goals</h3>
      <ul className={styles.goals}>
        {GOALS.map(goal => (
          <li key={goal.id}>
            <Tag soft>{goal.id}</Tag>
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
              <div className={styles.questionBody}>
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
    </Card>
  );
}

/** Two sample questions with their real Jev scores: what one guardrail call returns. */
export function ExampleCheck() {
  return (
    <Card className={styles.exampleCheck}>
      <CardHead>
        <CardTitle size="s">Guardrail, example check</CardTitle>
      </CardHead>
      <p className={styles.small}>
        Real Jev scores for two sample questions. In an interview, every moderator turn
        gets one call like this.
      </p>
      {EXAMPLE_CHECKS.map(item => (
        <div key={item.text} className={styles.exampleItem} data-verdict={item.verdict}>
          <div className={styles.exampleHead}>
            <span
              className={styles.verdict}
              aria-label={item.verdict === 'bad' ? 'Flagged' : 'Passes'}
            >
              {item.verdict === 'bad' ? <FiX /> : <FiCheck />}
            </span>
            <p className={styles.exampleText}>“{item.text}”</p>
          </div>
          <Badges check={item.check} showMeta={false} />
        </div>
      ))}
    </Card>
  );
}
