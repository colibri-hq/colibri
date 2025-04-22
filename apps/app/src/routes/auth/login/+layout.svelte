<script lang="ts">
  import { run } from 'svelte/legacy';
  import type { LayoutData } from './$types';

  interface Props {
    data: LayoutData;
    children?: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();

  let error: string | undefined = $state(undefined);

  run(() => {
    error =
      'error' in data && typeof data.error === 'string'
        ? data.error
        : undefined;
  });
</script>

{@render children?.()}

{#if error}
  <div class="mt-4 text-red-500">
    <div class="flex flex-col">
      <span>{error}</span>
    </div>
  </div>
{/if}
