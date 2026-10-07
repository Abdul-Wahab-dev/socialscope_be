import { z } from 'zod';

/** Friendlier default messages for the most common validation failures. */
z.config({
  customError: (issue) => {
    if (issue.code === 'invalid_type' && issue.input === undefined) return 'This field is required';
    if (issue.code === 'invalid_type') return `Expected ${issue.expected}`;
    return undefined;
  },
});
