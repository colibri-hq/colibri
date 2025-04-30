<script lang="ts">
  import { type Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';
  import Icon from '../Icon/Icon.svelte';
  import { NavigationMenu } from 'bits-ui';

  interface Props {
    class?: string;
    open?: boolean;
    initialOpen?: boolean;
    label?: string | Snippet;
    children: Snippet;
  }

  let {
    initialOpen = false,
    open = $bindable(initialOpen),
    class: className = '',
    label,
    children,
  }: Props = $props();
  const NavigationMenuRoot = NavigationMenu.Root;
  const NavigationMenuTrigger = NavigationMenu.Trigger;
  const NavigationMenuItem = NavigationMenu.Item;
  const NavigationMenuContent = NavigationMenu.Content;
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

<NavigationMenuRoot>
  {#snippet child({ props })}
    <details
      {...props}
      class={twMerge('flex flex-col gap-4', className, 'group')}
      {open}
    >
      <NavigationMenuItem>
        <NavigationMenuTrigger>
          {#snippet child({ props })}
            <summary
              {...props}
              class="list-none flex items-center gap-1 border-b my-1 sm:ps-2.5 sm:mt-0 border-gray-200
            dark:border-gray-700 sm:border-none cursor-pointer select-none focus-visible:outline-none text-gray-600
            dark:text-gray-400 focus-visible:text-white dark:focus-visible:text-gray-200 hover:text-gray-700
            dark:hover:text-gray-300 transition"
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
        </NavigationMenuTrigger>

        <NavigationMenuContent>
          <NavigationMenuList>
            {#snippet child({ props })}
              <ul {...props} class="flex flex-col gap-y-1">
                {@render children()}
              </ul>
            {/snippet}
          </NavigationMenuList>
        </NavigationMenuContent>
      </NavigationMenuItem>
    </details>
  {/snippet}
</NavigationMenuRoot>
