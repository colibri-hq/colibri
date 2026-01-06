<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface Props {
    class?: string;

    /**
     * The size of the loading indicator.
     */
    size?: 'small' | 'medium' | 'large';

    /**
     * The speed of the loading indicator animation.
     */
    speed?: 'slow' | 'normal' | 'fast';
  }

  let {
    class: className = '',
    size = 'medium',
    speed = 'normal',
  }: Props = $props();

  const classList = $derived(twMerge(
    {
      small: 'w-12 h-8 after:shadow-[0_1px_0_0.5px_rgba(0,0,0,0.2)]',
      medium: 'w-24 h-16 after:shadow-[0_2px_0_1px_rgba(0,0,0,0.2)]',
      large: 'w-32 h-24 after:shadow-[0_2px_0_1px_rgba(0,0,0,0.2)]',
    }[size],
    size === 'small'
      ? '[transform:perspective(100px)_rotateX(40deg)]'
      : '[transform:perspective(300px)_rotateX(30deg)]',
    {
      slow: '[--speed:2s]',
      normal: '[--speed:1s]',
      fast: '[--speed:0.5s]',
    }[speed],
  ));
</script>

<div class={twMerge(className, 'px-1')}>
  <div
    class="relative flex transform-3d after:absolute after:bottom-[10%] after:left-0 after:right-0
    after:top-[5%] after:-z-10 after:bg-gray-200 after:content-[''] {classList}"
  >
    <div
      class="absolute left-0 top-0 -mt-[10%] h-full w-1/2 bg-linear-to-r
      from-gray-100 via-gray-50 via-30% to-gray-100 shadow-[0_1px_0_1px_rgba(0,0,0,0.005),0_3px_0_1px_rgba(0,0,0,0.01)]
      [clip-path:url(#book-curvature)]"
    ></div>
    <div
      class="absolute left-1/2 top-0 -mt-[10%] h-full w-1/2 bg-linear-to-r
      from-gray-100 via-gray-50 via-30% to-gray-100 shadow-[inset_1px_0_0_-0.5px_rgba(0,0,0,0.1)]
      [clip-path:url(#book-curvature)]"
    ></div>
    <div
      class="absolute left-0 top-0 -mt-[10%] h-full w-1/2 origin-right
      bg-linear-to-r from-gray-200 via-gray-100 via-30% to-gray-200 [clip-path:url(#book-curvature)]"
      data-flipping-page
    ></div>
  </div>

  <svg height="0" width="0">
    <defs>
      <clipPath clipPathUnits="objectBoundingBox" id="book-curvature">
        <path
          d="M 0 0.2 C 0.35 0 0.65 0 1 0.2 L 1 1 C 0.65 0.8 0.35 0.8 0 1 L 0 0.2 Z"
        />
      </clipPath>
    </defs>
  </svg>
</div>

<style>
    [data-flipping-page] {
        animation: page-flip var(--speed) infinite forwards;
    }

    @keyframes page-flip {
        0% {
            opacity: 0;
        }
        5% {
            transform: rotateY(180deg) translateX(0);
        }
        50% {
            opacity: 1;
        }
        90% {
            transform: rotateY(0) translateX(0);
        }
        99% {
            opacity: 0;
            transform: rotateY(0) translateX(0);
        }
        100% {
            opacity: 0;
            transform: rotateY(0) translateX(100%);
        }
    }
</style>
