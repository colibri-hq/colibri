<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CopyToClipboard from './CopyToClipboard.svelte';

  const { Story } = defineMeta({
    title: 'Controls/Copy-to-Clipboard',
    component: CopyToClipboard,
    argTypes: {
      // region Data
      value: {
        control: {
          type: 'text',
        },
        table: {
          category: 'Data',
        },
      },
      icon: {
        control: {
          type: 'text',
        },
        table: {
          category: 'Data',
          subcategory: 'Icons',
        },
      },
      completeIcon: {
        control: {
          type: 'text',
        },
        table: {
          category: 'Data',
          subcategory: 'Icons',
        },
      },
      label: {
        control: {
          type: 'text',
        },
        table: {
          category: 'Data',
          subcategory: 'Labels',
        },
      },
      completeLabel: {
        control: {
          type: 'text',
        },
        table: {
          category: 'Data',
          subcategory: 'Labels',
        },
      },
      // endregion

      // region Control
      resetCompleteTimeout: {
        control: {
          type: 'number',
          min: 100,
          step: 100,
        },
        table: {
          category: 'Control',
        },
      },
      // endregion
    },
    args: {
      value: 'Project Colibri',
      icon: 'content_copy',
      completeIcon: 'check',
      label: 'Copy',
      completeLabel: 'Copied',
      resetCompleteTimeout: 3_000,
    },
  });
</script>

<Story name="Default" />
