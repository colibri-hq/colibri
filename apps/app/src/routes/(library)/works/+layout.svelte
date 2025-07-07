<script lang="ts">
  import ContentSection from '$lib/components/ContentSection.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<ContentSection padding>
  {@render children?.()}
</ContentSection>
