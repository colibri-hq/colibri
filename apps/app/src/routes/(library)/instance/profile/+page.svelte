<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { Button, ToggleField } from '@colibri-hq/ui';
  import { Field } from '@colibri-hq/ui';
  import { Icon } from '@colibri-hq/ui';
  import { savable, trpc } from '$lib/trpc/client';
  import Gravatar from 'svelte-gravatar';
  import type { PageProps } from './$types';
  import ProfileSection from './ProfileSection.svelte';
  import type { Authenticator } from '@colibri-hq/sdk/types';
  import relativeTime from 'dayjs/plugin/relativeTime';
  import dayjs from 'dayjs';
  import AuthenticatorListItem from './AuthenticatorListItem.svelte';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';

  dayjs.extend(relativeTime);

  let { data }: PageProps = $props();

  let loading: boolean = $state(false);
  let updatedName: string = $state(data.user.name || '');
  let updatedEmailAddress: string = $state(data.user.email);

  // Notification preferences
  let notifyOnReplies: boolean = $state(data.notificationPreferences?.comment_replies ?? true);
  let notifyOnReactions: boolean = $state(data.notificationPreferences?.comment_reactions ?? true);
  let notifyOnMentions: boolean = $state(data.notificationPreferences?.comment_mentions ?? true);

  async function updateName() {
    loading = true;

    try {
      await trpc(page).users.updateCurrent.mutate(
        savable({ name: updatedName }),
      );
      await invalidateAll();
    } finally {
      loading = false;
    }
  }

  async function updateEmailAddress() {
    loading = true;

    try {
      await trpc(page).users.updateCurrentEmail.mutate(updatedEmailAddress);
      await invalidateAll();
    } finally {
      loading = false;
    }
  }
  function registerAuthenticator() {
    return goto(resolve('/auth/attestation'));
  }

  function removeAuthenticator(authenticator: Authenticator) {
    return async () => {
      loading = true;

      try {
        await trpc(page).users.removeAuthenticator.mutate(authenticator.id);
        await invalidateAll();
      } finally {
        loading = false;
      }
    };
  }

  async function updateNotificationPreference(
    key: 'comment_replies' | 'comment_reactions' | 'comment_mentions',
    value: boolean,
  ) {
    try {
      await trpc(page).notifications.updatePreferences.mutate({
        [key]: value,
      });
    } catch (error) {
      console.error('Failed to update notification preference:', error);
      // Revert the local state on error
      await invalidateAll();
    }
  }
</script>

<article>
  <header class="flex flex-col items-center justify-center">
    <Gravatar
      class="overflow-hidden rounded-full bg-gray-50"
      email={data.user.email}
      size={200}
    />

    <h1
      class="mt-8 ml-4 flex items-center text-4xl font-bold dark:text-gray-300"
    >
      {data.user.name}
    </h1>
  </header>

  <ProfileSection title="About you">
    {#snippet help()}
      <p>This is your profile information.</p>
    {/snippet}

    <Field
      appendIcon="face"
      autocomplete="name"
      bind:value={updatedName}
      label="Name"
      name="name"
      type="text"
    />

    {#snippet after()}
      <Button
        class="mt-6 lg:mt-8"
        label="Update"
        disabled={updatedName === data.user.name}
        onClick={updateName}
      />
    {/snippet}
  </ProfileSection>

  <ProfileSection title="Your Email Address">
    {#snippet help()}
      <p>
        The email address you used to create the&nbsp;account.<br />
        We use this information to sign you in securely, and help you get access
        to your account in case you lose access to all registered authenticators.
      </p>
    {/snippet}

    <Field
      appendIcon="email"
      bind:value={updatedEmailAddress}
      hint="We will send a confirmation email to the new address."
      label="Email Address"
      name="email"
      type="email"
    />

    {#snippet after()}
      <Button
        class="mt-6 lg:mt-8"
        label="Update"
        disabled={updatedEmailAddress === data.user.email}
        onClick={updateEmailAddress}
      />
    {/snippet}
  </ProfileSection>

  <ProfileSection title="Your Passkeys">
    {#snippet help()}
      <p>
        These are the passkeys you have previously&nbsp;registered.<br />
        Passkeys give you a simple and secure way to sign in without passwords by
        relying on methods like Face&nbsp;ID or Touch&nbsp;ID on Apple devices, or
        Hello on Windows to identify you when you sign in to supporting websites
        and&nbsp;apps.
      </p>
    {/snippet}

    <ul class="mb-6 divide-y divide-gray-200 lg:mb-8 dark:divide-gray-800">
      {#each data?.authenticators as authenticator, index (index)}
        <li class="group" role="presentation">
          <AuthenticatorListItem
            {authenticator}
            disabled={loading}
            removable={data.authenticators.length > 1}
            onRemove={removeAuthenticator(authenticator)}
          />
        </li>
      {/each}
    </ul>

    {#snippet after()}
      <Button label="Add new" onClick={registerAuthenticator} />
    {/snippet}
  </ProfileSection>

  <ProfileSection title="Notification Preferences">
    {#snippet help()}
      <p>
        Control when you receive notifications about activity on your&nbsp;comments.
      </p>
    {/snippet}

    <div class="space-y-2">
      <ToggleField
        label="Replies"
        hint="Get notified when someone replies to your comments"
        bind:checked={notifyOnReplies}
        onCheckedChange={(checked) => updateNotificationPreference('comment_replies', checked)}
      />

      <ToggleField
        label="Reactions"
        hint="Get notified when someone reacts to your comments"
        bind:checked={notifyOnReactions}
        onCheckedChange={(checked) => updateNotificationPreference('comment_reactions', checked)}
      />

      <ToggleField
        label="Mentions"
        hint="Get notified when someone mentions you in a comment"
        bind:checked={notifyOnMentions}
        onCheckedChange={(checked) => updateNotificationPreference('comment_mentions', checked)}
      />
    </div>
  </ProfileSection>

  <div class="mt-8 block md:hidden">
    <Button class="w-full">
      <div class="mx-auto flex items-center">
        <Icon class="mr-2" name="logout" />
        <span>Sign out</span>
      </div>
    </Button>
  </div>
</article>
