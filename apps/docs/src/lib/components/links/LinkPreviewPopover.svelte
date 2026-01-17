<script lang="ts">
  import type { LinkPreviewData } from '$lib/utils/link-preview';

  type Props = {
    data: LinkPreviewData | null;
  };

  const { data }: Props = $props();
</script>

{#if data}
  <div class="link-preview-content">
    {#if data.breadcrumbs.length > 0}
      <div class="link-preview-breadcrumb">
        {#each data.breadcrumbs as crumb, index (index)}
          {#if index > 0}
            <span class="link-preview-breadcrumb-separator">/</span>
          {/if}
          <span>{crumb.title}</span>
        {/each}
      </div>
    {/if}
    <div class="link-preview-title">{data.title}</div>
    {#if data.description}
      <div class="link-preview-description">{data.description}</div>
    {/if}
  </div>
{/if}
