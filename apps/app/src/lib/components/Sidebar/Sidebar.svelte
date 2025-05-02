<script lang="ts">
  import { Field, NavigationKnob, NavigationLink, NavigationMenu, NavigationSection } from '@colibri-hq/ui';
  import AccountPromotionBanner from '$lib/components/Sidebar/AccountPromotionBanner.svelte';
  import AddBookButton from '$lib/components/Sidebar/AddBookButton.svelte';
  import CollectionsList from '$lib/components/Sidebar/CollectionsList.svelte';
  import CurrentUser from '$lib/components/Sidebar/CurrentUser.svelte';
  import SiteBranding from '$lib/components/Sidebar/SiteBranding.svelte';
  import type { Collection, User } from '@colibri-hq/sdk';
  import type { MaybePromise } from '@colibri-hq/shared';
  import { page } from '$app/state';
  import { twMerge } from 'tailwind-merge';

  interface Props {
    class?: string;
    collections: MaybePromise<Collection[]>;
    user?: User | undefined;
    onUpload?: () => unknown;
  }

  let {
    class: className = '',
    collections,
    user = undefined,
    onUpload = () => void 0,
  }: Props = $props();
  let searchTerm = $state('');
</script>

<nav class={twMerge(className, 'flex flex-col gap-2 py-2')}>
  <div
    class="flex items-center justify-center px-4 pt-2 sm:justify-between sm:pt-0"
  >
    <SiteBranding />

    <NavigationKnob
      href="/help"
      label="Help"
      active={page.url.pathname === '/help'}
      icon="help"
    />
  </div>

  <NavigationMenu
    class="flex h-full max-h-full flex-col overflow-y-auto px-4 py-1 md:gap-y-4"
  >
    <!-- region Search Bar -->
    <div class="hidden md:contents">
      <Field bind:value={searchTerm} placeholder="Search" type="search">
        {#snippet appendIcon()}
          <kbd
            class="my-auto -me-1 inline-flex h-6 items-center self-center
            rounded border border-gray-200/50 bg-gray-100 px-1.5 font-sans leading-1 text-gray-400 dark:border-transparent
            dark:bg-gray-800/75 dark:text-gray-500"
          >
            <span>⌘</span>
            <span>&thinsp;</span>
            <span>K</span>
          </kbd>
        {/snippet}
      </Field>
    </div>
    <!-- endregion -->

    <!-- region Discovery -->
    <NavigationSection label="Discovery" open>
      <NavigationLink icon="explore" title="Featured" to="/discover/featured" />
      <NavigationLink icon="local_library" title="Browse" to="/discover" />
    </NavigationSection>
    <!-- endregion -->

    <!-- region Main Navigation -->
    <NavigationSection label="Library" open>
      <NavigationLink icon="person" title="Creators" to="/creators" />
      <NavigationLink icon="book" title="Books" to="/books" />
      <NavigationLink icon="domain" title="Publishers" to="/publishers" />
    </NavigationSection>
    <!-- endregion -->

    <!-- region User Collections -->
    {#if user}
      <CollectionsList {collections} />
    {/if}
    <!-- endregion -->

  </NavigationMenu>

  <!-- region Navigation Actions Area -->
  <div class="px-4 flex justify-stretch">
    {#if user}
      <AddBookButton onClick={onUpload} />
    {:else}
      <AccountPromotionBanner />
    {/if}
  </div>
  <!-- endregion -->

  <!-- region User Account Area -->
  {#if user}
    <CurrentUser class="ps-4 pe-4" email={user.email} name={user.name} />
  {/if}
  <!-- endregion -->
</nav>
