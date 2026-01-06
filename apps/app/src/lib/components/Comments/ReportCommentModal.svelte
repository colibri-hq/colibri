<script lang="ts">
  import { Button, Dialog, TextareaField } from '@colibri-hq/ui';
  import { trpc } from '$lib/trpc/client';
  import { page } from '$app/state';

  interface Props {
    open: boolean;
    commentId: string;
    onClose: () => void;
    onReported?: () => void;
  }

  let { open = $bindable(), commentId, onClose, onReported }: Props = $props();

  let reason = $state('');
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  const minLength = 10;
  const maxLength = 1000;

  let isValid = $derived(reason.trim().length >= minLength && reason.trim().length <= maxLength);

  async function handleSubmit() {
    if (!isValid || isSubmitting) {
      return;
    }

    isSubmitting = true;
    error = null;

    try {
      await trpc(page).comments.report.mutate({
        commentId,
        reason: reason.trim(),
      });
      onReported?.();
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to submit report';
    } finally {
      isSubmitting = false;
    }
  }

  function handleClose() {
    reason = '';
    error = null;
    open = false;
    onClose();
  }
</script>

<Dialog
  bind:open
  onClose={handleClose}
  title="Report Comment"
  description="Please describe why you're reporting this comment. Reports are reviewed by moderators."
>
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <TextareaField
      bind:value={reason}
      placeholder="Describe the issue with this comment…"
      hint={reason.trim().length < minLength
        ? `Minimum ${minLength} characters required`
        : `${reason.trim().length} / ${maxLength}`}
      required
      maxlength={maxLength}
      rows={4}
    />

    {#if error}
      <p class="mt-2 text-sm text-red-600">{error}</p>
    {/if}
  </form>

  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        onclick={handleSubmit}
        variant="primary"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? 'Submitting…' : 'Report'}
      </Button>
    </div>
  {/snippet}
</Dialog>
