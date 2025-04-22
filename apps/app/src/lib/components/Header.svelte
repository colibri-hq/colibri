<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { NavigationLink } from '@colibri-hq/ui';

  interface Props {
    isAuthenticated: boolean;
    userName: string;
  }

  let { isAuthenticated, userName }: Props = $props();

  async function logout() {
    await fetch('/auth/logout', { method: 'POST' });
    await invalidateAll();
  }
</script>

<header class="page-header border-b bg-white py-8">
  <div class="mx-auto flex max-w-6xl items-center px-8">
    <a class="mr-8" href="/">
      <h1 class="text-2xl font-bold">Colibri</h1>
    </a>

    <nav class="flex w-full justify-between">
      <ul class="flex space-x-4">
        <NavigationLink title="Authors" to="/authors" />
        <NavigationLink title="Books" to="/books" />
      </ul>

      <ul class="flex items-center">
        {#if isAuthenticated}
          <li><span class="mr-8 font-bold">{userName}</span></li>

          <NavigationLink onClick={logout} title="Logout" />
        {:else}
          <NavigationLink to="/auth/login" title="Login" />
        {/if}
      </ul>
    </nav>

    <button
      class="switch-display-mode minimal im im-newspaper-o"
      title="Switch Reader Mode"
      aria-label="Switch Reader Mode"
      type="button"
    ></button>
  </div>
</header>
