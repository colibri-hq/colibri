<script lang="ts">
  import { Icon } from '@colibri-hq/ui';

  interface Props {
    class?: string;
    message?: string | undefined;
    icon?: string;
    children?: import('svelte').Snippet;

    [key: string]: unknown;
  }

  let {
    class: className = '',
    message = undefined,
    icon = 'sentiment_dissatisfied',
    children,
    ...rest
  }: Props = $props();
</script>

<div
  {...rest}
  class="error mb-8 flex max-w-lg items-start rounded bg-red-500 px-4 py-2 text-white shadow-md {className}"
>
  <Icon class="mt-1 mr-4" name={icon} />
  {#if children}{@render children()}{:else}<span>{message}</span>{/if}
</div>
