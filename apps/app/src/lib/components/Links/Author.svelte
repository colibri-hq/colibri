<script lang="ts">
  import type { Creator } from '@colibri-hq/sdk/types';

  interface Props {
    creator: Creator;
  }

  let { creator }: Props = $props();
</script>

<a class="contents" href="/creators/{creator.id}">
  <article class="flex items-center">
    <header class="contents">
      <img
        alt="Picture of {creator.name}"
        class="h-12 w-12 shrink-0 rounded-full bg-gray-100 object-cover shadow"
        src="/creators/{creator.id}/picture"
      />
      <h3 class="ml-4 text-base font-bold">{creator.name}</h3>
    </header>
  </article>
</a>
