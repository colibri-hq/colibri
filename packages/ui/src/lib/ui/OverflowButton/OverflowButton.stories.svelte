<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import OverflowButton, { Divider, type OverflowOption } from './OverflowButton.svelte';
  import { Icon } from '$lib/ui';

  const { Story } = defineMeta({
    title: 'Actions/OverflowButton',
    component: OverflowButton,
    argTypes: {
      // region Data
      open: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      disabled: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      // endregion

      // region Control
      side: {
        control: {
          type: 'radio',
          labels: {
            top: 'Top',
            bottom: 'Bottom',
            left: 'Left',
            right: 'Right',
          },
        },
        options: ['top', 'bottom', 'left', 'right'],
        table: {
          category: 'Control',
        },
      },
      align: {
        control: {
          type: 'radio',
          labels: {
            start: 'Start',
            center: 'Center',
            end: 'End',
          },
        },
        options: ['start', 'center', 'end'],
        table: {
          category: 'Control',
        },
      },
      sideOffset: {
        control: 'number',
        table: {
          category: 'Control',
        },
      },
      // endregion

      // region Styling
      class: {
        control: 'text',
        table: {
          category: 'Styling',
        },
      },
      contentClass: {
        control: 'text',
        table: {
          category: 'Styling',
        },
      },
      'aria-label': {
        control: 'text',
        table: {
          category: 'Accessibility',
        },
      },
      // endregion

      // region Events
      onclick: {
        action: 'click',
        table: {
          category: 'Events',
        },
      },
      onOpenChange: {
        action: 'openChange',
        table: {
          category: 'Events',
        },
      },
      // endregion

      // region Slots
      children: {
        control: false,
        table: {
          category: 'Slots',
        },
      },
      item: {
        control: false,
        table: {
          category: 'Slots',
        },
      },
      // endregion
    },
    args: {
      open: false,
      disabled: false,
      side: 'bottom',
      align: 'end',
      sideOffset: 4,
      'aria-label': 'More options',
    },
  });
</script>

<script lang="ts">
  function handleAction(name: string) {
    console.log(`Action: ${name}`);
  }

  const defaultOptions = [
    { id: 'edit', title: 'Edit', icon: 'edit', onselect: () => handleAction('edit') },
    { id: 'duplicate', title: 'Duplicate', icon: 'content_copy', onselect: () => handleAction('duplicate') },
    Divider,
    { id: 'delete', title: 'Delete', icon: 'delete', onselect: () => handleAction('delete') },
  ] as const;

  const linkOptions = [
    { id: 'view', title: 'View Details', icon: 'visibility', href: '#view' },
    { id: 'download', title: 'Download', icon: 'download', href: '#download' },
    Divider,
    { id: 'share', title: 'Share', icon: 'share', onselect: () => handleAction('share') },
  ] as const;
</script>

<Story name="Default">
  <div class="flex min-h-[300px] items-center justify-center">
    <OverflowButton onclick={() => handleAction('primary')} options={defaultOptions}>
      <Icon name="add" />
      <span>New Item</span>
    </OverflowButton>
  </div>
</Story>

<Story name="Dropdown Only">
  <div class="flex min-h-[300px] items-center justify-center">
    <OverflowButton options={defaultOptions} />
  </div>
</Story>

<Story name="With Links">
  <div class="flex min-h-[300px] items-center justify-center">
    <OverflowButton onclick={() => handleAction('open')} options={linkOptions}>
      <Icon name="folder_open" />
      <span>Open</span>
    </OverflowButton>
  </div>
</Story>

<Story name="Custom Item Rendering">
  <div class="flex min-h-[300px] items-center justify-center">
    <OverflowButton onclick={() => handleAction('save')} options={defaultOptions}>
      {#snippet item(option: OverflowOption)}
        <span class="font-bold text-blue-600 dark:text-blue-400">{option.title}</span>
        {#if option.icon}
          <Icon name={option.icon} class="ml-auto text-gray-400" />
        {/if}
      {/snippet}
      <Icon name="save" />
      <span>Save</span>
    </OverflowButton>
  </div>
</Story>

<Story name="Disabled">
  <div class="flex min-h-[300px] items-center justify-center">
    <OverflowButton disabled onclick={() => handleAction('primary')} options={defaultOptions}>
      <Icon name="block" />
      <span>Disabled</span>
    </OverflowButton>
  </div>
</Story>

<Story name="All Positions">
  <div class="grid min-h-[400px] grid-cols-2 gap-8 p-8">
    {#each ['top', 'bottom', 'left', 'right'] as side (side)}
      <div class="flex items-center justify-center">
        <OverflowButton
          {side}
          align="center"
          options={[
            { id: 'item1', title: 'Item 1', onselect: () => {} },
            { id: 'item2', title: 'Item 2', onselect: () => {} },
            { id: 'item3', title: 'Item 3', onselect: () => {} },
          ]}
        >
          <span class="text-sm capitalize">{side}</span>
        </OverflowButton>
      </div>
    {/each}
  </div>
</Story>
