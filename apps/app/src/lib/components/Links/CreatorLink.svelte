<script lang="ts">
  import { Icon } from '@colibri-hq/ui';

  interface Props {
    creator: {
      id: string;
      name: string;
      image_id?: string | null;
    };
  }

  let { creator }: Props = $props();
</script>

<a class="contents" href="/creators/{creator.id}">
  <article class="flex items-center" id="creator-{creator.id}">
    <header class="contents">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 object-cover shadow dark:bg-gray-700"
      >
        {#if creator.image_id}
          <img
            src="/creators/{creator.id}/picture"
            class="h-full w-full rounded-full object-cover"
            alt="Picture of {creator.name}"
          />
        {:else}
          <Icon name="person" class="leading-none text-gray-500" />
        {/if}
      </div>
      <h3 class="ml-4 text-base font-bold">{creator.name}</h3>
    </header>
  </article>
</a>
