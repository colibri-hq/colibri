import { Flags } from '@oclif/core';

export const date = Flags.custom<Date>({
  async parse(input) {
    const date = new Date(input);

    if (Number.isNaN(date.getTime())) {
      throw new TypeError('Invalid date format.');
    }

    return date;
  },
});
