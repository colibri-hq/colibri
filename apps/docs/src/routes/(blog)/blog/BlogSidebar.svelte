<script lang="ts">
  import { type AuthorInfo, type BlogPost, getMonthName } from '$lib/content/blog';
  import { AuthorCard, Tag } from '$lib/components/blog/index';
  import { resolve } from '$app/paths';
  import NavigationHeading from '$lib/components/blog/NavigationHeading.svelte';

  type Props = {
    postsByYearMonth: Map<number, Map<number, BlogPost[]>>;
    tags: Map<string, number>;
    authors?: AuthorInfo[];
    maxTags?: number;
    maxAuthors?: number;
  };

  const { postsByYearMonth, tags, authors = [], maxTags = 15, maxAuthors = 5 }: Props = $props();
  const sortedYears = $derived(Array.from(postsByYearMonth.keys()));
  const sortedTags = $derived(Array.from(tags.entries()).slice(0, maxTags));
  const sortedAuthors = $derived(authors.slice(0, maxAuthors));
</script>

<aside class="grid gap-8 text-gray-700 dark:text-gray-300">
  <!-- region Archive by Date -->
  {#if sortedYears.length > 0}
    <section>
      <NavigationHeading
        label="Archive"
        href={resolve("/(blog)/blog/archive")}
        tag="h3"
      />

      <nav>
        <ul class="flex flex-col gap-4">
          {#each sortedYears as year (year)}
            {@const months = postsByYearMonth.get(year)}
            <li>
              <NavigationHeading
                label={String(year)}
                href={resolve("/(blog)/blog/archive/[year]", { year: String(year) })}
                tag="h4"
              />

              <ul class="flex flex-col gap-1 ps-2 border-s-2 border-gray-300 dark:border-gray-700">
                {#each Array.from(months?.entries() ?? []) as [month, posts], index (index)}
                  <li class="contents">
                    <a
                      href={resolve("/(blog)/blog/archive/[year]/[month]", {
                        year: String(year),
                        month: String(month + 1).padStart(2, '0')
                      })}
                      class="group hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md px-2 py-1 flex
                      items-center justify-start gap-2 transition focus-visible:ring-2
                      focus-visible:ring-blue-500 outline-hidden"
                    >
                      <span
                        class="text-gray-600 dark:text-gray-400 group-hover:text-blue-600
                        dark:group-hover:text-blue-400 group-focus-visible:text-blue-600
                        dark:group-focus-visible:text-blue-300 transition-colors text-sm"
                      >
                        {getMonthName(month)}
                      </span>

                      <span
                        class="text-gray-500 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 rounded-full px-2
                        text-xs transition-colors group-focus-visible:text-blue-600
                        dark:group-focus-visible:text-blue-300 group-hover:bg-blue-200
                        dark:group-hover:bg-blue-900/50 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                      >
                        {posts.length}
                      </span>
                    </a>
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>
      </nav>
    </section>
  {/if}
  <!-- endregion -->

  <!-- region Authors -->
  {#if sortedAuthors.length > 0}
    <section>
      <NavigationHeading label="Authors" href={resolve("/(blog)/blog/author")} tag="h3" />

      <ul class="flex flex-col gap-2">
        {#each sortedAuthors as { author, count } (author.name)}
          <li class="contents">
            <AuthorCard {author} {count} size="small" linked />
          </li>
        {/each}
      </ul>
      {#if authors.length > maxAuthors}
        <a
          href={resolve("/(blog)/blog/author")}
          class="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline inline-block"
        >
          View all authors
        </a>
      {/if}
    </section>
  {/if}
  <!-- endregion -->

  <!-- region Tags Cloud -->
  {#if sortedTags.length > 0}
    <section>
      <NavigationHeading label="Tags" href={resolve("/(blog)/blog/tag")} tag="h3" />

      <ul class="flex flex-wrap gap-2">
        {#each sortedTags as [label, count], index (index)}
          <li class="contents">
            <Tag {label} {count} linked size="medium" />
          </li>
        {/each}
      </ul>
    </section>
  {/if}
  <!-- endregion -->
</aside>
