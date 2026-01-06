<script lang="ts">
  interface Props {
    class?: string;
    /**
     * Name of the icon.
     */
    name?: string | undefined;
    /**
     * Weight and grade affect a symbol’s thickness. Adjustments to grade are more granular than adjustments to weight
     * and have a small impact on the size of the symbol.
     *
     * Grade is also available in some text fonts. You can match grade levels between text and symbols for a harmonious
     * visual effect. For example, if the text font has a -25 grade value, the symbols can match it with a suitable
     * value, say -25.
     *
     * You can use grade for different needs:
     *  - Low emphasis (e.g. -25 grade): To reduce glare for a light symbol on a dark background, use a low grade.
     *  - High emphasis (e.g. 200 grade): To highlight a symbol, increase the positive grade.
     */
    grade?: number | `${number}`;
    /**
     * Weight defines the symbol’s stroke weight, with a range of weights between thin (100) and bold (700).
     * Weight can also affect the overall size of the symbol.
     */
    weight?: number | `${number}`;
    /**
     * Optical sizes range from 20dp to 48dp.
     *
     * For the image to look the same at different sizes, the stroke
     * weight (thickness) changes as the icon size scales. Optical size offers a
     * way to automatically adjust the stroke weight when you increase or decrease
     * the symbol size.
     */
    opticalSize?: number | `${number}`;
    /**
     * Fill gives you the ability to modify the default icon style. A single icon
     * can render both unfilled and filled states.
     *
     * To convey a state transition, use the fill axis for animation
     * or interaction. The values are 0 for default or 1 for completely filled.
     * Along with the weight axis, the fill also impacts the look of the icon.
     */
    fill?: boolean;
    children?: import('svelte').Snippet;
  }

  let {
    class: className = '',
    name = undefined,
    grade = 0,
    weight = 400,
    opticalSize = 48,
    fill = false,
    children,
  }: Props = $props();

  let element: HTMLSpanElement | undefined = $state();
  $effect(() => {
    if (element) {
      element.style.setProperty('--icon-fill', fill ? '1' : '0');
      element.style.setProperty('--icon-weight', weight.toString());
      element.style.setProperty('--icon-grade', grade.toString());
      element.style.setProperty('--icon-optical-size', opticalSize.toString());
    }
  });
</script>

<span bind:this={element} aria-hidden="true" class="icon {className}">
  {#if children}{@render children()}{:else}{name}{/if}
</span>

<style>
    .icon {
        font-family: 'Material Symbols Outlined Variable', sans-serif;
        font-variation-settings: 'FILL' var(--icon-fill),
        'wght' var(--icon-weight),
        'GRAD' var(--icon-grade),
        'opsz' var(--icon-optical-size);
    }
</style>
