<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Popover from './Popover.svelte';

  const { Story } = defineMeta({
    title: 'Display/Popover',
    component: Popover,
    argTypes: {
      // region Data
      open: {
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
      collisionPadding: {
        control: 'number',
        table: {
          category: 'Control',
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
      onOpenChange: {
        action: 'openChange',
        table: {
          category: 'Events',
        },
      },
      // endregion

      // region Slots
      trigger: {
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
    },
    args: {
      open: false,
      side: 'bottom',
      align: 'start',
      sideOffset: 8,
      collisionPadding: 16,
    },
  });
</script>

<script lang="ts">
  import { Button as ButtonComponent } from '../Button/index.js';
</script>

<Story name="Default">
  <div class="flex min-h-[400px] items-center justify-center">
    <Popover>
      {#snippet trigger({ open, props })}
        <ButtonComponent {...props} label={open ? 'Close' : 'Open Popover'} />
      {/snippet}
      <div
        class="rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-950"
      >
        <p class="mb-2 font-semibold text-gray-900 dark:text-gray-100">
          Popover Content
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          This is a custom popover using the HTML popover API.
          <br />
          It works inside dialogs without clipping issues.
        </p>
      </div>
    </Popover>
  </div>
</Story>

<Story name="All Sides">
  <div class="grid min-h-[500px] grid-cols-2 gap-8 p-8">
    {#each ['top', 'bottom', 'left', 'right'] as side (side)}
      <div class="flex items-center justify-center">
        <Popover {side}>
          {#snippet trigger({ props })}
            <ButtonComponent {...props} label="{side}" />
          {/snippet}
          <div
            class="rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-950"
          >
            <p class="text-sm text-gray-900 dark:text-gray-100">
              Positioned on {side}
            </p>
          </div>
        </Popover>
      </div>
    {/each}
  </div>
</Story>

<Story name="All Alignments">
  <div class="flex min-h-[400px] flex-col items-center justify-center gap-8">
    {#each ['start', 'center', 'end'] as align (align)}
      <Popover {align}>
        {#snippet trigger({ props })}
          <ButtonComponent {...props} label="Align: {align}" />
        {/snippet}
        <div
          class="rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-950"
        >
          <p class="text-sm text-gray-900 dark:text-gray-100">
            Aligned to {align}
          </p>
        </div>
      </Popover>
    {/each}
  </div>
</Story>
