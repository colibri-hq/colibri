<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import LoadingIndicator from './LoadingIndicator.svelte';

  const { Story } = defineMeta({
    title: 'Widgets/Loading Indicator',
    component: LoadingIndicator,
    argTypes: {
      size: {
        control: {
          type: 'radio',
          labels: {
            small: 'Small',
            medium: 'Medium',
            large: 'Large',
          },
        },
        options: ['small', 'medium', 'large'],
      },
      speed: {
        control: {
          type: 'radio',
          labels: {
            slow: 'Slow',
            normal: 'Normal',
            fast: 'Fast',
          },
        },
        options: ['slow', 'normal', 'fast'],
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
      size: 'medium',
      speed: 'normal',
    },
  });
</script>

<Story name="Default" />
