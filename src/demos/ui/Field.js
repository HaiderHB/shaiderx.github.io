import { forwardRef } from 'react';
import { classes } from 'utils/style';
import styles from './Field.module.css';

// variant 'plain': full-width block with an outline on focus (emails, JSON arguments).
// variant 'ring': inline field with a focus ring (queries, chat composers, selects).
// code: monospace text (JSON, code).
function fieldProps({ variant = 'plain', code = false, className, ...rest }) {
  return {
    className: classes(styles.field, className),
    'data-variant': variant,
    'data-code': code ? '' : undefined,
    ...rest,
  };
}

export const TextArea = forwardRef(function TextArea(props, ref) {
  return <textarea ref={ref} {...fieldProps(props)} />;
});

export const Input = forwardRef(function Input(props, ref) {
  return <input ref={ref} {...fieldProps({ variant: 'ring', ...props })} />;
});

export const Select = forwardRef(function Select({ children, ...props }, ref) {
  return (
    <select ref={ref} {...fieldProps({ variant: 'ring', ...props })}>
      {children}
    </select>
  );
});
