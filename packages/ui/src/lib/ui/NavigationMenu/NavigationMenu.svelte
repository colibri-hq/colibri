<script lang="ts">
  import { NavigationMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    class?: string;
    orientation?: 'vertical' | 'horizontal';

    [key: string]: unknown;
  }

  const {
    children,
    class: className,
    orientation = 'vertical',
    ...rest
  }: Props = $props();
  const NavigationMenuRoot = NavigationMenu.Root;
  const NavigationMenuList = NavigationMenu.List;
</script>

<NavigationMenuRoot {...rest} class={className} {orientation}>
  <NavigationMenuList>
    {#snippet child({ props })}
      <ul {...props}>
        {@render children()}
      </ul>
    {/snippet}
  </NavigationMenuList>
</NavigationMenuRoot>
