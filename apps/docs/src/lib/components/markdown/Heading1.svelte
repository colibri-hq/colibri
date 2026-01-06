<script lang="ts">
  import type { Snippet } from 'svelte';
  import HeadingAnchor from '$lib/components/HeadingAnchor.svelte';

  type Props = {
    children: Snippet;
    id: string;
    [key: string]: unknown;
  };

  const { children, id, ...rest }: Props = $props();
</script>

<h1
  {...rest}
  {id}
  class="group/heading relative mb-4 leading-tight tracking-tight text-5xl font-bold font-serif scroll-mt-16"
>
  {@render children()}

  <HeadingAnchor target={id} />
</h1>
