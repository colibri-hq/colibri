#!/usr/bin/env node

import { execute } from '@oclif/core';

execute({ dir: import.meta.url })
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .finally();
