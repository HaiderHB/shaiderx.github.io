import { Button, formatTime } from 'demos/ui';
import { FiMic, FiPlay, FiSquare } from 'react-icons/fi';
import styles from './GreatQuestion.module.css';
import { MAX_ANSWER_SECONDS } from './study';

const PHASES = {
  thinking: { label: 'Moderator thinking', hint: 'Writing the next question' },
  speaking: { label: 'Moderator speaking', hint: 'Tap Answer to cut in' },
  closing: { label: 'Moderator wrapping up', hint: 'The interview ends after this' },
  blocked: { label: 'Reply ready', hint: 'Your browser paused the audio' },
  ready: { label: 'Your turn', hint: 'Tap Answer and speak. A short pause sends it.' },
  listening: { label: 'Listening', hint: 'Pause or tap Done to send' },
  transcribing: { label: 'Transcribing', hint: 'Fish Audio speech-to-text' },
};

/** Bottom bar of a voice interview: what is happening now, the mic meter, and the one action. */
export function VoiceDock({ phase, onAnswer, onDone, onPlay, meterRef, clockRef }) {
  const info = PHASES[phase] || PHASES.thinking;
  const listening = phase === 'listening';

  return (
    <div className={styles.voiceDock} data-phase={phase}>
      <span
        className={styles.voiceMeter}
        ref={listening ? meterRef : undefined}
        data-mode={
          listening
            ? 'level'
            : phase === 'speaking' || phase === 'closing'
            ? 'speak'
            : 'idle'
        }
        aria-hidden
      >
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className={styles.voiceState} role="status" aria-live="polite">
        <strong>
          {info.label}
          {listening && (
            <span className={styles.voiceClock} ref={clockRef}>
              {formatTime(0)} / {formatTime(MAX_ANSWER_SECONDS)}
            </span>
          )}
        </strong>
        <span>{info.hint}</span>
      </div>

      {listening ? (
        <Button pill className={styles.dockButton} onClick={onDone}>
          <FiSquare aria-hidden /> Done
        </Button>
      ) : phase === 'blocked' ? (
        <Button pill className={styles.dockButton} onClick={onPlay}>
          <FiPlay aria-hidden /> Play reply
        </Button>
      ) : (
        <Button
          pill
          className={styles.dockButton}
          onClick={onAnswer}
          disabled={phase !== 'ready' && phase !== 'speaking'}
        >
          <FiMic aria-hidden /> Answer
        </Button>
      )}
    </div>
  );
}
