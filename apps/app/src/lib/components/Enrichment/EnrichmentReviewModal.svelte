<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";
  import { Button, Icon, Toggle } from "@colibri-hq/ui";
  import type { MetadataPreview } from "@colibri-hq/sdk/metadata";

  interface Props {
    open?: boolean;
    onClose?: () => void;
    preview: MetadataPreview | null;
    improvements: Record<string, unknown>;
    sources: string[];
    loading?: boolean;
    onApply?: (selectedFields: string[]) => void;
    onDismiss?: () => void;
  }

  let {
    open = $bindable(false),
    onClose,
    preview,
    improvements,
    sources,
    loading = false,
    onApply,
    onDismiss,
  }: Props = $props();

  // Track selected fields
  let selectedFields = $state<Set<string>>(new Set(Object.keys(improvements)));

  // Reset selection when improvements change
  $effect(() => {
    selectedFields = new Set(Object.keys(improvements));
  });

  function toggleField(field: string) {
    if (selectedFields.has(field)) {
      selectedFields.delete(field);
    } else {
      selectedFields.add(field);
    }
    selectedFields = new Set(selectedFields);
  }

  function selectAll() {
    selectedFields = new Set(Object.keys(improvements));
  }

  function selectNone() {
    selectedFields = new Set();
  }

  function handleApply() {
    onApply?.(Array.from(selectedFields));
  }

  function handleDismiss() {
    onDismiss?.();
    open = false;
  }

  const fieldLabels: Record<string, string> = {
    title: "Title",
    description: "Description",
    publicationDate: "Publication Date",
    language: "Language",
    pages: "Page Count",
    isbn: "ISBN",
    subjects: "Subjects",
    series: "Series",
    publisher: "Publisher",
  };

  function formatValue(field: string, value: unknown): string {
    if (value === null || value === undefined) {
      return "—";
    }

    if (field === "description" && typeof value === "object" && value !== null) {
      return (value as { text?: string }).text ?? "—";
    }

    if (field === "publicationDate" && typeof value === "object" && value !== null) {
      const date = value as { year?: number; month?: number; day?: number };
      if (date.year) {
        if (date.month && date.day) {
          return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
        }
        if (date.month) {
          return `${date.year}-${String(date.month).padStart(2, "0")}`;
        }
        return String(date.year);
      }
      return "—";
    }

    if (Array.isArray(value)) {
      if (field === "subjects" || field === "series") {
        return value.map((v) => (typeof v === "object" ? v.name || v.term || JSON.stringify(v) : v)).join(", ");
      }
      return value.join(", ");
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }
</script>

<Modal bind:open {onClose}>
  {#snippet header()}
    <h2 class="text-lg font-semibold">Metadata Improvements</h2>
  {/snippet}

  <div class="min-w-96 max-w-2xl">
    {#if preview}
      <!-- Sources attribution -->
      <div class="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Icon name="source" class="text-base" />
        <span>From: {sources.join(", ")}</span>
      </div>

      <!-- Selection controls -->
      <div class="mb-4 flex items-center gap-3">
        <button
          class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          onclick={selectAll}
        >
          Select all
        </button>
        <span class="text-gray-300 dark:text-gray-600">|</span>
        <button
          class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          onclick={selectNone}
        >
          Select none
        </button>
        <span class="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {selectedFields.size} of {Object.keys(improvements).length} selected
        </span>
      </div>

      <!-- Improvements list -->
      <div class="space-y-3">
        {#each Object.entries(improvements) as [field, value]}
          {@const isSelected = selectedFields.has(field)}
          <label
            class={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              isSelected
                ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
            }`}
          >
            <input
              type="checkbox"
              class="mt-0.5"
              checked={selectedFields.has(field)}
              onchange={() => toggleField(field)}
            />
            <div class="min-w-0 flex-1">
              <div class="mb-1 font-medium text-gray-900 dark:text-gray-100">
                {fieldLabels[field] ?? field}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                <span class="line-clamp-2">{formatValue(field, value)}</span>
              </div>
            </div>
          </label>
        {/each}
      </div>

      <!-- Actions -->
      <div class="mt-6 flex justify-end gap-3">
        <Button variant="subtle" onclick={handleDismiss} disabled={loading}>
          Dismiss
        </Button>
        <Button
          onclick={handleApply}
          disabled={loading || selectedFields.size === 0}
        >
          {#if loading}
            <Icon name="sync" class="mr-1 animate-spin" />
          {/if}
          Apply {selectedFields.size} improvement{selectedFields.size !== 1 ? "s" : ""}
        </Button>
      </div>
    {:else}
      <div class="flex items-center justify-center py-12 text-gray-500">
        <Icon name="sync" class="mr-2 animate-spin" />
        Loading improvements...
      </div>
    {/if}
  </div>
</Modal>
