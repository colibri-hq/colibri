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

<h5
  {...rest}
  {id}
  class="group/heading relative mt-5 mb-2 leading-6 text-xl font-semibold font-serif scroll-mt-18"
>
  {@render children()}

  <HeadingAnchor target={id} />
</h5>
