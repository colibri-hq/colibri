<script lang="ts">
  import type { Publisher } from '@colibri-hq/sdk/types';
  import { Icon } from '@colibri-hq/ui';

  interface Props {
    publisher: Publisher;
  }

  let { publisher }: Props = $props();
</script>

<a class="contents" href="/publishers/{publisher.id}">
  <article class="flex items-center">
    <header class="contents">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 object-cover shadow"
      >
        {#if publisher.image}
          <img
            src="/publishers/{publisher.id}/logo"
            class="h-full w-full rounded-full object-cover"
            alt="Logo of {publisher.name}"
          />
        {:else}
          <Icon name="domain" class="leading-none text-gray-500" />
        {/if}
      </div>
      <h3 class="ml-4 text-base font-bold">{publisher.name}</h3>
    </header>
  </article>
</a>
