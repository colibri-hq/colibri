<script lang="ts">
  import { Icon, Textarea, TextareaField } from '@colibri-hq/ui';

  interface Props {
    class?: string;
    disabled?: boolean;
    onSubmit?: (event: {
      /**
       * Text content of the new comment. May contain multiple lines.
       */
      content: string;

      /**
       * A helper function to reset the comment form to its original state.
       * Should be called _after_ the comment has been successfully submitted.
       */
      reset: () => void;
    }) => unknown;
  }

  let { class: className = '', disabled = false, onSubmit }: Props = $props();
  let content = $state('');

  let canSubmit = $derived(content.trim().length > 0 && !disabled);

  function reset() {
    content = '';
  }

  function submit() {
    if (!canSubmit) return;
    onSubmit?.({ content: content.trim(), reset });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }
</script>

<div class="mt-4 pb-4 {className}">
  <div class="flex items-end gap-2">
    <TextareaField
      class="w-full mb-0"
      bind:value={content}
      disabled={disabled}
      id="comment"
      name="content"
      onkeydown={handleKeydown}
      placeholder="Add Comment…"
    />

    <button
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition
        {canSubmit
        ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer'
        : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'}"
      disabled={!canSubmit}
      onclick={submit}
      title="Send comment"
      type="button"
    >
      {#if disabled}
        <Icon class="animate-spin text-lg" name="progress_activity" />
      {:else}
        <Icon class="text-lg" name="send" />
      {/if}
    </button>
  </div>
</div>
