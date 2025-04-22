<script lang="ts">
  import Button from '../Button/Button.svelte';
  import Icon from '../Icon/Icon.svelte';
  import { onDestroy, type Snippet } from 'svelte';

  interface Props {

    /**
     * The value to copy to the clipboard.
     */
    value: string;

    /**
     * The value to copy to the clipboard. This can be a string or a Snippet.
     * If a Snippet is provided, it will be called with the `complete` state as
     * an argument.
     */
    icon?: string | Snippet<[boolean]>;

    /**
     * The icon to display when the copy operation is in progress. This can
     * be a string or a Snippet. If a Snippet is provided, it will be called
     * with the `complete` state as an argument.<br>
     * The complete icon will be displayed for a short time after the copy
     * operation is complete.
     */
    completeIcon?: string | Snippet<[boolean]>;

    /**
     * The label to display when the copy operation is in progress. This can
     * be a string or a Snippet. If a Snippet is provided, it will be called
     * with the `complete` state as an argument.
     */
    label?: string | Snippet<[boolean]>;

    /**
     * The label to display when the copy operation is complete. This can be a
     * string or a Snippet. If a Snippet is provided, it will be called with the
     * `complete` state as an argument.<br>
     * The complete label will be displayed for a short time after the copy
     * operation is complete.
     */
    completeLabel?: string | Snippet<[boolean]>;

    /**
     * The timeout in milliseconds after which the copy complete state will
     * reset, returning the button to its original state.
     */
    resetCompleteTimeout?: number;

    /**
     * The content of the button. Populating this will override the default icon
     * and label.
     */
    children?: Snippet<[string, boolean]>;

    /**
     * Additional props to pass to the button.
     */
    [key: string]: unknown;
  }

  let {
    value,
    icon = 'content_copy',
    completeIcon = 'check',
    label = 'Copy',
    completeLabel = 'Copied',
    resetCompleteTimeout = 3_000,
    children,
    ...rest
  }: Props = $props();

  let complete = $state(false);

  // Reset the complete state after the timeout
  $effect(() => {
    if (complete) {
      timeout = setTimeout(() => complete = false, resetCompleteTimeout);
    } else if (timeout) {
      clearTimeout(timeout);
    }
  });
  let timeout = $state<ReturnType<typeof setTimeout> | null>(null);
  const currentLabel = $derived.by(() => complete ? completeLabel : label);
  const currentIcon = $derived.by(() => complete ? completeIcon : icon);

  async function copyToClipboard() {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      complete = false;
      await navigator.clipboard.writeText(value);
      complete = true;
    }

    return Promise.reject('The Clipboard API is not available');
  }

  onDestroy(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
</script>

<Button {...rest} disabled={!value} onclick={copyToClipboard}>
  {#if children}
    {@render children(value, complete)}
  {:else}
    {#if typeof currentIcon === 'string'}
      <Icon class="pr-1 text-xl leading-none" name={currentIcon} />
    {:else}
      <Icon class="pr-1 text-xl leading-none">
        {@render currentIcon(complete)}
      </Icon>
    {/if}

    <span>
      {#if typeof currentLabel === 'string'}
        {currentLabel}
      {:else}
        {@render currentLabel(complete)}
      {/if}
    </span>
  {/if}
</Button>
