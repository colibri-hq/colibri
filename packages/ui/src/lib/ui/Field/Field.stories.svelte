<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Field from './Field.svelte';

  const { Story } = defineMeta({
    title: 'Controls/Field',
    component: Field,
    argTypes: {
      value: {
        control: 'text',
        table: {
          category: 'Data',
        },
      },
      autocomplete: {
        control: {
          type: 'select',
        },
        table: {
          category: 'Control',
        },
      },
    },
    args: {
      value: 'Hello World',
    },
  });
</script>

<Story name="Default" />
