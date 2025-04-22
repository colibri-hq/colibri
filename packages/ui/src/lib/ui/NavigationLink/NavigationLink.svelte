<script lang="ts">
  import { page } from '$app/state';
  import Icon from '../Icon/Icon.svelte';
  import type { Snippet } from 'svelte';
  import { Button } from 'bits-ui';

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
     * If a string is provided, it will be used as the icon name. Otherwise, a
     * Svelte component can be rendered directly.
     */
    icon?: string | Snippet;

    /**
     * Additional content to display inside the link.
     */
    children?: Snippet;

    /**
     * An optional emoji to display next to the title.
     */
    emoji?: string;

    /**
     * A callback function to be called when the link is clicked, if `to` is not
     * provided.
     *
     * @param event
     */
    onClick?: (event: Event) => unknown;

    [key: string]: unknown;
  }

  const { title, to, icon, emoji, onClick, children, ...rest }: Props = $props();

  const onclick = (event: MouseEvent) => {
    if (!to) {
      event.preventDefault();
    }

    onClick?.(event);
  };

  const ButtonRoot = Button.Root;
  const active = $derived.by(() => page.url.pathname === to);
</script>

<li class="contents">
  <ButtonRoot
    {...rest}
    aria-current={active ? 'page' : 'false'}
    class="group/link flex items-center justify-center gap-2 rounded-md p-2 text-gray-500 outline-none
    transition hover:bg-gray-200 hover:text-gray-700 active:bg-gray-300 focus-visible:bg-gray-200
    focus-visible:text-gray-700 focus-visible:ring sm:justify-start sm:py-1 sm:px-2 select-none
    {active ? 'bg-gray-200 dark:bg-gray-700' : undefined}
    dark:text-gray-400 dark:hover:text-gray-300 dark:active:bg-gray-600 dark:focus-visible:text-gray-300"
    href={to}
    {onclick}
  >
    {#if typeof icon === 'string'}
      <Icon class="mt-[1.5px] text-3xl sm:text-xl" name={icon} />
    {:else if emoji}
      <span class="text-3xl sm:text-xl">{emoji}</span>
    {:else}
      {@render icon?.()}
    {/if}

    <div class="hidden sm:contents">
      {#if children}
        {@render children()}
      {:else}
        <span>{title}</span>
      {/if}
    </div>
  </ButtonRoot>
</li>
