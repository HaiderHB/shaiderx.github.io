import { useEffect, useRef } from 'react';
import { Badges } from './Badges';
import styles from './GreatQuestion.module.css';
import { formatTime } from './study';

/** Live transcript: moderator and participant turns with timestamps and guardrail badges. */
export function Transcript({ turns, highlight, empty, follow }) {
  const listRef = useRef(null);
  const stickRef = useRef(true);

  // A recorded transcript reads from the top; a live one follows the newest turn.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    stickRef.current = true;
    list.scrollTop = follow ? list.scrollHeight : 0;
  }, [follow]);

  // Follow new text while the reader is at the bottom; leave them alone if they scrolled up.
  useEffect(() => {
    const list = listRef.current;
    if (list && follow && stickRef.current) list.scrollTop = list.scrollHeight;
  }, [turns, follow]);

  useEffect(() => {
    if (!highlight) return;
    const list = listRef.current;
    const item = list?.querySelector(`[data-label="${highlight.label}"]`);
    if (!list || !item) return;
    list.scrollTo({ top: item.offsetTop - 16, behavior: 'smooth' });
  }, [highlight]);

  const onScroll = () => {
    const list = listRef.current;
    if (list)
      stickRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
  };

  return (
    <ol
      className={styles.transcript}
      ref={listRef}
      onScroll={onScroll}
      aria-live="polite"
    >
      {!turns.length && <li className={styles.transcriptEmpty}>{empty}</li>}
      {turns.map(turn => {
        const waiting = !turn.final && !turn.text;
        return (
          <li
            key={turn.id}
            className={styles.turn}
            data-role={turn.role}
            data-label={turn.label}
            data-flash={
              highlight && turn.label && highlight.label === turn.label
                ? highlight.n % 2
                : undefined
            }
          >
            <div className={styles.turnMeta}>
              <span className={styles.time}>{formatTime(turn.t)}</span>
              {turn.label && <span className={styles.turnLabel}>{turn.label}</span>}
            </div>
            <div className={styles.turnBody}>
              <span className={styles.speaker}>
                {turn.role === 'moderator' ? 'AI moderator' : 'Participant'}
              </span>
              <p className={styles.turnText} data-failed={turn.failed || undefined}>
                {waiting ? (
                  <span
                    className={styles.typing}
                    aria-label={turn.role === 'participant' ? 'Transcribing' : 'Thinking'}
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  turn.text
                )}
                {!turn.final && turn.text && (
                  <span className={styles.caret} aria-hidden />
                )}
              </p>
              {turn.role === 'moderator' && <Badges check={turn.check} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
