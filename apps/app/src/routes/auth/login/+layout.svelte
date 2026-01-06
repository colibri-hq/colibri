<script lang="ts">
  import type { LayoutData } from './$types';

  interface Props {
    data: LayoutData;
    children?: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();
  const error = $derived('error' in data && typeof data.error === 'string'
    ? data.error
    : undefined);
</script>

{@render children?.()}

{#if error}
  <div class="mt-4 text-red-500">
    <div class="flex flex-col">
      <span>{error}</span>
    </div>
  </div>
{/if}
