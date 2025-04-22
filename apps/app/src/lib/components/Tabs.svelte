<script module lang="ts">
  import { type Writable } from 'svelte/store';

  export interface TabsContext {
    disabled: boolean;
    selected: Writable<HTMLElement | null>;
    classes?: string;
  }
</script>

<script lang="ts">
  import type { Action } from 'svelte/action';
  import { setContext, type Snippet } from 'svelte';
  import { writable } from 'svelte/store';

  interface Props {
    disabled?: boolean;
    divider?: true | Snippet;
    grow?: boolean;
    children: Snippet;
  }

  const {
    disabled = false,
    divider = true,
    grow = false,
    children,
  }: Props = $props();

  const context = setContext<TabsContext>('tabs', {
    disabled,
    selected: writable<HTMLElement | null>(null),
    classes: grow ? 'grow' : '',
  });

  const tabs: Action = function tabs(node) {
    const destroy = context.selected.subscribe((child) => {
      if (child) {
        node.replaceChildren(child);
      }
    });

    return { destroy };
  };
</script>

<ul
  class="flex items-center"
  class:pointer-events-none={disabled}
  role="tablist"
>
  {@render children()}
</ul>

{#if divider === true}
  <div class="-mt-px h-px bg-gray-200 dark:bg-gray-700"></div>
{:else if divider}
  {@render divider()}
{/if}

<div aria-labelledby="id-tab" class="mt-4" role="tabpanel" use:tabs></div>
