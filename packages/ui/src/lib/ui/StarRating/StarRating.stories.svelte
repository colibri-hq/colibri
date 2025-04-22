<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import StarRating from './StarRating.svelte';

  const { Story } = defineMeta({
    title: 'Controls/Star Rating',
    component: StarRating,
    argTypes: {
      value: {
        control: { type: 'number' },
        table: {
          category: 'Data',
        },
      },
      max: {
        control: { type: 'number' },
        table: {
          category: 'Control',
        },
      },
      disabled: {
        control: { type: 'boolean' },
        table: {
          category: 'Control',
        },
      },
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
        table: {
          category: 'Control',
        },
      },
      starClasses: {
        control: false,
        table: {
          category: 'Styling',
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
      value: 3,
      max: 5,
      disabled: false,
      size: 'medium',
    },
  });
</script>

<Story name="Default" />

<Story name="Sizing">
  {#snippet children(args)}
    <div>
      <StarRating {...args} size="small" />
      <StarRating {...args} size="medium" />
      <StarRating {...args} size="large" />
      <span>Small</span>
      <span>Medium</span>
      <span>Large</span>
    </div>
  {/snippet}
</Story>
