import { forwardRef } from 'react';
import { classes } from 'utils/style';
import styles from './Button.module.css';

/**
 * Button for demo pages.
 * variant: 'primary' | 'secondary' | 'ghost' | 'link'
 * size: 'm' (default) | 's' (compact), for primary and secondary
 * pill: 42px rounded button that fits a leading icon (ignores size)
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'm', pill = false, type = 'button', className, ...rest },
  ref
) {
  const sized = variant === 'primary' || variant === 'secondary';
  return (
    <button
      ref={ref}
      type={type}
      className={classes(styles.button, className)}
      data-variant={variant}
      data-size={sized && !pill ? size : undefined}
      data-pill={sized && pill ? '' : undefined}
      {...rest}
    />
  );
});
