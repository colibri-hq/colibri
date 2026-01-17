<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface Props {
    class?: string;
    size?: number;
    speed?: number;
    thickness?: number;
    gap?: number;
    radius?: number;
    paused?: boolean;
    children?: import('svelte').Snippet;

    [key: string]: unknown;
  }

  let {
    class: className = '',
    size = 32,
    speed = 750,
    thickness = 4,
    gap = 40,
    radius = 14,
    paused = false,
    children,
    ...rest
  }: Props = $props();

  let dash: number = $derived((2 * Math.PI * radius * (100 - gap)) / 100);

  const classList = $derived(twMerge(className, 'relative'));
</script>

<div
  {...rest}
  aria-busy="true"
  aria-live="polite"
  aria-valuemax="100"
  aria-valuemin="0"
  aria-valuetext="Loading..."
  class={classList}
  role="progressbar"
>
  <!-- eslint-disable svelte/no-inline-styles -- Dynamic animation speed/state from props -->
  <svg
    class="svelte-spinner animate-spin transition-transform"
    height={size}
    style:animation-duration="{speed}ms"
    style:animation-play-state={paused ? 'paused' : 'running'}
    viewBox="0 0 32 32"
    width={size}
  >
    <circle
      class="stroke-gray-100 [animation-play-state:inherit] dark:stroke-gray-700"
      cx="16"
      cy="16"
      fill="none"
      r={radius}
      role="presentation"
      stroke-linecap="round"
      stroke-width={thickness}
    />
    <circle
      class="stroke-blue-500 [animation-iteration-count:infinite] [animation-play-state:inherit]"
      cx="16"
      cy="16"
      fill="none"
      r={radius}
      role="presentation"
      stroke-dasharray="{dash},100"
      stroke-linecap="round"
      stroke-width={thickness}
      style:animation-duration="{speed * 2}ms"
    />
  </svg>
  <!-- eslint-enable svelte/no-inline-styles -->

  <div class="absolute inset-0 flex items-center justify-center">
    {@render children?.()}
  </div>
</div>

<style lang="postcss">
  circle[stroke-width] {
    animation-name: squeeze;
  }

  @keyframes squeeze {
    0%,
    100% {
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dashoffset: 22;
    }
  }
</style>
