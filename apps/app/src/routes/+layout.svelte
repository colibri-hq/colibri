<script lang="ts">
  import '@fontsource-variable/material-symbols-outlined/full.css';
  import '@fontsource/titillium-web';
  import '@fontsource/neuton/400.css';
  import '@fontsource/neuton/400-italic.css';
  import '@fontsource/neuton/700.css';
  import '../style.css';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

{@render children?.()}
