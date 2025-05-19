<script lang="ts">
  import { type Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';
  import Icon from '../Icon/Icon.svelte';
  import { Collapsible, NavigationMenu } from 'bits-ui';

  interface Props {
    children: Snippet;
    class?: string;
    disabled?: boolean;
    initialOpen?: boolean;
    label?: string | Snippet;
    open?: boolean;
  }

  let {
    initialOpen = false,
    open = $bindable(initialOpen),
    disabled = false,
    class: className = '',
    label,
    children,
  }: Props = $props();
  const CollapsibleRoot = Collapsible.Root;
  const CollapsibleTrigger = Collapsible.Trigger;
  const CollapsibleContent = Collapsible.Content;
  const NavigationMenuItem = NavigationMenu.Item;
  const NavigationMenuList = NavigationMenu.List;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      open = false;
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      open = true;
    }
  }
</script>

<NavigationMenuItem class="contents">
  <CollapsibleRoot {open} {disabled}>
    {#snippet child({ props })}
      <details
        {...props}
        class={twMerge('flex flex-col', className, 'group')}
        {open}
      >
        <CollapsibleTrigger>
          {#snippet child({ props })}
            <summary
              {...props}
              class="list-none flex items-center gap-1 border-b my-1 sm:ps-2.5 sm:mt-0 border-gray-200
            dark:border-gray-700 sm:border-none cursor-pointer select-none focus-visible:outline-none
            text-gray-500 dark:text-gray-400 focus-visible:text-black dark:focus-visible:text-gray-200
            hover:text-gray-700 dark:hover:text-gray-300 transition"
              onkeydown={handleKeydown}
            >
              <span class="hidden sm:contents">
                <strong class="text-sm font-bold">
                  {#if typeof label === 'string'}
                    {label}
                  {:else}
                    {@render label?.()}
                  {/if}
                </strong>

                <Icon name="arrow_right" class="group-open:rotate-90 transition-all select-none" />
              </span>
            </summary>
          {/snippet}
        </CollapsibleTrigger>

        <CollapsibleContent forceMount class="flex flex-col gap-y-1">
          {#snippet child({ props })}
            <NavigationMenuList {...props} class="contents">
              {#snippet child({ props })}
                <ul {...props} class="contents">
                  {@render children()}
                </ul>
              {/snippet}
            </NavigationMenuList>
          {/snippet}
        </CollapsibleContent>
      </details>
    {/snippet}
  </CollapsibleRoot>
</NavigationMenuItem>
