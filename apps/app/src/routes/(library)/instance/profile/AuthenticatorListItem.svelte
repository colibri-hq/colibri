<script lang="ts">
  import { tick } from 'svelte';
  import dayjs from 'dayjs';
  import type { Authenticator } from '@colibri-hq/sdk';
  import { BrowserIcon } from '@colibri-hq/ui';
  import { Button } from '@colibri-hq/ui';
  import { Icon } from '@colibri-hq/ui';

  interface Props {
    authenticator: Authenticator;
    removable?: boolean;
    disabled?: boolean;
    onRemove?: (authenticator: Authenticator) => void;
  }

  let {
    authenticator,
    removable = true,
    disabled = false,
    onRemove,
  }: Props = $props();

  let editing = $state(false);
  let nameInput = $state<HTMLInputElement | undefined>();
  let agent = $derived(authenticator.agent?.toLowerCase() || 'webkit');

  function remove() {
    onRemove?.(authenticator);
  }

  async function editName() {
    editing = true;
    await tick();
    nameInput?.focus({ preventScroll: true });
    nameInput?.select();
  }

</script>

<div
  class="flex items-start py-2 group-first:pt-0 group-last:pb-0 md:items-center"
>
  <BrowserIcon
    alt="Logo of the browser used to set up the authenticator"
    src={agent}
    class="mt-1 md:mt-0"
  />

  <div class="flex flex-col">
    <div class="ml-4 w-full font-bold md:mr-2 dark:text-gray-300">
      {#if !editing}
        <button onclick={editName}>
          <strong>{authenticator.handle}</strong>
          <Icon name="edit" class="text-sm text-gray-500" />
        </button>
      {:else}
        <input
          type="text"
          {disabled}
          value={authenticator.handle}
          bind:this={nameInput}
          class="-mx-0.5 w-full rounded border-none bg-transparent px-0.5 py-0 focus:outline-0 focus:ring-2"
        />
      {/if}
    </div>

    <span class="ml-4 text-sm text-gray-500">
      {#if authenticator.last_used_at !== null}
        {@const lastUsed = new Date(authenticator.last_used_at)}
        <time datetime={lastUsed.toISOString()}>
          last used {dayjs(lastUsed).fromNow()}
        </time>
      {:else}
        <span>not used yet</span>
      {/if}
    </span>
  </div>

  {#if removable}
    <Button
      variant="subtle"
      size="small"
      class="ml-auto mt-1 leading-none lg:mt-0"
      onClick={remove}
      {disabled}
    >
      <Icon name="delete_forever" class="text-2xl" />
    </Button>
  {/if}
</div>
