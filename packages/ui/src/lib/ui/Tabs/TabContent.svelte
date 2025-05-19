<script lang="ts">
  import { Tabs } from 'bits-ui';
  import { twMerge } from 'tailwind-merge';
  import type { Snippet } from 'svelte';

  interface Props {
    value: string;
    class?: string;
    children: Snippet;
    [key: string]: unknown;
  }

  const {
    class: className,
    children,
    value,
    ...rest
  }: Props = $props();

  const TabsContent = Tabs.Content;

</script>

<TabsContent {value} class={twMerge('', className)} {...rest}>
  {@render children?.()}
</TabsContent>
