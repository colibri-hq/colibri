<script lang="ts">
  import { decode } from 'blurhash';
  import { BROWSER } from 'esm-env';
  import { twMerge } from 'tailwind-merge';

  interface Props {

    /**
     * Additional classes to apply to the canvas element.
     */
    class?: string;

    /**
     * The Blurhash string to decode and display.
     *
     * @see https://blurha.sh/
     */
    blurhash: string;

    /**
     * The size of the canvas. The Blurhash will be rendered in a square canvas
     * of this size. The actual size of the image will be `size * 2` pixels.
     * Note that you can still resize the container, since stretching the image
     * is not a problem.
     */
    size?: number;
  }

  let { class: additionalClasses = '', blurhash, size = 32 }: Props = $props();
  let canvas: HTMLCanvasElement | undefined = $state();
  let className = twMerge('bg-white dark:bg-black dark:opacity-70', additionalClasses);

  function render(blurhash: string, size: number) {

    // Valid blurhash strings must be at least 6 characters in length
    if (blurhash.length < 6) {
      return;
    }

    // TODO: Render in web worker, if possible
    const context = canvas?.getContext('2d');
    const pixels = decode(blurhash, size, size);

    context?.putImageData(new ImageData(pixels, size, size), 0, 0);
  }

  // Rendering will only work in the browser
  if (BROWSER) {
    $effect(() => canvas && render(blurhash, size));
  }
</script>

<canvas
  bind:this={canvas}
  class={className}
  height="{size}px"
  width="{size}px"
></canvas>
