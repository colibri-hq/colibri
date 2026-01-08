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

<h2
  {...rest}
  {id}
  class="group/heading relative mt-10 mb-4 leading-10 tracking-tight text-4xl font-bold font-serif scroll-mt-16"
>
  {@render children()}

  <HeadingAnchor target={id} />
</h2>
