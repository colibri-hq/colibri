<script lang="ts">
  import { Field, NavigationKnob, NavigationLink, NavigationSection } from '@colibri-hq/ui';
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

<nav class="{twMerge(className, 'flex flex-col py-2 gap-2')}">
  <div class="flex items-center justify-center sm:justify-between ps-2 pe-4 pt-2 sm:pt-0">
    <SiteBranding />

    <NavigationKnob
      href="/help"
      label="Help"
      active={page.url.pathname === '/help'}
      icon="help"
    />
  </div>

  <div class="flex h-full max-h-full flex-col md:gap-y-4 overflow-y-auto ps-2 pe-4 py-1">
    <!-- region Search Bar -->
    <div class="hidden md:contents">
      <Field
        bind:value={searchTerm}
        placeholder="Search"
        type="search"
      >
        {#snippet appendIcon()}
          <kbd
            class="-me-1 bg-gray-100 dark:bg-gray-800/75 text-gray-400 dark:text-gray-500 border
            border-gray-200/50 dark:border-transparent rounded leading-1 inline-flex items-center px-1.5 h-6 my-auto
            font-sans self-center">
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
      <NavigationLink
        icon="explore"
        title="Featured"
        to="/discover/featured"
      />
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

    <!-- region Navigation Actions Area -->
    {#if user}
      <AddBookButton onClick={onUpload} />
    {:else}
      <AccountPromotionBanner />
    {/if}
    <!-- endregion -->
  </div>

  <!-- region User Account Area -->
  {#if user}
    <CurrentUser class="ps-4 pe-4" email={user.email} name={user.name} />
  {/if}
  <!-- endregion -->
</nav>
