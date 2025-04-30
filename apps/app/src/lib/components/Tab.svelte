<script lang="ts">
  import { getContext, type Snippet } from 'svelte';
  import type { TabsContext } from '$lib/components/Tabs.svelte';
  import { writable } from 'svelte/store';
  import type { Action } from 'svelte/action';
  import { twMerge } from 'tailwind-merge';

  interface Props {
    open?: boolean;
    disabled?: boolean;
    title?: Snippet | string;

    onActivate?: () => unknown;
    onBlur?: () => unknown;
    onContextmenu?: () => unknown;
    onFocus?: () => unknown;
    onKeydown?: () => unknown;
    onKeyup?: () => unknown;
    onMouseenter?: () => unknown;
    onMouseleave?: () => unknown;
    onMouseover?: () => unknown;

    children?: Snippet;

    [key: string]: unknown;
  }

  let {
    open = $bindable(false),
    disabled = false,
    title = '',
    children,
    onActivate,
    onBlur,
    onContextmenu,
    onFocus,
    onKeydown,
    onKeyup,
    onMouseenter,
    onMouseleave,
    onMouseover,

    ...rest
  }: Props = $props();

  const context = getContext<TabsContext>('tabs') ?? {};
  const selected = context.selected || writable<HTMLElement>();
  const isDisabled = $derived.by(() => disabled || context.disabled || false);
  const selectable = $derived.by(() => !isDisabled && !open);

  const tab: Action = function tab(node: HTMLElement) {
    selected.set(node);

    const destroy = selected.subscribe((child) => {
      if (child !== node) {
        open = false;
      }
    });

    return { destroy };
  };

  function openTab() {
    open = true;
    onActivate?.();
  }

  const classes = $derived.by(() =>
    twMerge(
      'mx-2 group-first:ml-0 group-last:mr-0 px-0.5 py-2 border-b-2 border-transparent ' +
        'focus:outline-none transition hover:border-b-blue-500/50 focus-visible:border-b-blue-500/50',
      context.classes,
      open
        ? 'border-b-blue-500 hover:border-b-blue-500'
        : 'border-b-transparent',
      isDisabled ? 'opacity-50' : '',
      open && isDisabled ? 'border-b-gray-500' : '',
    ),
  );
</script>

<li class="group contents" role="presentation">
  <button
    {...rest}
    class={classes}
    disabled={!selectable}
    onclick={openTab}
    onblur={onBlur}
    oncontextmenu={onContextmenu}
    onfocus={onFocus}
    onkeydown={onKeydown}
    onkeyup={onKeyup}
    onmouseenter={onMouseenter}
    onmouseleave={onMouseleave}
    onmouseover={onMouseover}
    role="tab"
    tabindex={selectable ? 0 : -1}
    type="button"
  >
    {#if typeof title === 'string'}
      {title}
    {:else}
      {@render title()}
    {/if}
  </button>

  {#if open}
    <div class="tab_content_placeholder hidden">
      <div use:tab>
        {@render children()}
      </div>
    </div>
  {/if}
</li>
