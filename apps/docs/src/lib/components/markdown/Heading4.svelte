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

<h4
  {...rest}
  {id}
  class="group/heading relative mt-6 mb-2 leading-7 text-2xl font-semibold font-serif scroll-mt-18"
>
  {@render children()}

  <HeadingAnchor target={id} />
</h4>
