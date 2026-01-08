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

<h6
  {...rest}
  {id}
  class="group/heading relative mt-4 leading-6 text-base font-semibold font-serif scroll-mt-18"
>
  {@render children()}

  <HeadingAnchor target={id} />
</h6>
