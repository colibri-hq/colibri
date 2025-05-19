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
  <NavigationMenuList class="contents">
    {#snippet child({ props })}
      <ul class="contents" {...props}>
        {@render children()}
      </ul>
    {/snippet}
  </NavigationMenuList>
</NavigationMenuRoot>
