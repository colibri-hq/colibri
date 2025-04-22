<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import ToggleField from '$lib/components/Form/ToggleField.svelte';
  import { Field } from '@colibri-hq/ui';
  import { Button } from '@colibri-hq/ui';
  import { z } from 'zod';
  import { trpc } from '$lib/trpc/client';
  import { page } from '$app/stores';
  import LoadingSpinner from '$lib/LoadingSpinner.svelte';
  import { fly } from 'svelte/transition';
  import HelpLink from '$lib/components/HelpLink.svelte';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();
  let emailAddress = $state('');
  let name = $state('');
  let birthDate: string | undefined = $state(undefined);
  let childAccount = $state(false);
  let loading = $state(false);
  let error: string | undefined = $state(undefined);

  function validateName(name: string) {
    try {
      return !!(name && z.string().parse(name));
    } catch {
      return false;
    }
  }

  function validateEmailAddress(emailAddress: string) {
    try {
      return !!(emailAddress && z.string().email().parse(emailAddress));
    } catch {
      return false;
    }
  }

  async function createAccount() {
    if (loading || invalid) {
      return;
    }

    loading = true;
    error = undefined;

    try {
      await trpc($page).users.createUser.mutate({
        name,
        emailAddress,
        role: childAccount ? 'adult' : 'child',
        birthDate: birthDate || (undefined as Date | undefined),
      });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading = false;
    }
  }

  let invalid = $derived(
    !validateName(name) || !validateEmailAddress(emailAddress),
  );
</script>

<Modal bind:open class="max-w-96">
  {#snippet header()}
    <h1 class="text-lg font-bold">Create Account</h1>
  {/snippet}

  <div class="grid grid-cols-1 gap-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Create an account on behalf of a family member. You can change all
      settings later on, so don't worry about omitting some things for now.
    </p>

    <Field
      autofocus
      bind:value={name}
      disabled={loading}
      label="Name"
      on:submit={createAccount}
      required
    />
    <Field
      bind:value={emailAddress}
      disabled={loading}
      label="Email address"
      on:submit={createAccount}
      required
      type="email"
    />
    <ToggleField
      bind:value={childAccount}
      disabled={loading}
      hint="Kids accounts will be restricted access to content."
      label="This is a Kids' Account"
    />

    {#if childAccount}
      <div transition:fly={{ duration: 200, delay: 20, y: -16 }}>
        <Field
          bind:value={birthDate}
          disabled={loading}
          label="Birthdate"
          type="date"
          hint="Add a birthdate to only show age-appropriate content."
          on:submit={createAccount}
        />
      </div>
    {/if}
  </div>

  <footer class="mt-6">
    <div class="flex items-center space-x-2">
      <Button disabled={invalid || loading} onClick={createAccount}
        >Submit</Button
      >
      <HelpLink variant="subtle" topic="users.create" />

      {#if loading}
        <LoadingSpinner class="ml-auto" />
      {/if}
    </div>

    {#if error}
      <div
        role="alert"
        transition:fly={{ duration: 200, delay: 20, y: -16 }}
        class="mt-4 flex flex-col rounded-lg bg-red-100 px-4 py-2 text-sm text-red-900 shadow-md
        shadow-red-500/10 ring-2 ring-red-200"
      >
        <strong class="mb-1">Something unexpected happened</strong>
        <p>The user account could not be created: {error}</p>
      </div>
    {/if}
  </footer>
</Modal>
