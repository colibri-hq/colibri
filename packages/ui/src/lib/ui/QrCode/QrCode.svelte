<script lang="ts">
  import Qrcode, { type QRCode, type QRCodeErrorCorrectionLevel } from 'qrcode';
  import { twMerge } from 'tailwind-merge';
  import { fade, type TransitionConfig } from 'svelte/transition';
  import type { Snippet } from 'svelte';

  interface Props {

    /**
     * Additional CSS classes to apply to the QR code wrapper.
     */
    class?: string;

    /**
     * The data to encode in the QR code.
     */
    value: string;

    /**
     * The error correction level for the QR code. Options are:
     *
     *  - `L` (Low): 7% error correction
     *  - `M` (Medium): 15% error correction
     *  - `Q` (Quartile): 25% error correction
     *  - `H` (High): 30% error correction
     */
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel;

    /**
     * The ratio of the X mask to the Y mask. This is used to adjust the
     * aspect ratio of the QR code.
     */
    maskXToYRatio?: number;

    /**
     * Whether to display the QR code as square blocks or circles.
     */
    squares?: boolean;

    /**
     * The margin around the QR code, in dots.
     */
    margin?: number;

    /**
     * Whether to mask the center of the QR code.
     */
    maskCenter?: boolean;

    /**
     * The transition configuration for the QR code.
     */
    transition?: TransitionConfig;

    /**
     * Children to render inside the QR code. This can be used to add a logo or
     * other elements inside the QR code.
     *
     * The children will only be visible if `maskCenter` is `true`.
     */
    children?: Snippet;

    [key: string]: unknown;
  }

  let {
    class: className = '',
    value,
    errorCorrectionLevel = 'Q',
    maskXToYRatio = 1,
    squares = false,
    margin = 0,
    maskCenter = false,
    transition = { duration: 100 },
    children,
    ...rest
  }: Props = $props();
  let qr: QRCode | undefined = $derived(
    value
      ? Qrcode.create(value, { errorCorrectionLevel, maskPattern: 0 })
      : undefined,
  );

  function isPositioningElement(row: number, column: number, count: number) {
    const elemWidth = 7;

    return (
      row <= elemWidth
        ? column <= elemWidth || column >= count - elemWidth
        : column <= elemWidth
          ? row >= count - elemWidth
          : false
    );
  }

  /**
   * For ErrorCorrectionLevel 'H', up to 30% of the code can be corrected. To
   * be safe, we limit damage to 10%.
   */
  function isRemovableCenter(
    row: number,
    column: number,
    count: number,
    maskCenter: boolean,
    maskXToYRatio: number,
  ) {
    if (!maskCenter) {
      return false;
    }

    const center = count / 2;
    const safelyRemovableHalf = Math.floor((count * Math.sqrt(0.1)) / 2);
    const safelyRemovableHalfX = safelyRemovableHalf * maskXToYRatio;
    const safelyRemovableHalfY = safelyRemovableHalf / maskXToYRatio;
    const safelyRemovableStartX = center - safelyRemovableHalfX;
    const safelyRemovableEndX = center + safelyRemovableHalfX;
    const safelyRemovableStartY = center - safelyRemovableHalfY;
    const safelyRemovableEndY = center + safelyRemovableHalfY;

    return (
      row >= safelyRemovableStartY &&
      row <= safelyRemovableEndY &&
      column >= safelyRemovableStartX &&
      column <= safelyRemovableEndX
    );
  }

  function showModule(column: number, row: number) {
    return (
      qr!.modules.get(column, row) &&
      (squares ||
        (!isPositioningElement(row, column, count) &&
          !isRemovableCenter(row, column, count, maskCenter, maskXToYRatio)))
    );
  }

  let classList = $derived(twMerge('bg-white dark:bg-black', className));

  let count = $derived(qr?.modules?.size ?? 0);
  let pixelSize = $derived(count + margin * 2);
  let coordinateShift = $derived(pixelSize / 2);
</script>

<div
  {...rest}
  class="relative col-span-full row-span-full flex items-center justify-center {classList}"
  in:fade={transition}
  out:fade={transition}
>
  <div
    class="absolute flex items-center justify-center"
    class:hidden={squares}
    class:invisible={squares}
  >
    <div style:margin="5px 0 0 5px" style:--width={`${28 * maskXToYRatio}%`}>
      {@render children?.()}
    </div>
  </div>

  {#if qr}
    {#key qr}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="{margin - 0.5 - coordinateShift} {margin - 0.5 - coordinateShift} {pixelSize} {pixelSize}"
        preserveAspectRatio="xMinYMin meet"
      >
        <!-- region squares -->
        {#if !squares}
          <!-- region top left -->
          <path
            class="position-ring fill-current"
            d="M{margin - coordinateShift} {margin - 0.5 - coordinateShift}h6s.5 0 .5 .5v6s0 .5-.5
             .5h-6s-.5 0-.5-.5v-6s0-.5 .5-.5zm.75 1s-.25 0-.25 .25v4.5s0 .25 .25 .25h4.5s.25 0
             .25-.25v-4.5s0-.25 -.25 -.25h-4.5z"
          />
          <path
            class="position-center fill-current"
            d="M{margin + 2 - coordinateShift} {margin + 1.5 - coordinateShift}h2s.5 0 .5 .5v2s0
            .5-.5 .5h-2s-.5 0-.5-.5v-2s0-.5 .5-.5z"
          />
          <!-- endregion -->

          <!-- region top right -->
          <path
            class="position-ring fill-current"
            d="M{count - 7 + margin - coordinateShift} {margin - 0.5 - coordinateShift}h6s.5 0 .5
            .5v6s0 .5-.5 .5h-6s-.5 0-.5-.5v-6s0-.5 .5-.5zm.75 1s-.25 0-.25 .25v4.5s0 .25 .25
            .25h4.5s.25 0 .25-.25v-4.5s0-.25 -.25 -.25h-4.5z"
          />
          <path
            class="position-center fill-current"
            d="M{count - 7 + margin + 2 - coordinateShift} {margin + 1.5 - coordinateShift}h2s.5
            0 .5 .5v2s0 .5-.5 .5h-2s-.5 0-.5-.5v-2s0-.5 .5-.5z"
          />
          <!-- endregion -->

          <!-- region bottom left -->
          <path
            class="position-ring fill-current"
            d="M{margin - coordinateShift} {count - 7 + margin - 0.5 - coordinateShift}h6s.5
            0 .5 .5v6s0 .5-.5 .5h-6s-.5 0-.5-.5v-6s0-.5 .5-.5zm.75 1s-.25 0-.25 .25v4.5s0 .25 .25
            .25h4.5s.25 0 .25-.25v-4.5s0-.25 -.25 -.25h-4.5z"
          />
          <path
            class="position-center fill-current"
            d="M{margin + 2 - coordinateShift} {count - 7 + margin + 1.5 - coordinateShift}h2s.5
            0 .5 .5v2s0 .5-.5 .5h-2s-.5 0-.5-.5v-2s0-.5 .5-.5z"
          />
          <!-- endregion -->
        {/if}
        <!-- endregion -->

        <!-- region modules -->
        {#each { length: count } as _, column (column)}
          {@const positionX = column + margin}

          {#each { length: count } as _, row (column + row)}
            {#if showModule(column, row)}
              {@const positionY = row + margin}
              {#if squares}
                <rect
                  x={positionX - 0.5 - coordinateShift}
                  y={positionY - 0.5 - coordinateShift}
                  class="fill-current"
                  width="1"
                  height="1"
                />
              {:else}
                <circle
                  class="fill-current"
                  cx={positionX - coordinateShift}
                  cy={positionY - coordinateShift}
                  r="0.5"
                />
              {/if}
            {/if}
          {/each}
        {/each}
        <!-- endregion -->
      </svg>
    {/key}
  {/if}
</div>
