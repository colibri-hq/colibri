<script lang="ts">
  import { BlurhashPanel } from '@colibri-hq/ui';

  interface Props {
    class?: string;
    imageClasses?: string;
    book: string;
    edition?: string | undefined | null;
    title?: string;
    blurhash?: string | undefined | null;
    src?: string;
    alt?: string;

    [key: string]: unknown;
  }

  let {
    class: className = '',
    imageClasses = '',
    book,
    edition = undefined,
    title = '',
    blurhash = undefined,
    src = `/books/${book}/cover/file${edition ? `?edition=${edition}` : ''}`,
    alt = `Cover of ${title}`,
    ...rest
  }: Props = $props();

  let missingCover: boolean = $state(false);

  function handleFileError() {
    missingCover = true;
  }
</script>

<div
  {...rest}
  class="relative overflow-hidden rounded bg-blue-200 after:absolute
  after:top-0 after:left-0 after:z-20 after:block after:h-full after:w-full
  after:rounded after:content-[''] dark:bg-blue-800 {className}"
>
  <img
    {alt}
    class="{imageClasses} m-0 block h-auto max-h-[inherit] w-full"
    class:opacity-0={missingCover}
    onerror={handleFileError}
    {src}
  />

  {#if missingCover}
    {#if blurhash}
      <BlurhashPanel class="absolute inset-0 h-full w-full" {blurhash} />
    {/if}

    <span
      class="absolute top-6 left-2 block px-4 text-center font-serif text-xs opacity-85 select-none"
    >
      {title}
    </span>
  {/if}
</div>

<style lang="postcss">
  div::after {
    background: linear-gradient(
      to right,
      rgba(60, 13, 20, 0.2) 0.75%,
      rgba(255, 255, 255, 0.5) 1.25%,
      rgba(255, 255, 255, 0.25) 1.75%,
      rgba(255, 255, 255, 0.25) 2.5%,
      rgba(0, 0, 0, 0.05) 3%,
      transparent 4%,
      rgba(255, 255, 255, 0.25) 4.25%,
      transparent 5.5%
    );
  }
</style>
