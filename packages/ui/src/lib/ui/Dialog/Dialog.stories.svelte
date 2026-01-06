<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Dialog from './Dialog.svelte';

  const { Story } = defineMeta({
    title: 'Display/Dialog',
    component: Dialog,
    argTypes: {
      // region Data
      open: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      title: {
        control: 'text',
        table: {
          category: 'Data',
        },
      },
      description: {
        control: 'text',
        table: {
          category: 'Data',
        },
      },
      maxWidth: {
        control: 'select',
        options: ['sm', 'md', 'lg', 'xl', 'full'],
        table: {
          category: 'Data',
        },
      },
      showCloseButton: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      closeOnClickOutside: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      closeOnEscape: {
        control: 'boolean',
        table: {
          category: 'Data',
        },
      },
      // endregion

      // region Styling
      class: {
        control: false,
        table: {
          category: 'Styling',
        },
      },
      // endregion

      // region Events
      onClose: {
        action: 'close',
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
      footer: {
        control: false,
        table: {
          category: 'Slots',
        },
      },
      // endregion

      // region Refs
      ref: {
        control: false,
        table: {
          category: 'Refs',
        },
      },
      // endregion
    },
    args: {
      open: false,
      title: 'Dialog Title',
      description: 'Optional description text for the dialog.',
      maxWidth: 'md',
      showCloseButton: true,
      closeOnClickOutside: true,
      closeOnEscape: true,
    },
  });
</script>

<script lang="ts">
  import { Button } from '../Button/index.js';

  let basicOpen = $state(false);
  let confirmOpen = $state(false);
  let formOpen = $state(false);
  let widthOpen = $state(false);
  let noCloseButtonOpen = $state(false);
</script>

<Story name="Default">
  <Button label="Open Dialog" onClick={() => (basicOpen = true)} />

  <Dialog
    bind:open={basicOpen}
    onClose={() => (basicOpen = false)}
    title="Dialog Title"
    description="This is a description for the dialog that provides additional context."
  >
    <div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        This is a Dialog component. It uses the native HTML dialog element
        and includes:
      </p>
      <ul class="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
        <li>Focus trapping</li>
        <li>Escape key handling</li>
        <li>Click outside to close</li>
        <li>Body scroll lock</li>
        <li>Accessible title and description</li>
      </ul>
    </div>

    {#snippet footer()}
      <div class="flex justify-end">
        <Button label="Close" onClick={() => (basicOpen = false)} />
      </div>
    {/snippet}
  </Dialog>
</Story>

<Story name="Confirmation Dialog">
  <Button label="Delete Item" onClick={() => (confirmOpen = true)} />

  <Dialog
    bind:open={confirmOpen}
    onClose={() => (confirmOpen = false)}
    title="Delete Item?"
    description="Are you sure you want to delete this item? This action cannot be undone."
    maxWidth="sm"
  >
    {#snippet footer()}
      <div class="flex justify-end gap-2">
        <Button label="Cancel" variant="ghost" onClick={() => (confirmOpen = false)} />
        <Button label="Delete" class="bg-red-600 hover:bg-red-700" onClick={() => (confirmOpen = false)} />
      </div>
    {/snippet}
  </Dialog>
</Story>

<Story name="Form Dialog">
  <Button label="Edit Profile" onClick={() => (formOpen = true)} />

  <Dialog
    bind:open={formOpen}
    onClose={() => (formOpen = false)}
    title="Edit Profile"
  >
    <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); formOpen = false; }}>
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
        <input
          id="name"
          type="text"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          placeholder="Enter your name"
        />
      </div>
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
        <input
          id="email"
          type="email"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          placeholder="Enter your email"
        />
      </div>
    </form>

    {#snippet footer()}
      <div class="flex justify-end gap-2">
        <Button label="Cancel" variant="ghost" onClick={() => (formOpen = false)} />
        <Button label="Save" onClick={() => (formOpen = false)} />
      </div>
    {/snippet}
  </Dialog>
</Story>

<Story name="Width Variants">
  <div class="flex flex-wrap gap-2">
    <Button label="Small (sm)" onClick={() => (widthOpen = true)} />
  </div>

  <Dialog
    bind:open={widthOpen}
    onClose={() => (widthOpen = false)}
    title="Small Dialog"
    description="This dialog uses maxWidth='sm' for a narrower layout."
    maxWidth="sm"
  >
    <p class="text-gray-700 dark:text-gray-300">
      This is a smaller dialog, suitable for simple confirmations or quick actions.
    </p>

    {#snippet footer()}
      <div class="flex justify-end">
        <Button label="Got it" onClick={() => (widthOpen = false)} />
      </div>
    {/snippet}
  </Dialog>
</Story>

<Story name="No Close Button">
  <Button label="Open (No X Button)" onClick={() => (noCloseButtonOpen = true)} />

  <Dialog
    bind:open={noCloseButtonOpen}
    onClose={() => (noCloseButtonOpen = false)}
    title="No Close Button"
    description="This dialog hides the close button. Use the footer button to close."
    showCloseButton={false}
  >
    <p class="text-gray-700 dark:text-gray-300">
      When <code>showCloseButton=false</code>, you must provide your own way to close the dialog.
    </p>

    {#snippet footer()}
      <div class="flex justify-end">
        <Button label="Close Dialog" onClick={() => (noCloseButtonOpen = false)} />
      </div>
    {/snippet}
  </Dialog>
</Story>
