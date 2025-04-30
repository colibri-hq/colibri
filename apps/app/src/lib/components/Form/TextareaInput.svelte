<script lang="ts">
  import { createBubbler } from 'svelte/legacy';

  const bubble = createBubbler();
  const classes = `resize-none ${className}`;

  interface Props {
    class?: string;
    id?: string;
    name: string;
    value?: string;
    disabled?: boolean;

    [key: string]: unknown;
  }

  let {
    class: className = '',
    id = '',
    name,
    value = $bindable(''),
    disabled = false,
    ...rest
  }: Props = $props();

  let textarea = $state(null);
  let height = 120;

  type ResizeEvent = CustomEvent<{
    rect: DOMRectReadOnly;
    target: HTMLTextAreaElement;
  }>;

  function onResize(event: ResizeEvent) {
    textarea = event.target;
    height = event.detail.rect.height;
  }

  export function resize(node: Element) {
    let rect: DOMRectReadOnly;
    let target: Element;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        rect = entry.contentRect;
        target = entry.target;
      }

      node.dispatchEvent(
        new CustomEvent('resize', {
          detail: { rect, target },
        }) as ResizeEvent,
      );
    });

    resizeObserver.observe(node);

    return {
      destroy: () => resizeObserver.disconnect(),
    };
  }

  let rows = $derived(((value && value.match(/\n/g)) || []).length + 1 || 1);
</script>

<textarea
  {...rest}
  bind:this={textarea}
  bind:value
  class={classes}
  {disabled}
  {id}
  {name}
  onblur={bubble('blur')}
  onchange={bubble('change')}
  onfocus={bubble('focus')}
  oninput={bubble('input')}
  onkeydown={bubble('keydown')}
  onkeypress={bubble('keypress')}
  onkeyup={bubble('keyup')}
  onresize={onResize}
  onsubmit={bubble('submit')}
  {rows}
  style="--height:auto"
  use:resize
></textarea>

<style>
  textarea {
    height: var(--height);
  }
</style>
