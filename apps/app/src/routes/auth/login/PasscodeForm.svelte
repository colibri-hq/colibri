<script lang="ts">
  import type { DigitsChangeEvent } from '$lib/components/Auth/Digits/DigitInput.svelte';
  import DigitInput from '$lib/components/Auth/Digits/DigitInput.svelte';
  import { Button } from '@colibri-hq/ui';
  import type { SubmitFunction } from './$types';
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import type { ZodIssue } from 'zod';
  import ZodIssues from '$lib/components/Form/ZodIssues.svelte';
  import { page } from '$app/state';

  interface Props {
    email: string;
    issues: ZodIssue[];
  }

  let { email = $bindable(), issues = $bindable() }: Props = $props();
  let formRef: HTMLFormElement | undefined = $state();
  let loading = $state(false);

  let passcode = $state<string | undefined>();
  let previous = $derived(page.url.searchParams.get('previous') ?? '/');

  async function verifyPasscode(event: DigitsChangeEvent) {
    ({ value: passcode } = event.detail);

    // Wait for a moment for the hidden form input to update
    await tick();

    // Then submit the form
    formRef?.requestSubmit();
  }

  const handle = function handle({ action, cancel }) {
    if (action.search === '?/verify' && !passcode) {
      return cancel();
    }

    // Reset the issues
    issues = [];
    loading = true;

    return async ({ update }) => {
      loading = false;

      return update();
    };
  } satisfies SubmitFunction;
</script>

<form
  action="?/verify"
  bind:this={formRef}
  class="flex max-w-md flex-col"
  method="post"
  use:enhance={handle}
>
  <!-- If the client does not forward the previous URL cookie, we'll include it as a fallback -->
  <input name="previous" type="hidden" value={previous} />

  <p class="mb-4 block text-gray-700 dark:text-gray-400">
    Please enter the passcode that was sent to&nbsp;"{email}".
  </p>

  <input name="email" required type="hidden" value={email} />
  <input name="passcode" required type="hidden" value={passcode} />
  <DigitInput disabled={loading} numeric on:input={verifyPasscode} />

  <div class="flex items-center justify-end">
    <Button
      class="order-2 ml-2"
      disabled={loading}
      label="Verify"
      type="submit"
    />

    <Button
      class="order-1"
      disabled={loading}
      formaction="?/request"
      label="Send another"
      variant="subtle"
      type="submit"
    />
  </div>

  {#if issues.length > 0}
    <ZodIssues {issues} fields={['passcode']} />
  {/if}
</form>
