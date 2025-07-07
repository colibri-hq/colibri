import packageJson from '../package.json' with { type: 'json' };

export * from './base64.js';
export * from './buffer.js';
export * from './crypto.js';
export * from './images/index.js';
export * from './mediaType.js';
export * from './random.js';
export * from './types.js';
export * from './utilities.js';

/**
 * User agent string for requests sent by Colibri.
 *
 * This user-agent string is used to identify requests made by Colibri to
 * external services.
 */
export const userAgent = `Colibri/${packageJson.version} (${packageJson.homepage})`;
