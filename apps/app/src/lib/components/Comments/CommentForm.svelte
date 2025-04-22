<script lang="ts">
  import TextareaInput from '$lib/components/Form/TextareaInput.svelte';

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

  function reset() {
    content = '';
  }

  function submit() {
    onSubmit?.({ content, reset });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();

      if (event.shiftKey) {
        return;
      }

      submit();
    }
  }
</script>

<div class="mt-4 flex items-center {className}">
  <TextareaInput
    bind:value={content}
    class="w-full grow rounded-xl border-gray-300 shadow-lg transition focus-within:shadow-blue-500/10
    dark:border-gray-800 dark:bg-gray-900"
    {disabled}
    id="comment"
    name="content"
    onkeydown={handleKeydown}
    placeholder="Add Comment..."
  />
</div>
