<script lang="ts">
  interface Props {
    class?: string;
    padding?: boolean;
    narrow?: boolean;
    children?: import('svelte').Snippet;

    [key: string]: any;
  }

  let {
    class: className = '',
    padding = false,
    narrow = false,
    children,
    ...rest
  }: Props = $props();
</script>

<div
  {...rest}
  class="mx-auto w-full px-20 {className}"
  class:max-w-3xl={narrow}
  class:max-w-7xl={!narrow}
  class:py-20={padding}
>
  {@render children?.()}
</div>
