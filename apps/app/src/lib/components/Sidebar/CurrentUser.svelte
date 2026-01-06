<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { NavigationKnob } from '@colibri-hq/ui';
  import Gravatar from 'svelte-gravatar';
  import { onMount, tick } from 'svelte';
  import { page } from '$app/state';

  interface Props {
    email: string;
    name: string | null;
    role?: 'admin' | 'adult' | 'child' | 'guest';
    class?: string;
    moderationEnabled?: boolean;

    [key: string]: unknown;
  }

  let {
    email,
    name = $bindable(),
    role,
    class: className,
    moderationEnabled = false,
    ...rest
  }: Props = $props();

  let isAdmin = $derived(role === 'admin');

  async function logout() {
    await fetch('/auth/logout', {
      method: 'POST',
    });
    await tick();
    await invalidateAll();
  }

  function inferNameFromEmail(email: string) {
    return email?.split('@')[0];
  }

  onMount(() => {
    name = name || inferNameFromEmail(email) || null;
  });
</script>

<div
  {...rest}
  class="{className} flex w-full items-center justify-center gap-2 select-none sm:justify-start"
>
  <a
    class="flex grow items-center justify-center gap-4 rounded-md outline-0 focus-visible:ring-2 md:justify-start"
    href="/instance/profile"
  >
    <Gravatar
      class="overflow-hidden rounded-full shadow-md ring ring-gray-300 size-10"
      {email}
    />
    <span
      class="hidden max-w-full overflow-hidden font-bold overflow-ellipsis whitespace-nowrap sm:inline"
    >
      {name}
    </span>
  </a>

  <NavigationKnob
    href="/instance/settings"
    label="Settings"
    active={page.url.pathname === '/instance/settings'}
    icon="settings"
  />
  {#if isAdmin && moderationEnabled}
    <NavigationKnob
      href="/instance/moderation"
      label="Moderation"
      active={page.url.pathname === '/instance/moderation'}
      icon="shield"
    />
  {/if}
  <NavigationKnob label="Log out" onClick={logout} icon="logout" />
</div>
