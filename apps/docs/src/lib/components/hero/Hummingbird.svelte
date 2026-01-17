<script lang="ts">
  interface Props {
    id: number;
    size?: number;
    delay?: number;
    duration?: number;
  }

  const { id, size = 18, delay = 0, duration = 4 }: Props = $props();

  const birdStyle = $derived(`
    width: ${size * 2.2}px;
    height: ${size * 1.2}px;
    animation-delay: ${delay}s;
    --duration: ${duration}s;
    --wing-delay: ${id * 0.03}s;
  `);
</script>

<!-- eslint-disable svelte/no-inline-styles -- Dynamic styles required for animation props -->
<svg
  class="absolute left-0 top-0 opacity-0 blur-[1px] will-change-auto bird-flight bird-flight-{id}"
  viewBox="0 0 50 28"
  style={birdStyle}
  aria-hidden="true"
>
<!-- eslint-enable svelte/no-inline-styles -->
  <!-- Body -->
  <ellipse cx="22" cy="16" rx="9" ry="5" class="bird-body" />

  <!-- Head -->
  <circle cx="30" cy="13" r="4" class="bird-body" />

  <!-- Beak -->
  <path d="M34 12.5 L50 11 L34 13.5 Z" class="bird-beak" />

  <!-- Tail feathers -->
  <path d="M13 16 Q5 14 2 10 L6 15 Q4 18 2 22 L8 17 Z" class="bird-body" />

  <!-- Animated wing -->
  <ellipse cx="20" cy="10" rx="10" ry="5" class="bird-wing" />
</svg>

<style>
  /* Base bird colors - Tailwind gray-600 */
  .bird-body {
    fill: #4b5563;
  }

  .bird-beak {
    fill: #374151;
  }

  /* Animated wing - Tailwind gray-500 */
  .bird-wing {
    fill: #6b7280;
    transform-origin: 24px 14px;
    animation: wing-flap 0.06s ease-in-out infinite alternate;
    animation-delay: var(--wing-delay, 0s);
  }

  /* Dark mode colors */
  :global(.dark) .bird-body {
    fill: #9ca3af;
  }

  :global(.dark) .bird-beak {
    fill: #6b7280;
  }

  :global(.dark) .bird-wing {
    fill: #d1d5db;
  }

  /* Wing flapping animation */
  @keyframes wing-flap {
    from {
      transform: rotate(-30deg) scaleY(0.6);
    }
    to {
      transform: rotate(20deg) scaleY(1.1);
    }
  }

  /* Flight path animations */
  .bird-flight-0 {
    animation: flight-0 var(--duration) ease-in-out forwards;
  }

  .bird-flight-1 {
    animation: flight-1 var(--duration) ease-in-out forwards;
  }

  .bird-flight-2 {
    animation: flight-2 var(--duration) ease-in-out forwards;
  }

  .bird-flight-3 {
    animation: flight-3 var(--duration) ease-in-out forwards;
  }

  .bird-flight-4 {
    animation: flight-4 var(--duration) ease-in-out forwards;
  }

  /* Bird 0: Left → Center-right → Top-right */
  @keyframes flight-0 {
    0% { transform: translate(-5vw, 22vh) rotate(-12deg); opacity: 0; }
    8% { opacity: 0.7; }
    25% { transform: translate(58vw, 14vh) rotate(0deg); opacity: 0.7; }
    35% { transform: translate(60vw, 12vh) rotate(3deg); }
    45% { transform: translate(57vw, 15vh) rotate(-2deg); }
    55% { transform: translate(61vw, 13vh) rotate(2deg); }
    65% { transform: translate(58vw, 14vh) rotate(0deg); opacity: 0.7; }
    75% { transform: translate(72vw, 8vh) rotate(8deg); }
    92% { opacity: 0.7; }
    100% { transform: translate(105vw, -5vh) rotate(15deg); opacity: 0; }
  }

  /* Bird 1: Bottom-left → Center-left → Right */
  @keyframes flight-1 {
    0% { transform: translate(-8vw, 35vh) rotate(-18deg); opacity: 0; }
    10% { opacity: 0.6; }
    28% { transform: translate(25vw, 18vh) rotate(0deg); opacity: 0.6; }
    38% { transform: translate(27vw, 16vh) rotate(4deg); }
    48% { transform: translate(24vw, 19vh) rotate(-3deg); }
    58% { transform: translate(26vw, 17vh) rotate(0deg); opacity: 0.6; }
    72% { transform: translate(55vw, 10vh) rotate(5deg); }
    90% { opacity: 0.6; }
    100% { transform: translate(102vw, 20vh) rotate(10deg); opacity: 0; }
  }

  /* Bird 2: Top → Center → Bottom-right */
  @keyframes flight-2 {
    0% { transform: translate(20vw, -8vh) rotate(20deg); opacity: 0; }
    8% { opacity: 0.65; }
    24% { transform: translate(42vw, 10vh) rotate(0deg); opacity: 0.65; }
    32% { transform: translate(44vw, 8vh) rotate(2deg); }
    40% { transform: translate(41vw, 11vh) rotate(-2deg); }
    48% { transform: translate(43vw, 9vh) rotate(3deg); }
    56% { transform: translate(40vw, 12vh) rotate(-1deg); }
    64% { transform: translate(42vw, 10vh) rotate(0deg); opacity: 0.65; }
    78% { transform: translate(68vw, 25vh) rotate(12deg); }
    92% { opacity: 0.65; }
    100% { transform: translate(108vw, 38vh) rotate(18deg); opacity: 0; }
  }

  /* Bird 3: Left-low → Bottom-center → Right */
  @keyframes flight-3 {
    0% { transform: translate(-6vw, 28vh) rotate(-15deg); opacity: 0; }
    12% { opacity: 0.55; }
    26% { transform: translate(35vw, 22vh) rotate(0deg); opacity: 0.55; }
    36% { transform: translate(37vw, 20vh) rotate(3deg); }
    46% { transform: translate(34vw, 23vh) rotate(-2deg); }
    54% { transform: translate(36vw, 21vh) rotate(0deg); opacity: 0.55; }
    70% { transform: translate(62vw, 15vh) rotate(8deg); }
    88% { opacity: 0.55; }
    100% { transform: translate(104vw, 5vh) rotate(12deg); opacity: 0; }
  }

  /* Bird 4: Bottom → Right-side → Top-right */
  @keyframes flight-4 {
    0% { transform: translate(10vw, 40vh) rotate(-8deg); opacity: 0; }
    10% { opacity: 0.6; }
    26% { transform: translate(68vw, 20vh) rotate(0deg); opacity: 0.6; }
    36% { transform: translate(70vw, 18vh) rotate(3deg); }
    46% { transform: translate(67vw, 21vh) rotate(-2deg); }
    56% { transform: translate(69vw, 19vh) rotate(2deg); }
    64% { transform: translate(68vw, 20vh) rotate(0deg); opacity: 0.6; }
    78% { transform: translate(82vw, 10vh) rotate(10deg); }
    92% { opacity: 0.6; }
    100% { transform: translate(106vw, -3vh) rotate(15deg); opacity: 0; }
  }

  /* Accessibility: Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .bird-wing,
    .bird-flight {
      animation: none;
    }

    .bird-flight {
      opacity: 0;
    }
  }
</style>
