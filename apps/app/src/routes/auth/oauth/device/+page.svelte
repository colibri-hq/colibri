<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import { Button } from '@colibri-hq/ui';
  import { enhance } from '$app/forms';
  import DigitInput from '$lib/components/Auth/Digits/DigitInput.svelte';
    import { Icon } from '@colibri-hq/ui';
  import AuthorizationPrompt from '$lib/components/Auth/OAuth/AuthorizationPrompt.svelte';
  import { tick } from 'svelte';

  interface Props {
    data: PageData;
    form: ActionData;
  }

  let { data, form }: Props = $props();

  let value = $state('');
  let initialValue = $derived(data.userCode ?? '');
  let error = $derived(
    form?.errors && 'user_code' in form.errors
      ? form.errors.user_code.join(', ')
      : undefined,
  );

  let codeForm: HTMLFormElement = $state();

  async function submitOnComplete() {
    await tick();

    codeForm.requestSubmit();
  }
</script>

<article
  class="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-2xl shadow-gray-500/5"
>
  <header class="mb-2">
    <h1 class="font-serif text-3xl font-medium">Connect a Device</h1>
  </header>

  {#if !form || error}
    <p class="text-gray-700">Enter the code displayed on your device.</p>
    <form
      class="mt-8 grid gap-4"
      method="post"
      action="?/code"
      use:enhance
      bind:this={codeForm}
    >
      <DigitInput
        bind:value
        {initialValue}
        name="user_code"
        separator
        autofocus
        {error}
        on:input={submitOnComplete}
      />

      <div class="flex items-center justify-self-end">
        <Button
          type="submit"
          label="Continue"
          disabled={value.length < 6}
          class="order-2"
        />
        <Button label="Help" variant="subtle" class="order-1 mr-2" />
      </div>
    </form>
  {:else if form.consented}
    <p class="text-gray-700">
      You're all set! The device has been successfully connected and should be
      ready to use.
    </p>
    <p class="mt-1 text-gray-700">Feel free to close this window now.</p>

    <div
      class="mx-auto mt-12 flex h-32 w-32 items-center justify-center rounded-full bg-green-100 p-8"
    >
      <Icon name="done_all" class="text-5xl text-green-500" />
    </div>
  {:else if form.rejected}
    <p class="text-gray-700">The device connection has been rejected.</p>
    <p class="mt-1 text-gray-700">Feel free to close this window now.</p>

    <div
      class="mx-auto mt-12 flex h-32 w-32 items-center justify-center rounded-full bg-red-100 p-8"
    >
      <Icon name="do_not_disturb_on" class="text-5xl text-red-500" />
    </div>
  {:else if form.consentPending}
    <AuthorizationPrompt
      clientName={form.client.name ?? ''}
      scopes={form.client.scopes}
    >
      <input type="hidden" name="userCode" value={form.userCode} />
      <input
        type="hidden"
        name="deviceChallenge"
        value={form.deviceChallenge}
      />
    </AuthorizationPrompt>
  {/if}
</article>
