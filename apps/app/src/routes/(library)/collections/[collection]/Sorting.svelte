<script lang="ts">
  import { Button } from '@colibri-hq/ui';
  import { Icon } from '@colibri-hq/ui';
  import { createMenu } from 'svelte-headlessui';
  import type { Book } from '@colibri-hq/sdk';

  const menu = createMenu({ label: 'Actions' });

  interface Props {
    field?: keyof Book;
    onChange?: (event: { field: keyof Book }) => unknown;
  }

  let { field = $bindable('updated_at'), onChange }: Props = $props();

  function onSelect({ detail: { selected } }: CustomEvent<{ selected: string }>) {
    const icon = selected.split(' ').shift();
    field = options.find((item) => item.icon === icon)!.field;

    onChange?.({ field });
  }

  const options: { icon: string; field: keyof Book; label: string }[] = [
    { icon: 'event', label: `Last Updated`, field: 'updated_at' },
    { icon: 'title', label: `Title`, field: 'title' },
    { icon: 'star', label: `Rating`, field: 'rating' },
    {
      icon: 'breaking_news_alt_1',
      label: `Publishing Date`,
      field: 'published_at',
    },
    { icon: 'face', label: `Author`, field: 'author_id' },
  ] as const;

  let fieldLabel = $derived(
    options.find((item) => item.field === field)?.label || '',
  );
</script>

<div class="flex w-full flex-col items-center justify-center">
  <div class="relative text-right">
    <div class="relative inline-block text-left">
      <div class="contents" onselect={onSelect} use:menu.button>
        <Button class="!pr-2" variant="subtle">
          <span class="mr-2">Sort by: {fieldLabel}</span>
          <Icon class="text-lg" name="expand_more" />
        </Button>
      </div>

      {#if $menu.expanded}
        <div
          use:menu.items
          class="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:divide-gray-800 dark:bg-black dark:ring-gray-700"
        >
          {#each options as option, index (index)}
            <button
              use:menu.item
              class="group flex w-full items-center px-2 py-2 text-sm {$menu.active ===
              option.label
                ? 'bg-blue-500 text-white'
                : 'text-gray-900 dark:text-gray-400'}"
            >
              <Icon name={option.icon} class="mr-2 text-xl"></Icon>
              <span>{option.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
