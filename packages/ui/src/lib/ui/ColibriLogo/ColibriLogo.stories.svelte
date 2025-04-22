<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ColibriLogo from './ColibriLogo.svelte';

  /**
   * The Logo component is used to display the Colibri logo. It can be colorized
   * by applying a text color class to the parent element, which will be
   * inherited by the logo. This also allows to react to color scheme changes.
   */

  const { Story } = defineMeta({
    title: 'Widgets/Logo',
    component: ColibriLogo,
    argTypes: {
      class: {
        control: false,
        table: {
          category: 'Styling',
        },
      },
    },
  });
</script>

<Story name="Default">
  {#snippet children(args)}
    <div class="flex gap-2 items-center justify-evenly">
      <div class="h-4">
        <ColibriLogo {...args} />
      </div>
      <div class="h-8">
        <ColibriLogo {...args} />
      </div>
      <div class="h-12">
        <ColibriLogo {...args} />
      </div>
      <div class="h-20">
        <ColibriLogo {...args} />
      </div>
      <div class="h-28">
        <ColibriLogo {...args} />
      </div>
      <div class="h-36">
        <ColibriLogo {...args} />
      </div>
      <div class="h-48">
        <ColibriLogo {...args} />
      </div>
    </div>
  {/snippet}
</Story>
