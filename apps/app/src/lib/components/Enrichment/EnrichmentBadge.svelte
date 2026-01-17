<script lang="ts">
  import { Icon } from "@colibri-hq/ui";

  interface Props {
    status: "none" | "enriching" | "available";
    improvementCount?: number;
    sources?: string[];
    onclick?: () => void;
  }

  let {
    status,
    improvementCount = 0,
    sources = [],
    onclick,
  }: Props = $props();

  const statusConfig = $derived({
    none: {
      icon: "auto_fix_high",
      label: "Fetch metadata",
      class: "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
    },
    enriching: {
      icon: "sync",
      label: "Enriching metadata...",
      class: "text-blue-500 animate-spin",
    },
    available: {
      icon: "auto_fix_high",
      label: `${improvementCount} improvement${improvementCount !== 1 ? "s" : ""} available`,
      class: "text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300",
    },
  });

  const config = $derived(statusConfig[status]);
</script>

{#if status === "none"}
  <button
    class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors {config.class}"
    title={config.label}
    {onclick}
  >
    <Icon name={config.icon} class="text-base" />
    <span class="sr-only">{config.label}</span>
  </button>
{:else if status === "enriching"}
  <span
    class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm {config.class}"
    title={config.label}
  >
    <Icon name={config.icon} class="text-base" />
    <span class="sr-only">{config.label}</span>
  </span>
{:else if status === "available"}
  <button
    class="group inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-medium transition-colors hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-950/75 {config.class}"
    title={sources.length > 0 ? `From: ${sources.join(", ")}` : config.label}
    {onclick}
  >
    <Icon
      name={config.icon}
      class="text-base transition-transform group-hover:scale-110"
    />
    <span class="tabular-nums">{improvementCount}</span>
  </button>
{/if}
