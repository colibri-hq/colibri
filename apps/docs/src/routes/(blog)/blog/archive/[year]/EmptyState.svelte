<script lang="ts">
  type Props = {
    year: number;
  }

  const { year }: Props = $props();
</script>

<p class="text-gray-500 dark:text-gray-400 text-center py-8">
  No posts were published in {year}.
</p>
