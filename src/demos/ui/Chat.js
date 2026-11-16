import { useEffect, useRef } from 'react';
import { classes } from 'utils/style';
import styles from './Chat.module.css';
import { Caret, TypingDots } from './States';

const initials = name =>
  String(name || '?')
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * A conversation: one side's bubbles on the left, the other's on the right.
 * messages: [{ id, side: 'start' | 'end', name, avatar (text, default initials), meta, text,
 *   pending (typing dots), streaming (caret), children (under the bubble: chips, a diff) }].
 * follow: keep the newest message in view; empty: shown before the first message;
 * --uiChatHeight caps the height (scrolls inside).
 */
export function ChatThread({ messages, empty, follow = true, label, className }) {
  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    if (list && follow) list.scrollTop = list.scrollHeight;
  }, [messages, follow]);

  return (
    <ol
      ref={listRef}
      className={classes(styles.thread, className)}
      aria-label={label}
      aria-live="polite"
    >
      {!messages.length && empty && <li className={styles.empty}>{empty}</li>}
      {messages.map(message => (
        <li
          key={message.id}
          className={styles.message}
          data-side={message.side || 'start'}
        >
          <span className={styles.avatar} aria-hidden>
            {message.avatar ?? initials(message.name)}
          </span>
          <div className={styles.body}>
            {(message.name || message.meta) && (
              <div className={styles.meta}>
                {message.name && <span className={styles.name}>{message.name}</span>}
                {message.meta && <span>{message.meta}</span>}
              </div>
            )}
            <p className={styles.bubble}>
              {message.pending && !message.text ? (
                <TypingDots label="Working" />
              ) : (
                message.text
              )}
              {message.streaming && message.text && <Caret variant="soft" />}
            </p>
            {message.children}
          </div>
        </li>
      ))}
    </ol>
  );
}
