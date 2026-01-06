<script lang="ts">

  import { resolve } from '$app/paths';

  type Props = {
    title: string;
    urlSlug: string;
    day: number;
  }

  const { title, urlSlug: slug, day }: Props = $props();
  const href = $derived(resolve('/(blog)/blog/[slug]', { slug }));
</script>

<li class="relative ps-6">
  <a {href} class="group flex items-baseline gap-3 outline-hidden">
    <span
      class="-ms-10.25 flex items-center justify-center leading-none text-center text-sm text-blue-500 bg-blue-100
      dark:bg-blue-950 rounded-full p-2 dark:text-blue-200 tabular-nums shrink-0 ring-3 ring-gray-100
      dark:ring-gray-950 group-focus-visible:bg-blue-500 group-focus-visible:text-white transition-colors"
      aria-label="Day {day}"
    >
      {day.toString().padStart(2, '0')}
    </span>

    <span
      class="text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400
      transition-colors ms-1 group-focus-visible:text-blue-600 dark:group-focus-visible:text-blue-400"
    >
      {title}
    </span>
  </a>
</li>
