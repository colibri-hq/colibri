<script lang="ts">
  import type { Author } from '@prisma/client';

  interface Props {
    author: Author;
  }

  let { author }: Props = $props();
</script>

<a class="contents" href="/authors/{author.id}">
  <article class="flex items-center">
    <header class="contents">
      <img
        alt="Picture of {author.name}"
        class="h-12 w-12 shrink-0 rounded-full bg-gray-100 object-cover shadow"
        src="/authors/{author.id}/picture"
      />
      <h3 class="ml-4 text-base font-bold">{author.name}</h3>
    </header>
  </article>
</a>
