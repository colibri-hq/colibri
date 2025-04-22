<script lang="ts">
  import { run } from 'svelte/legacy';

  import Modal from '$lib/components/Modal.svelte';
  import { Field } from '@colibri-hq/ui';
  import { Button } from '@colibri-hq/ui';
  import { QrCode } from '@colibri-hq/ui';
  import { fly } from 'svelte/transition';
  import ToggleField from '$lib/components/Form/ToggleField.svelte';
  import { trpc } from '$lib/trpc/client';
  import { page } from '$app/stores';
  import dayjs from 'dayjs';
  import { z } from 'zod';
  import { debounce } from 'svelte-reactive-debounce';
  import { writable } from 'svelte/store';
  import { CopyToClipboard } from '@colibri-hq/ui';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();
  let loading: boolean = $state(false);
  const emailAddress = writable('');
  const debounced = debounce(emailAddress, 250);
  let childAccount = $state(false);
  let invitationLink: string | undefined = $state(undefined);

  async function generateInvitationLink(email: string, childAccount: boolean) {
    if (!validate(email)) {
      return;
    }

    loading = true;

    try {
      invitationLink = await trpc($page).users.generateInvitationLink.query({
        email,
        role: childAccount ? 'child' : 'adult',
        expiresAt: dayjs().add(14, 'days').toDate(),
      });
    } finally {
      loading = false;
    }
  }

  function validate(emailAddress: string | undefined) {
    try {
      return !!(
        emailAddress &&
        z.string().email('Not a valid email address').parse(emailAddress)
      );
    } catch {
      return false;
    }
  }

  let emailAddressValid = $derived(validate($emailAddress));
  run(() => {
    generateInvitationLink($debounced, childAccount);
  });
</script>

<Modal bind:open class="max-w-96">
  {#snippet header()}
    <h1 class="text-lg font-bold">Invite someone</h1>
  {/snippet}

  <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
    Invite someone to your family library by entering their email address below.
  </p>

  <Field
    bind:value={$emailAddress}
    label="Email address"
    required
    type="email"
  />
  <ToggleField
    bind:value={childAccount}
    class="mt-2"
    hint="Kids accounts will be restricted access to content."
    label="This is a Kids Account"
  />

  <footer class="mt-6">
    <div class="flex items-center space-x-4">
      <Button disabled={!emailAddressValid || loading}>Send invitation</Button>
      <CopyToClipboard
        completeLabel="Copied link"
        disabled={!invitationLink || loading}
        label="Copy Link"
        variant="subtle"
        value={invitationLink ?? ''}
      />
    </div>

    {#if emailAddressValid && invitationLink}
      <div transition:fly={{ duration: 150, y: 16 }} class="mt-6">
        <QrCode
          maskCenter
          value={invitationLink}
          class="rounded-lg border bg-gray-100 p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <img src="/logo.svg" alt="" class="h-full w-full" />
        </QrCode>
      </div>
    {/if}
  </footer>
</Modal>
