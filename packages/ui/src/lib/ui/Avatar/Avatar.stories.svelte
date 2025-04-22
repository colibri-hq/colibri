<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Avatar from './Avatar.svelte';

  const { Story } = defineMeta({
    title: 'Widgets/Avatar',
    component: Avatar,
    argTypes: {
      user: {
        control: {
          type: 'object',
        },
      },
    },
    args: {
      user: {
        email: 'john@doe.com',
      },
      size: 32,
    },
  });
</script>

<Story name="Default" />
