import { goto } from '$app/navigation';
import {
  browserSupportsWebAuthnAutofill,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';
import type { VerificationResponse } from '../assertion/verify/+server';

export async function ceremony(fetch: Fetch) {
  if (!(await browserSupportsWebAuthnAutofill())) {
    throw new Error(
      'Passkeys are not available in this browser. Please sign in using a one-time code instead.',
    );
  }

  const assertionOptions = await requestAssertion(fetch);
  let assertionResponse: AuthenticationResponseJSON;

  try {
    assertionResponse = await startAuthentication({
      optionsJSON: assertionOptions,
      useBrowserAutofill: true,
    });
  } catch (cause) {
    if (!(cause instanceof Error)) {
      throw cause;
    }

    console.error(`Failed to start authentication: ${cause.message}`, {
      assertionOptions,
      error: cause,
    });

    throw new Error(
      'Uh-oh, Something went wrong while signing you in. ' +
        'Please try again or continue with your email address.',
      { cause },
    );
  }

  let destination: string;

  try {
    destination = await verifyAssertion(fetch, assertionResponse);
  } catch (cause) {
    if (!(cause instanceof Error)) {
      throw cause;
    }

    console.error(`Failed to verify assertion: ${cause.message}`, {
      assertionOptions,
      assertionResponse,
      error: cause,
    });

    throw new Error(
      'Uh-oh, Something went wrong while signing you in. ' +
        'Please try again or continue with your email address.',
      { cause },
    );
  }

  return goto(destination, { invalidateAll: true });
}

async function requestAssertion(fetch: Fetch) {
  let assertionOptionsResponse: Response;
  let assertionOptions: PublicKeyCredentialRequestOptionsJSON;

  try {
    assertionOptionsResponse = await fetch('/auth/assertion/generate', {
      headers: { accept: 'application/json' },
    });

    assertionOptions = await assertionOptionsResponse.json();
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    throw new Error(`Failed to generate assertion options: ${error.message}`);
  }

  return assertionOptions;
}

async function verifyAssertion(
  fetch: Fetch,
  assertion: AuthenticationResponseJSON,
) {
  const verificationResponse = await fetch('/auth/assertion/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertion),
  });

  const data: VerificationResponse = await verificationResponse.json();

  if (!data) {
    throw new Error(
      'Verification failed: Unexpected payload: No verification data',
    );
  }

  if (!data.verified) {
    throw new Error('Verification failed: Unexpected state');
  }

  return data.destination;
}

type Fetch = typeof fetch;
