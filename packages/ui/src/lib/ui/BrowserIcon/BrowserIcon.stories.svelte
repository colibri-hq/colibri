<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import BrowserIcon from './BrowserIcon.svelte';

  const { Story } = defineMeta({
    title: 'Widgets/Browser Icon',
    component: BrowserIcon,
    argTypes: {
      browser: {
        control: {
          type: 'select',
          options: [
            'kindle',
            'silk',
            'mobile safari',
            'safari',
            'chrome',
            'chromium',
            'edge',
            'yandex',
            'brave',
            'firefox',
            'webkit',
          ],
        },
        table: {
          category: 'Data',
        },
      },
      class: {
        control: false,
        table: {
          category: 'Styling',
        },
      },
    },
    args: {
      browser: 'webkit',
    },
  });
</script>

<Story name="Default" />
