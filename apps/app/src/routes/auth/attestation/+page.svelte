<script lang="ts">
  import { run } from 'svelte/legacy';

  import { goto } from '$app/navigation';
  import { Button } from '@colibri-hq/ui';
  import PageHeader from '$lib/components/Page/PageHeader.svelte';
  import {
    browserSupportsWebAuthn,
    startRegistration,
  } from '@simplewebauthn/browser';
  import type { RegistrationResponseJSON } from '@simplewebauthn/types';
  import { onMount } from 'svelte';
  import type { VerificationResponse } from './verify/+server';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let webAuthnSupported: boolean = $state(true);
  let registered: boolean = $state(false);
  let passkeyError: { title?: string; message: string } | null = $state();
  run(() => {
    passkeyError = data.error ?? null;
  });
  onMount(() => (webAuthnSupported = browserSupportsWebAuthn()));

  async function init() {
    const options = data.options;

    if (!options) {
      throw new Error('Unexpected state: No attestation options in page data');
    }

    let attestationData: RegistrationResponseJSON;

    try {
      attestationData = await startRegistration({
        optionsJSON: data.options,
        useAutoRegister: false,
      });
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      console.error('Failed to create passkey', { error });

      if (error.name === 'InvalidStateError') {
        passkeyError = {
          message:
            'You already have a passkey registered. Please try to register another ' +
            'passkey after signing in with your existing one.',
        };
      } else if (error.name === 'NotAllowedError') {
        passkeyError = {
          title: 'Permission denied',
          message:
            'You denied the request to create a passkey. ' +
            'If this was by mistake, please try again.',
        };
      } else {
        passkeyError = {
          message:
            `An unexpected error occurred while creating your passkey: ${error.message}. ` +
            'Please try again.',
        };
      }

      return;
    }

    // TODO: Do we actually want this?
    options.authenticatorSelection!.residentKey = 'required';
    options.authenticatorSelection!.requireResidentKey = true;
    options.extensions = { credProps: true };

    // hideAuthForm();

    let verificationResponseData: VerificationResponse;

    try {
      const verificationResponse = await fetch('/auth/attestation/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestationData),
      });
      verificationResponseData =
        (await verificationResponse.json()) as VerificationResponse;
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      console.error('Failed to verify attestation data', { error });
      passkeyError = {
        title: 'Verification failed',
        message:
          `An error occurred while verifying your passkey: ${error.message}. ` +
          'Please refresh the page and try again.',
      };

      return;
    }

    if (!(verificationResponseData && verificationResponseData.verified)) {
      console.error(
        'Failed to verify attestation data: Server did not report success',
        {
          response: verificationResponseData,
        },
      );
      passkeyError = {
        title: 'Verification failed',
        message:
          'An unexpected error occurred while verifying your passkey. ' +
          'Please try again.',
      };

      return;
    }

    registered = true;

    return goto('/');
  }

  function skip() {
    return goto('/');
  }
</script>

<PageHeader title="Add a passkey" />

{#if !webAuthnSupported}
  <span>Your internet browser does not support Passkeys :(</span>
{/if}

{#if !registered}
  <p class="mb-4 max-w-lg text-gray-500">
    To sign you in automatically and securely next time, create a passkey by
    clicking the button below.
  </p>
  <div class="flex items-center">
    <Button label="Create Passkey" onClick={init} />
    <Button label="Skip for now" variant="subtle" class="ml-4" onClick={skip} />
  </div>

  {#if passkeyError && passkeyError.message}
    <div class="mt-4 text-red-500">
      <div class="flex flex-col">
        {#if passkeyError.title}
          <strong>{passkeyError.title}</strong>
        {/if}
        <span>{passkeyError.message}</span>
      </div>
    </div>
  {/if}
{:else}
  <span>You're all set.</span>
{/if}
