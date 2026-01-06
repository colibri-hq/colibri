<script lang="ts">
  type Props = {
    [key: string]: unknown;
  };

  const { ...rest }: Props = $props();
</script>

<hr {...rest} class="my-8 border-t-2 border-gray-300 dark:border-gray-700">
