<script lang="ts">
    import { Icon } from '@colibri-hq/ui';

  interface Props {
    items?: { link: string; title: string }[];
  }

  let { items = [] }: Props = $props();
</script>

<nav class="mt-1">
  {#if items.length > 1}
    <ul class="flex items-center">
      {#each items as { link, title }, index}
        {#if index > 0}
          <li class="group contents">
            <Icon name="chevron_right" class="leading-none text-gray-500" />
          </li>
        {/if}
        <li class="group contents">
          <a
            href={link}
            class="rounded px-2 py-2 leading-none transition hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <span>{title}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</nav>
