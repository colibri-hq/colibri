<script lang="ts">
  import { page } from '$app/state';
  import { IconRenderer } from '../IconRenderer/index.js';
  import type { Snippet } from 'svelte';
  import { Button, NavigationMenu } from 'bits-ui';

  interface Props {
    /**
     * The title of the link.
     */
    title: string;

    /**
     * The URL to navigate to when the link is clicked.
     */
    to?: string;

    /**
     * The icon to display next to the title.
     *
     * If a string is provided, it will be used as an icon URN (e.g., `urn:colibri:icon:mdi:home`).
     * Otherwise, a Svelte component can be rendered directly.
     */
    icon?: string | Snippet;

    /**
     * Additional content to display inside the link.
     */
    children?: Snippet;

    /**
     * A callback function to be called when the link is clicked, if `to` is not
     * provided.
     *
     * @param event
     */
    onClick?: (event: Event) => unknown;

    [key: string]: unknown;
  }

  const { title, to, icon, onClick, children, ...rest }: Props = $props();

  const ButtonRoot = Button.Root;
  const NavigationMenuItem = NavigationMenu.Item;
  const NavigationMenuLink = NavigationMenu.Link;

  const onclick = (event: MouseEvent) => {
    if (!to) {
      event.preventDefault();
    }

    onClick?.(event);
  };

  const active = $derived.by(() => page.url.pathname === to);
</script>

<NavigationMenuItem class="contents">
  <NavigationMenuLink>
    {#snippet child({ props })}
      <ButtonRoot
        {...props}
        class="group/link flex items-center justify-center gap-2 rounded-md p-2 text-gray-500 outline-none
        transition hover:bg-gray-200/50 dark:hover:bg-gray-900 hover:text-gray-700 active:bg-gray-300
        focus-visible:bg-gray-200 dark:focus-visible:bg-gray-900 dark:focus-visible:ring-gray-800
        focus-visible:text-gray-700 focus-visible:ring sm:justify-start sm:py-1 sm:px-2 select-none
        {active ? 'bg-gray-200 dark:bg-gray-700' : undefined}
        dark:text-gray-400 dark:hover:text-gray-300 dark:active:bg-gray-600 dark:focus-visible:text-gray-300"
        {...rest}
        {onclick}
        href={to}
        aria-current={active ? 'page' : 'false'}
      >
        {#if typeof icon === 'string'}
          <IconRenderer icon={icon} class="mt-[1.5px] text-3xl sm:text-xl" fallback="folder" />
        {:else if icon}
          {@render icon()}
        {/if}

        <span class="hidden sm:contents">
          {#if children}
            {@render children()}
          {:else}
            <span>{title}</span>
          {/if}
        </span>
      </ButtonRoot>
    {/snippet}
  </NavigationMenuLink>
</NavigationMenuItem>
