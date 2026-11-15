import { Caret, TypingDots, formatTime, seconds } from 'demos/ui';
import { useEffect, useRef } from 'react';
import { FiUser } from 'react-icons/fi';
import { Badges } from './Badges';
import styles from './GreatQuestion.module.css';

/**
 * Live transcript as a conversation: moderator turns on the left, participant turns on the
 * right, each with its timestamp; moderator turns carry their guardrail badges and, for
 * voice replies, how long each step of the turn took.
 */
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
    <div className={styles.transcriptWrap}>
      <ol
        className={styles.transcript}
        ref={listRef}
        onScroll={onScroll}
        aria-live="polite"
      >
        {!turns.length && <li className={styles.transcriptEmpty}>{empty}</li>}
        {turns.map(turn => {
          const waiting = !turn.final && !turn.text;
          const moderator = turn.role === 'moderator';
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
              <span className={styles.avatar} aria-hidden>
                {moderator ? 'AI' : <FiUser />}
              </span>
              <div className={styles.turnBody}>
                <div className={styles.turnMeta}>
                  <span className={styles.speaker}>
                    {moderator ? 'AI moderator' : 'Participant'}
                  </span>
                  <span className={styles.time}>{formatTime(turn.t)}</span>
                  {turn.label && <span className={styles.turnLabel}>{turn.label}</span>}
                </div>
                <p className={styles.turnText} data-failed={turn.failed || undefined}>
                  {waiting ? (
                    <TypingDots label={moderator ? 'Thinking' : 'Transcribing'} />
                  ) : (
                    turn.text
                  )}
                  {!turn.final && turn.text && <Caret />}
                </p>
                {turn.timing && (
                  <p className={styles.turnTiming}>
                    <span>Fish ASR {seconds(turn.timing.asr)}</span>
                    <span>DeepSeek {seconds(turn.timing.llm)}</span>
                    <span>
                      Fish TTS{' '}
                      {turn.timing.tts < 60 ? 'cached' : seconds(turn.timing.tts)}
                    </span>
                  </p>
                )}
                {moderator && <Badges check={turn.check} />}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
