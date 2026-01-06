<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CommandPalette, {
    type CommandPaletteGroup,
    type CommandPaletteOption,
  } from './CommandPalette.svelte';

  const { Story } = defineMeta({
    title: 'Navigation/CommandPalette',
    component: CommandPalette,
    argTypes: {
      // region Data
      open: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      value: {
        control: 'text',
        table: {
          category: 'Data',
        },
      },
      placeholder: {
        control: 'text',
        table: {
          category: 'Data',
        },
      },
      emptyMessage: {
        control: 'text',
        table: {
          category: 'Data',
        },
      },
      shouldFilter: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      loop: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      vimBindings: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      isLoading: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      // endregion

      // region Events
      onOpenChange: {
        action: 'openChange',
        table: {
          category: 'Events',
        },
      },
      onValueChange: {
        action: 'valueChange',
        table: {
          category: 'Events',
        },
      },
      // endregion

      // region Slots
      item: {
        control: false,
        table: {
          category: 'Slots',
        },
      },
      loading: {
        control: false,
        table: {
          category: 'Slots',
        },
      },
      // endregion
    },
    args: {
      open: false,
      placeholder: 'Search...',
      emptyMessage: 'No results found',
      shouldFilter: true,
      loop: true,
      vimBindings: true,
      isLoading: false,
    },
  });
</script>

<script lang="ts">
  import { Button } from '../Button/index.js';
  import { Icon } from '../Icon/index.js';
  import { LoadingIndicator } from '../LoadingIndicator/index.js';

  let basicOpen = $state(false);
  let groupedOpen = $state(false);
  let externalFilterOpen = $state(false);
  let customRenderOpen = $state(false);
  let loadingOpen = $state(false);
  let externalQuery = $state('');

  function handleSelect(title: string) {
    console.log('Selected:', title);
    basicOpen = false;
    groupedOpen = false;
    externalFilterOpen = false;
    customRenderOpen = false;
    loadingOpen = false;
  }

  // Basic commands
  const basicGroups: CommandPaletteGroup[] = [
    {
      id: 'commands',
      items: [
        { id: 'new-file', title: 'New File', icon: 'description', onselect: () => handleSelect('New File') },
        { id: 'open-folder', title: 'Open Folder', icon: 'folder_open', onselect: () => handleSelect('Open Folder') },
        { id: 'settings', title: 'Settings', icon: 'settings', onselect: () => handleSelect('Settings') },
      ],
    },
  ];

  // Grouped commands with keyboard shortcuts
  const groupedGroups: CommandPaletteGroup[] = [
    {
      id: 'file',
      heading: 'File',
      items: [
        { id: 'new', title: 'New File', subtitle: '⌘N', onselect: () => handleSelect('New') },
        { id: 'save', title: 'Save', subtitle: '⌘S', onselect: () => handleSelect('Save') },
      ],
    },
    {
      id: 'edit',
      heading: 'Edit',
      items: [
        { id: 'undo', title: 'Undo', subtitle: '⌘Z', onselect: () => handleSelect('Undo') },
        { id: 'redo', title: 'Redo', subtitle: '⌘⇧Z', onselect: () => handleSelect('Redo') },
      ],
    },
  ];

  // Sample data for external filtering demo
  const allItems = [
    { id: '1', title: 'Getting Started', category: 'Docs' },
    { id: '2', title: 'Installation', category: 'Docs' },
    { id: '3', title: 'Configuration', category: 'Docs' },
    { id: '4', title: 'API Reference', category: 'Docs' },
    { id: '5', title: 'Components', category: 'Guides' },
    { id: '6', title: 'Themes', category: 'Guides' },
    { id: '7', title: 'Plugins', category: 'Guides' },
  ];

  const filteredGroups = $derived.by((): CommandPaletteGroup[] => {
    const filtered = externalQuery
      ? allItems.filter(
          (item) =>
            item.title.toLowerCase().includes(externalQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(externalQuery.toLowerCase()),
        )
      : allItems;

    if (filtered.length === 0) return [];

    return [
      {
        id: 'results',
        heading: 'Results',
        items: filtered.map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.category,
          onselect: () => handleSelect(item.title),
        })),
      },
    ];
  });

  // Custom rendering demo data
  const customGroups: CommandPaletteGroup[] = [
    {
      id: 'users',
      heading: 'Team Members',
      items: [
        { id: 'alice', title: 'Alice Johnson', data: { role: 'Designer', avatar: '👩‍🎨' } },
        { id: 'bob', title: 'Bob Smith', data: { role: 'Developer', avatar: '👨‍💻' } },
        { id: 'carol', title: 'Carol Williams', data: { role: 'Manager', avatar: '👩‍💼' } },
      ],
    },
  ];
</script>

<Story name="Default">
  <div class="flex flex-col gap-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Press the button or use <kbd class="rounded bg-gray-100 px-1 dark:bg-gray-800">⌘K</kbd> to open
    </p>
    <Button label="Open Command Palette" onClick={() => (basicOpen = true)} />
  </div>

  <CommandPalette
    bind:open={basicOpen}
    placeholder="Type a command or search..."
    emptyMessage="No commands found"
    groups={basicGroups}
  />
</Story>

<Story name="With Groups">
  <Button label="Open Grouped Palette" onClick={() => (groupedOpen = true)} />

  <CommandPalette
    bind:open={groupedOpen}
    placeholder="Search commands..."
    groups={groupedGroups}
  />
</Story>

<Story name="External Filtering">
  <div class="flex flex-col gap-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      This example shows how to use the CommandPalette with external filtering,
      useful for async search (like Pagefind).
    </p>
    <Button label="Open Search" onClick={() => (externalFilterOpen = true)} />
  </div>

  <CommandPalette
    bind:open={externalFilterOpen}
    bind:value={externalQuery}
    placeholder="Search documentation..."
    emptyMessage={externalQuery ? 'No results found' : 'Type to search...'}
    shouldFilter={false}
    groups={filteredGroups}
  />
</Story>

<Story name="Custom Item Rendering">
  <div class="flex flex-col gap-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Use the item snippet to customize how each option is rendered.
    </p>
    <Button label="Open Team Picker" onClick={() => (customRenderOpen = true)} />
  </div>

  <CommandPalette
    bind:open={customRenderOpen}
    placeholder="Search team members..."
    groups={customGroups}
  >
    {#snippet item(option, _group)}
      {@const data = option.data as { role: string; avatar: string }}
      <span class="text-2xl">{data.avatar}</span>
      <div class="flex flex-col">
        <span class="font-medium">{option.title}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400">{data.role}</span>
      </div>
    {/snippet}
  </CommandPalette>
</Story>

<Story name="Loading State">
  <div class="flex flex-col gap-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Shows a loading indicator while fetching results.
    </p>
    <Button label="Open Loading Demo" onClick={() => (loadingOpen = true)} />
  </div>

  <CommandPalette
    bind:open={loadingOpen}
    placeholder="Search..."
    shouldFilter={false}
    isLoading={true}
    groups={[]}
  >
    {#snippet loading()}
      <div class="flex flex-col items-center justify-center gap-2">
        <LoadingIndicator size="small" />
        <span>Searching...</span>
      </div>
    {/snippet}
  </CommandPalette>
</Story>
