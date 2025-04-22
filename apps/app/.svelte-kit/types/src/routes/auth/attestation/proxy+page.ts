// @ts-nocheck
import { browser } from '$app/environment';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types';
import type { PageLoad } from './$types';

export const load = async function load({ fetch, parent }: Parameters<PageLoad>[0]) {
  const data = await parent();

  // This should be expected during SSR
  if (!browser) {
    return { ...data, error: null };
  }

  let options: PublicKeyCredentialCreationOptionsJSON;

  try {
    const attestationResponse = await fetch('/auth/attestation/generate');
    options =
      (await attestationResponse.json()) as PublicKeyCredentialCreationOptionsJSON;
  } catch (error) {
    console.error('Failed to generate attestation options', { error });

    return {
      ...data,
      error: {
        message:
          'An error occurred while initializing your passkey. ' +
          'Please refresh the page and try again.',
      },
    };
  }

  return { ...data, options };
};
