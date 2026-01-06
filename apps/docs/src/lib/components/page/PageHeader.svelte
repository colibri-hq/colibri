<script lang="ts">
  import type { Snippet } from "svelte";
  import PageActions from "$lib/components/page/PageActions.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import ShareButton from "$lib/components/ShareButton.svelte";
  import type { BreadcrumbItem } from "$lib/content/content";
  import { ClockIcon } from "@lucide/svelte";

  type Props = {
    title: string | Snippet;
    description?: string | Snippet;
    breadcrumbs?: BreadcrumbItem[];
    readingTime?: number;
  };

  const { title, description, breadcrumbs, readingTime }: Props = $props();
</script>

<header class="py-8 px-4">
  <div class="flex flex-col gap-4 w-full max-w-5xl mx-auto">
    {#if breadcrumbs && breadcrumbs.length > 1}
      <Breadcrumbs items={breadcrumbs} />
    {/if}
    <h1 class="text-5xl font-bold font-serif">
      {#if typeof title === "string"}
        {title}
      {:else}
        {@render title()}
      {/if}
    </h1>
    {#if typeof description === "string"}
      <p class="text-2xl text-gray-700 dark:text-gray-300">
        {description}
      </p>
    {:else if description}
      {@render description()}
    {/if}

    <div class="flex items-center gap-4 mt-2">
      {#if readingTime}
        <div class="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <ClockIcon class="size-4" />
          <span>{readingTime} min read</span>
        </div>
      {/if}
      <ShareButton />
      <PageActions />
    </div>
  </div>
</header>
