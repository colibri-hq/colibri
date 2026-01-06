<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Modal from './Modal.svelte';

  const { Story } = defineMeta({
    title: 'Display/Modal',
    component: Modal,
    argTypes: {
      // region Data
      open: {
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
      // endregion

      // region Slots
      header: {
        control: false,
        table: {
          category: 'Slots',
        },
      },
      children: {
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
    },
  });
</script>

<script lang="ts">
  import { Button } from '../Button/index.js';
  import { Popover } from '../Popover/index.js';

  let open = $state(false);
  let modalWithPopoverOpen = $state(false);
  let longOpen = $state(false);
</script>

<Story name="Default">
  <Button label="Open Modal" onClick={() => (open = true)} />

  <Modal bind:open onClose={() => (open = false)}>
    {#snippet header()}
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Modal Dialog
      </h2>
    {/snippet}

    <div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        This is a modal dialog component. It uses the HTML dialog element
        with Portal for proper rendering and includes:
      </p>
      <ul class="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
        <li>Focus trapping</li>
        <li>Escape key handling</li>
        <li>Click outside to close</li>
        <li>Body scroll lock</li>
        <li>Accessible close button</li>
      </ul>
      <Button label="Close Modal" onClick={() => (open = false)} />
    </div>
  </Modal>
</Story>

<Story name="Modal with Popover">
  <Button label="Open Modal with Popover" onClick={() => (modalWithPopoverOpen = true)} />

  <Modal bind:open={modalWithPopoverOpen} onClose={() => (modalWithPopoverOpen = false)}>
    {#snippet header()}
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Modal with Popover Test
      </h2>
    {/snippet}

    <div class="space-y-4">
      <p class="text-gray-700 dark:text-gray-300">
        This demonstrates that popovers work correctly inside modals.
        The popover uses the HTML popover API which renders in the top layer,
        avoiding clipping issues.
      </p>

      <div class="flex gap-4">
        <Popover>
          {#snippet trigger({ open: popoverOpen, props })}
            <Button {...props} label={popoverOpen ? 'Close Popover' : 'Open Popover'} />
          {/snippet}
          <div
            class="rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-950"
          >
            <p class="mb-2 font-semibold text-gray-900 dark:text-gray-100">
              Popover inside Modal
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              This popover renders correctly without being clipped by the dialog.
            </p>
          </div>
        </Popover>

        <Popover side="top">
          {#snippet trigger({ props })}
            <Button {...props} label="Top Popover" />
          {/snippet}
          <div
            class="rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-950"
          >
            <p class="text-sm text-gray-900 dark:text-gray-100">
              Positioned on top
            </p>
          </div>
        </Popover>
      </div>

      <Button label="Close Modal" onClick={() => (modalWithPopoverOpen = false)} />
    </div>
  </Modal>
</Story>

<Story name="Long Content">
  <Button label="Open Long Modal" onClick={() => (longOpen = true)} />

  <Modal bind:open={longOpen} onClose={() => (longOpen = false)}>
    {#snippet header()}
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Long Content Modal
      </h2>
    {/snippet}

    <div class="space-y-4">
      {#each Array(20) as _, i (i)}
        <p class="text-gray-700 dark:text-gray-300">
          Paragraph {i + 1}: This is a test of scrolling behavior in modals.
          The content should scroll while the header remains sticky at the top.
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      {/each}
    </div>
  </Modal>
</Story>
