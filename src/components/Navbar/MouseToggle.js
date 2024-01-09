import { Button } from 'components/Button';
import { useAppContext } from 'hooks';
import { useId } from 'react';
import styles from './MouseToggle.module.css';

export const MouseToggle = ({ isMobile, ...rest }) => {
  const { dispatch } = useAppContext();
  const id = useId();
  const maskId = `${id}mouse-toggle-mask`;

  const handleClick = () => {
    dispatch({ type: 'toggleMouse' });
  };

  return (
    <Button
      iconOnly
      className={styles.toggle}
      data-mobile={isMobile}
      aria-label="Toggle mouse"
      onClick={handleClick}
      {...rest}
    >
      <svg aria-hidden className={styles.svg} width="38" height="38" viewBox="0 0 38 38">
        <defs>
          <mask id={maskId}>
            <circle className={styles.circle} data-mask={true} cx="19" cy="19" r="13" />
            <circle className={styles.mask} cx="25" cy="14" r="9" />
          </mask>
        </defs>
        <path
          className={styles.path}
          d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 4.702z"
        />
        <circle
          className={styles.circle}
          mask={`url(#${maskId})`}
          cx="19"
          cy="19"
          r="12"
        />
      </svg>
    </Button>
  );
};
