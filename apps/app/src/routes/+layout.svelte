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

<svelte:head>
  <!--  <link href="https://fonts.googleapis.com" rel="preconnect" />-->
  <!--  <link-->
  <!--    crossorigin="anonymous"-->
  <!--    href="https://fonts.gstatic.com"-->
  <!--    rel="preconnect"-->
  <!--  />-->
  <!--  <link-->
  <!--    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&&family=Titillium+Web:wght@300;400;500;600&family=Ibarra+Real+Nova:ital,wght@0,300..700;1,300..700&display=swap"-->
  <!--    rel="stylesheet"-->
  <!--  />-->
</svelte:head>

{@render children?.()}
