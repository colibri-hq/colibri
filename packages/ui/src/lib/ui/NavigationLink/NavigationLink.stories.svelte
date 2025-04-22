<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NavigationLink from './NavigationLink.svelte';
  import Icon from '../Icon/Icon.svelte';
  import { fn } from '@storybook/test';

  /**
   * The NavigationLink component is used to create a link with an icon and
   * a title, and is suitable for use in navigation menus.
   */

  const { Story } = defineMeta({
    title: 'Widgets/Navigation Link',
    component: NavigationLink,
    argTypes: {
      title: {
        control: 'text',
      },
      to: {
        control: 'text',
      },
      icon: {
        control: 'text',
        if: {
          arg: 'emoji',
          truthy: false,
        },
      },
      emoji: {
        control: 'text',
        if: {
          arg: 'icon',
          truthy: false,
        },
      },

      children: {
        control: false,
        table: {
          category: 'Children',
          disable: true,
        },
      },
      onClick: {
        control: false,
        table: {
          category: 'Events',
          disable: true,
        },
      },
    },
    args: {
      title: 'Navigation Link',
      to: '#',
      onClick: fn(),
    },
  });
</script>

<Story name="Default" />
<Story name="With Icon" args={{ icon: 'home' }} />
<Story name="With Emoji" args={{ emoji: '🏠' }} />
<Story name="With Custom Icon" args={{icon: undefined, emoji: undefined}}>
  {#snippet children(args)}
    <NavigationLink {...args}>
      {#snippet icon()}
        <Icon fill class="text-yellow-500" name="star" />
      {/snippet}
    </NavigationLink>
  {/snippet}
</Story>
