<script lang="ts">
  interface Props {
    class: string;

    [key: string]: any;
  }

  let { class: className, ...rest }: Props = $props();
</script>

<svg
  {...rest}
  class={className}
  height="100%"
  width="100%"
  xmlns="http://www.w3.org/2000/svg"
>
  <filter id="noise" x="0" y="0">
    <feTurbulence
      baseFrequency="0.65"
      numOctaves="3"
      stitchTiles="stitch"
      type="fractalNoise"
    />
    <feBlend in2="" mode="screen" />
  </filter>

  <rect filter="url(#noise)" height="100%" width="100%" />
</svg>
