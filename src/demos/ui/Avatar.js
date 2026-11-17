import { classes } from 'utils/style';
import styles from './Avatar.module.css';

/** "Maya Lindqvist" -> "ML"; "@mayaskinlab" -> "MA". */
export function initials(name) {
  const parts = String(name || '')
    .replace(/^@/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Initials in a circle for a person or account (creators, participants, customers): sample
 * data has no photos, and a neutral mark keeps one accent per view.
 * size: 's' (28px) | 'm' (36px) | 'l' (52px); tone: 'neutral' | 'accent' (the selected one).
 * Decorative by default (the name is next to it); pass aria-label to make it an image.
 */
export function Avatar({ name, size = 'm', tone = 'neutral', className, ...rest }) {
  const labelled = Boolean(rest['aria-label']);
  return (
    <span
      className={classes(styles.avatar, className)}
      data-size={size}
      data-tone={tone}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      {...rest}
    >
      {initials(name)}
    </span>
  );
}
