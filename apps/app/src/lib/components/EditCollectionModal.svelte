<script lang="ts">
  import VisibilitySelector, { type Visibility } from '$lib/components/VisibilitySelector.svelte';
  import { Button, ColorPicker, Field, Icon, IconPicker, IconRenderer, Modal, TextareaField } from '@colibri-hq/ui';
  import { trpc } from '$lib/trpc/client';
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import LoadingSpinner from '$lib/LoadingSpinner.svelte';
  import { fly } from 'svelte/transition';

  interface Collection {
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    color?: ArrayBuffer | null;
    shared?: boolean | null;
    age_requirement?: number;
    // Allow extra properties from parent component
    [key: string]: unknown;
  }

  interface Props {
    open?: boolean;
    collection: Collection;
    onSave?: () => void;
    onDelete?: () => void;
  }

  let {
    open = $bindable(false),
    collection,
    onSave,
    onDelete,
  }: Props = $props();

  // Form state
  let name = $state(collection.name);
  let description = $state(collection.description ?? '');
  let icon = $state(collection.icon ?? '');
  let color = $state(bufferToHex(collection.color));
  let visibility = $state<Visibility>(sharedToVisibility(collection.shared));
  let ageRequirement = $state(collection.age_requirement ?? 0);

  let loading = $state(false);
  let error: string | undefined = $state(undefined);
  let showDeleteConfirm = $state(false);

  let iconPickerOpen = $state(false);
  let colorPickerOpen = $state(false);

  // Helpers
  function bufferToHex(buffer: ArrayBuffer | null | undefined): string {
    if (!buffer) {
      return '';
    }
    const bytes = new Uint8Array(buffer);
    return '#' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function sharedToVisibility(shared: boolean | null | undefined): Visibility {
    if (shared === false) {
      return 'private';
    }
    if (shared === true) {
      return 'public';
    }
    return 'shared';
  }

  async function save() {
    if (loading || !name.trim()) {
      return;
    }

    loading = true;
    error = undefined;

    try {
      await trpc(page).collections.save.mutate({
        id: collection.id,
        name: name.trim(),
        description: description.trim() || null,
        icon: icon || null,
        color: color || null,
        visibility,
        ageRequirement,
      });

      await invalidateAll();
      onSave?.();
      open = false;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading = false;
    }
  }

  async function deleteCollection() {
    if (loading) {
      return;
    }

    loading = true;
    error = undefined;

    try {
      await trpc(page).collections.delete.mutate(collection.id);
      await invalidateAll();
      onDelete?.();
      open = false;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading = false;
    }
  }

  let invalid = $derived(!name.trim());
</script>

<Modal bind:open class="max-w-lg">
  {#snippet header()}
    <h1 class="text-lg font-bold">Edit Collection</h1>
  {/snippet}

  <div class="grid grid-cols-1 gap-6">
    <!-- Icon and Color -->
    <div class="flex items-start gap-4">
      <div>
        <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Icon
        </span>
        <IconPicker bind:open={iconPickerOpen} bind:value={icon}>
          {#snippet trigger({ props })}
            <!-- eslint-disable svelte/no-inline-styles -- Dynamic color from user selection -->
            <button
              {...props}
              type="button"
              class="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-gray-300
              bg-gray-50 text-2xl transition hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800
              dark:hover:border-gray-500"
              style={color ? `background-color: ${color}20` : ''}
            >
            <!-- eslint-enable svelte/no-inline-styles -->
              {#if icon}
                <IconRenderer {icon} class="text-3xl" />
              {:else}
                <Icon name="add" class="text-gray-400" />
              {/if}
            </button>
          {/snippet}
        </IconPicker>
      </div>

      <div>
        <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Color
        </span>
        <ColorPicker bind:open={colorPickerOpen} bind:value={color}>
          {#snippet trigger({ props })}
            <!-- eslint-disable svelte/no-inline-styles -- Dynamic color from user selection -->
            <button
              {...props}
              type="button"
              class="flex h-14 w-14 items-center justify-center rounded-xl border-2 transition
                {color
                ? 'border-transparent'
                : 'border-dashed border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}"
              style={color ? `background-color: ${color}` : ''}
            >
            <!-- eslint-enable svelte/no-inline-styles -->
              {#if !color}
                <Icon name="palette" class="text-gray-400" />
              {/if}
            </button>
          {/snippet}
        </ColorPicker>
      </div>
    </div>

    <!-- Name -->
    <Field
      bind:value={name}
      disabled={loading}
      label="Name"
      required
      maxlength={150}
    />

    <!-- Description -->
    <TextareaField
      bind:value={description}
      disabled={loading}
      label="Description"
      hint="Optional. Supports Markdown formatting."
      rows={3}
    />

    <!-- Visibility -->
    <div>
      <span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Visibility
      </span>
      <VisibilitySelector bind:value={visibility} disabled={loading} />
    </div>

    <!-- Age Requirement -->
    <Field
      bind:value={()=> ageRequirement.toString(), v => ageRequirement = parseInt(v) || 0}
      disabled={loading}
      label="Age Requirement"
      type="number"
      min={0}
      max={99}
      hint="Minimum age in years required to access this collection. 0 means no restriction."
    />
  </div>

  <footer class="mt-6">
    <div class="flex items-center gap-3">
      <Button disabled={invalid || loading} onClick={save}>
        Save Changes
      </Button>

      {#if !showDeleteConfirm}
        <button
          type="button"
          class="ml-auto text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          onclick={() => (showDeleteConfirm = true)}
          disabled={loading}
        >
          Delete Collection
        </button>
      {:else}
        <div class="ml-auto flex items-center gap-2" transition:fly={{ x: 20, duration: 150 }}>
          <span class="text-sm text-gray-500">Are you sure?</span>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            onclick={deleteCollection}
            disabled={loading}
          >
            Yes, delete
          </button>
          <button
            type="button"
            class="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300
            dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            onclick={() => (showDeleteConfirm = false)}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      {/if}

      {#if loading}
        <LoadingSpinner class="ml-2" />
      {/if}
    </div>

    {#if error}
      <div
        role="alert"
        transition:fly={{ duration: 200, delay: 20, y: -16 }}
        class="mt-4 flex flex-col rounded-lg bg-red-100 px-4 py-2 text-sm text-red-900 shadow-md ring-2
        shadow-red-500/10 ring-red-200"
      >
        <strong class="mb-1">Something went wrong</strong>
        <p>{error}</p>
      </div>
    {/if}
  </footer>
</Modal>
