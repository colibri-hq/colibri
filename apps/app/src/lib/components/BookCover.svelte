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
    src = `/works/${book}/cover/file${edition ? `?edition=${edition}` : ''}`,
    alt = `Cover of ${title}`,
    ...rest
  }: Props = $props();

  let missingCover: boolean = $state(false);

  function handleFileError() {
    missingCover = true;
  }

  // Generate a consistent color based on the book ID for variety
  function getBookGradient(id: string): string {
    const gradients = [
      'linear-gradient(to bottom right, #9f1239, #4c0519)', // rose
      'linear-gradient(to bottom right, #b45309, #78350f)', // amber
      'linear-gradient(to bottom right, #047857, #064e3b)', // emerald
      'linear-gradient(to bottom right, #0369a1, #0c4a6e)', // sky
      'linear-gradient(to bottom right, #6d28d9, #4c1d95)', // violet
      'linear-gradient(to bottom right, #4338ca, #312e81)', // indigo
      'linear-gradient(to bottom right, #0f766e, #134e4a)', // teal
      'linear-gradient(to bottom right, #a21caf, #701a75)', // fuchsia
      'linear-gradient(to bottom right, #0e7490, #164e63)', // cyan
      'linear-gradient(to bottom right, #c2410c, #7c2d12)', // orange
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return gradients[Math.abs(hash) % gradients.length];
  }

  let bgGradient = $derived(getBookGradient(book));
</script>

<div
  {...rest}
  class="book-cover relative overflow-hidden rounded-sm {className}"
  class:fallback={missingCover}
>
  {#if !missingCover}
    <img
      {alt}
      class="{imageClasses} relative z-10 m-0 block h-auto max-h-[inherit] w-full"
      onerror={handleFileError}
      {src}
    />
  {:else}
    {#if blurhash}
      <BlurhashPanel class="absolute inset-0 z-0 h-full w-full" {blurhash} />
    {:else}
      <!-- Fallback book cover design -->
      <div class="fallback-cover absolute inset-0" style="background: {bgGradient}">
        <!-- Inner border/frame -->
        <div
          class="absolute inset-3 rounded-sm border border-white/20 sm:inset-4"
        ></div>

        <!-- Decorative line above title -->
        <div class="absolute top-1/4 right-4 left-4 flex items-center justify-center gap-2 sm:right-6 sm:left-6">
          <div class="h-px flex-1 bg-white/30"></div>
          <div class="h-1.5 w-1.5 rotate-45 border border-white/40"></div>
          <div class="h-px flex-1 bg-white/30"></div>
        </div>

        <!-- Title area -->
        <div class="absolute inset-x-4 top-1/3 bottom-1/3 flex items-center justify-center sm:inset-x-6">
          <h4
            class="line-clamp-4 text-center font-serif text-sm leading-snug font-medium tracking-wide text-white/90 sm:text-base"
          >
            {title}
          </h4>
        </div>

        <!-- Decorative line below title -->
        <div class="absolute bottom-1/4 right-4 left-4 flex items-center justify-center gap-2 sm:right-6 sm:left-6">
          <div class="h-px flex-1 bg-white/30"></div>
          <div class="h-1.5 w-1.5 rotate-45 border border-white/40"></div>
          <div class="h-px flex-1 bg-white/30"></div>
        </div>
      </div>
    {/if}

    <!-- Aspect ratio placeholder for fallback -->
    <div class="aspect-[2/3]"></div>
  {/if}

  <!-- Book spine highlight overlay (always visible) -->
  <div class="spine-overlay pointer-events-none absolute inset-0 z-20 rounded-sm"></div>
</div>

<style lang="postcss">
  .book-cover {
    /* Subtle book shadow */
    box-shadow:
      2px 2px 8px rgba(0, 0, 0, 0.3),
      inset -1px 0 0 rgba(255, 255, 255, 0.1);
  }

  .spine-overlay {
    background: linear-gradient(
      to right,
      /* Spine edge shadow */ rgba(0, 0, 0, 0.4) 0%,
      rgba(0, 0, 0, 0.2) 0.5%,
      /* Spine highlight */ rgba(255, 255, 255, 0.3) 1%,
      rgba(255, 255, 255, 0.15) 1.5%,
      rgba(255, 255, 255, 0.1) 2%,
      /* Transition to cover */ rgba(0, 0, 0, 0.05) 2.5%,
      transparent 4%,
      /* Subtle page edge on right */ transparent 97%,
      rgba(255, 255, 255, 0.05) 98%,
      rgba(0, 0, 0, 0.1) 100%
    );
  }

  .fallback-cover::before {
    /* Subtle texture overlay */
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.03) 2px,
      rgba(255, 255, 255, 0.03) 4px
    );
    pointer-events: none;
  }
</style>
