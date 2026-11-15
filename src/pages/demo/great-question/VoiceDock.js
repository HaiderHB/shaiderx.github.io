import { Button, Card, formatTime } from 'demos/ui';
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

/**
 * The call surface at the top of the interview card: a voice orb, what is happening now,
 * and the actions. The page's one saturated card.
 * meter: 'rest' (still waveform) | 'idle' (pulsing) | 'speak' (animated) | 'level' (mic level).
 * icon: shown in the orb instead of the waveform (typed interviews).
 */
export function CallStage({
  title,
  hint,
  meter = 'rest',
  icon,
  meterRef,
  phase,
  announce = false,
  children,
}) {
  return (
    <Card tone="accent" className={styles.stage} data-phase={phase}>
      <span className={styles.voiceMeter} ref={meterRef} data-mode={meter} aria-hidden>
        {icon || (
          <>
            <i />
            <i />
            <i />
            <i />
            <i />
          </>
        )}
      </span>
      <div
        className={styles.voiceState}
        role={announce ? 'status' : undefined}
        aria-live={announce ? 'polite' : undefined}
      >
        <strong>{title}</strong>
        <span>{hint}</span>
      </div>
      <div className={styles.stageActions}>{children}</div>
    </Card>
  );
}

/** The call surface during a voice interview: the phase, the mic meter, and the one action. */
export function VoiceDock({
  phase,
  onAnswer,
  onDone,
  onPlay,
  onEnd,
  meterRef,
  clockRef,
}) {
  const info = PHASES[phase] || PHASES.thinking;
  const listening = phase === 'listening';

  return (
    <CallStage
      phase={phase}
      announce
      meterRef={listening ? meterRef : undefined}
      meter={
        listening
          ? 'level'
          : phase === 'speaking' || phase === 'closing'
          ? 'speak'
          : 'idle'
      }
      title={
        <>
          {info.label}
          {listening && (
            <span className={styles.voiceClock} ref={clockRef}>
              {formatTime(0)} / {formatTime(MAX_ANSWER_SECONDS)}
            </span>
          )}
        </>
      }
      hint={info.hint}
    >
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
      <Button variant="secondary" pill onClick={onEnd}>
        <FiSquare aria-hidden /> End interview
      </Button>
    </CallStage>
  );
}
