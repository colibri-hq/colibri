<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import BlurhashPanel from './BlurhashPanel.svelte';

  /**
   * The Blurhash Panel component can be used to display a
   * [Blurhash image](https://blurha.sh/) from a given Blurhash string, allowing
   * for a low-resolution preview of an image.
   */

  const { Story } = defineMeta({
    title: 'Widgets/Blurhash Panel',
    component: BlurhashPanel,
    argTypes: {
      blurhash: {
        control: {
          type: 'text',
        },
        table: {
          category: 'Data',
        },
      },

      size: {
        control: {
          type: 'number',
          min: 0,
        },
        table: {
          category: 'Styling',
        },
      },

      class: {
        control: false,
        table: {
          category: 'Styling',
          disable: true,
        },
      },
    },
    args: {
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      size: 128,
    },
  });
</script>

<Story name="Default" />
