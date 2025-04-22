<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import EmojiPicker from './EmojiPicker.svelte';

  const { Story } = defineMeta({
    title: 'Common/Emoji Picker',
    component: EmojiPicker,
    args: {
      open: true,
    },
  });
</script>


<Story name="Default">
  {#snippet children(args)}
    <div class="flex items-start justify-center min-h-80">
      <EmojiPicker class="-translate-x-1/2" {...args}>
        {#snippet trigger()}
          <button class="p-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700">
            <span class="text-lg">Pick an emoji</span>
          </button>
        {/snippet}
      </EmojiPicker>
    </div>
  {/snippet}
</Story>
