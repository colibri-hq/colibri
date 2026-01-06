<script lang="ts">
  import { Tag } from '$lib/components/blog';

  type Props = {
    tags: {
      name: string
      count: number
    }[];
  };

  const { tags }: Props = $props();
</script>

<ul class="flex flex-wrap gap-3">
  {#each tags as { name: label, count } (label)}
    <li class="contents">
      <Tag {label} {count} size="large" linked />
    </li>
  {/each}
</ul>
