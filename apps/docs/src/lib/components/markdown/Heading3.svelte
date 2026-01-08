<script lang="ts">
  import type { Snippet } from 'svelte';
  import HeadingAnchor from '$lib/components/content/HeadingAnchor.svelte';

  type Props = {
    children: Snippet;
    id: string;
    [key: string]: unknown;
  };

  const { children, id, ...rest }: Props = $props();
</script>

<h3
  {...rest}
  {id}
  class="group/heading relative mt-8 mb-3 leading-8 tracking-tight text-3xl font-semibold font-sans scroll-mt-18"
>
  {@render children()}

  <HeadingAnchor target={id} />
</h3>
