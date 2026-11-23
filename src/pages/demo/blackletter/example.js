// The recorded example run, with the lawyer cases derived the same way the page derives them.
import { EXAMPLE_DATA } from './example-data';
import { toCase } from './harness';

export const EXAMPLE = {
  ...EXAMPLE_DATA,
  learn: { ...EXAMPLE_DATA.learn, cases: Object.values(EXAMPLE_DATA.feedback).map(toCase) },
};
