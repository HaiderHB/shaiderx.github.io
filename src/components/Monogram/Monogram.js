import { forwardRef, useId } from 'react';
import { classes } from 'utils/style';
import styles from './Monogram.module.css';

export const Monogram = forwardRef(({ highlight, className, ...props }, ref) => {
  const id = useId();
  const clipId = `${id}monogram-clip`;

  return (
    <svg
      aria-hidden
      className={classes(styles.monogram, className)}
      width="46"
      height="29"
      viewBox="0 0 46 29"
      ref={ref}
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          {/* "HB" monogram */}
          <path d="M0 0h5.5v11.75H13V0h5.5v29H13V17.25H5.5V29H0z" />
          <path
            clipRule="evenodd"
            d="M22.5 0H36a7 7 0 0 1 0 14h1a7.5 7.5 0 0 1 0 15H22.5zM28 5.5h8a1.5 1.5 0 0 1 0 3h-8zM28 19.5h9a2 2 0 0 1 0 4h-9z"
          />
        </clipPath>
      </defs>
      <rect clipPath={`url(#${clipId})`} width="100%" height="100%" />
      {highlight && (
        <g clipPath={`url(#${clipId})`}>
          <rect className={styles.highlight} width="100%" height="100%" />
        </g>
      )}
    </svg>
  );
});
