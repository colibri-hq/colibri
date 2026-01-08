<script lang="ts">
  import { Directory, Page } from '$lib/content/content.js';
  import type { PageProps } from './$types.js';
  import {
    ArrowRightIcon,
    ChevronRightIcon,
    CloudUploadIcon,
    FolderHeartIcon,
    GlobeIcon,
    NotebookTextIcon,
    UsersIcon,
  } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import { Github } from '$lib/components/icons';

  const { data }: PageProps = $props();

  const hummingbirds = [
    { id: 0, size: 18, delay: 0.0, duration: 4.2 },
    { id: 1, size: 16, delay: 0.2, duration: 3.0 },
    { id: 2, size: 20, delay: 0.1, duration: 5.0 },
    { id: 3, size: 15, delay: 0.4, duration: 2.8 },
    { id: 4, size: 17, delay: 0.3, duration: 3.8 },
  ];

  function getTitle(item: Page | Directory) {
    return item instanceof Page ? item.metadata.title : item.title;
  }

  function getDescription(item: Page | Directory) {
    return item instanceof Page ? item.metadata.description : item.metadata?.description;
  }

  const steps = [
    {
      icon: CloudUploadIcon,
      title: 'Upload your books',
      description: 'Drop in your EPUBs, MOBIs, or PDFs. Colibri extracts what it can and enriches the rest automatically.',
    },
    {
      icon: FolderHeartIcon,
      title: 'Organize effortlessly',
      description: 'Create collections, track what you\'ve read, rate and review. Your library, organized the way you think about it.',
    },
    {
      icon: GlobeIcon,
      title: 'Access anywhere',
      description: 'Your books are available on any device with a browser. No syncing, no app stores, no friction.',
    },
    {
      icon: UsersIcon,
      title: 'Share with people you trust',
      description: 'Invite family and friends. Everyone gets their own space, their own collections, their own reading history.',
    },
  ];
</script>

<svelte:head>
  <title>Colibri — Your Books. Beautifully Organized.</title>
  <meta name="description"
        content="Colibri is a library you actually own—simple to use, accessible from any device, and easy to share with friends and family." />
</svelte:head>

<main data-pagefind-body>
  <header
    class="hero-section relative overflow-hidden bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900
    dark:to-gray-950 border-b border-gray-200 dark:border-gray-900"
  >
    <!-- Static gradient orbs -->
    <div
      class="absolute rounded-full blur-2xl opacity-50 dark:opacity-15 size-96 -top-24 -right-24 bg-linear-to-br
      from-violet-400 to-violet-600"
      aria-hidden="true"
    ></div>
    <div
      class="absolute rounded-full blur-2xl opacity-30 dark:opacity-15 size-80 -bottom-12 -left-12 bg-linear-to-br
      from-orange-300 to-red-300"
      aria-hidden="true"
    ></div>
    <div
      class="absolute rounded-full blur-2xl opacity-20 dark:opacity-15 size-52 top-1/2 left-1/5 bg-linear-to-br
      from-teal-400 to-fuchsia-600"
      aria-hidden="true"
    ></div>

    <!-- Hummingbird-inspired animated elements -->
    <div class="hummingbirds absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {#each hummingbirds as bird (bird.id)}
        <svg
          class="absolute opacity-0 left-0 top-0 blur-[1px] will-change-auto hummingbird-{bird.id}"
          viewBox="0 0 50 28"
          style="
            width: {bird.size * 2.2}px;
            height: {bird.size * 1.2}px;
            animation-delay: {bird.delay}s;
            animation-duration: {bird.duration}s;
          "
        >
          <!-- Body -->
          <ellipse cx="22" cy="16" rx="9" ry="5" class="bird-body" />
          <!-- Head -->
          <circle cx="30" cy="13" r="4" class="bird-body" />
          <!-- Long thin beak -->
          <path d="M34 12.5 L50 11 L34 13.5 Z" class="bird-beak" />
          <!-- Tail feathers -->
          <path d="M13 16 Q5 14 2 10 L6 15 Q4 18 2 22 L8 17 Z" class="bird-body" />
          <!-- Wing (animated) -->
          <ellipse cx="20" cy="10" rx="10" ry="5" class="bird-wing" style="--wing-delay: {bird.id * 0.03}s" />
        </svg>
      {/each}
    </div>

    <div class="mx-auto px-4 py-20 md:py-28 lg:py-32 relative">
      <div class="max-w-3xl mx-auto text-center">
        <h1
          class="text-4xl md:text-5xl lg:text-6xl font-bold font-serif tracking-tight text-gray-900 dark:text-white
           mb-6"
        >
          Your Books.<br class="hidden sm:block" />
          <span class="bg-linear-to-br from-blue-400 to-blue-800 bg-clip-text text-transparent">
            Beautifully Organized.
          </span>
        </h1>
        <p class="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Colibri is a library you actually own—simple to use, accessible from any device, and easy to share with
          friends and family.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={resolve("/getting-started")}
            class="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-xl text-white
            shadow-md hover:shadow-lg ring-0 transition duration-300 outline-hidden focus-visible:ring-3
            ring-blue-400 dark:ring-blue-700 dark:ring-offset-2 dark:ring-offset-slate-800 select-none
            bg-linear-to-br from-blue-500 to-blue-700 hover:from-blue-500 hover:to-blue-800 to-80%"
          >
            Get Started
            <ArrowRightIcon />
          </a>
          <a
            href={PACKAGE_REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-xl
            shadow-sm hover:shadow-md bg-white hover:bg-gray-50 ring-1 ring-gray-200
            focus-visible:ring-3 focus-visible:ring-blue-500 outline-hidden transition-all duration-200 select-none
          dark:bg-gray-900 dark:hover:bg-gray-950 dark:ring-blue-400/50 dark:hover:ring-blue-500"
          >
            <Github />
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  </header>

  <section class="py-16 md:py-24">
    <div class="mx-auto px-4">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-bold font-serif text-gray-900 dark:text-white mb-6">
          What is Colibri?
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
          Colibri is a personal ebook server you host yourself. Upload your collection, and Colibri enriches it with
          professional bibliographic metadata from 14+ sources—Library of Congress, WikiData, Open Library, and more.
          Accurate titles, authors, series, publishers, and identifiers, without the manual cataloging&nbsp;work.
        </p>
        <p class="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          Access from any device, organize into collections, and share with friends and family. No platform lock-in, no
          tracking. Just your books, properly cataloged.
        </p>
      </div>
    </div>
  </section>

  <section class="py-16 md:py-24 bg-gray-50/50 dark:bg-gray-900/50">
    <div class="mx-auto px-4">
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold font-serif text-gray-900 dark:text-white mb-4">
          Simple by design
        </h2>
      </div>

      <div class="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {#each steps as step, index (index)}
          {@const StepIcon = step.icon}
          <div
            class="shadow-sm hover:shadow-md group p-6 rounded-2xl bg-white dark:bg-gray-800/50 border
            border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800/50
            transition-all duration-300"
          >
            <div
              class="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 transition-transform
              duration-300 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110"
            >
              <StepIcon />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="py-16 md:py-24">
    <div class="mx-auto px-4">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-bold font-serif text-gray-900 dark:text-white mb-6">
          Built different
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
          We built Colibri because we wanted a library that felt personal again. One where your reading habits aren't
          training an algorithm, where you don't lose access when a service shuts down, and where sharing a book
          recommendation doesn't require everyone to sign up for the same platform.
        </p>
        <p class="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          Colibri is open source, self-hosted, and designed for people who believe their books—and their data—should
          belong to them.
        </p>
      </div>
    </div>
  </section>

  <section class="py-16 md:py-24 bg-gray-50/50 dark:bg-gray-900/50">
    <div class="mx-auto px-4">
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold font-serif text-gray-900 dark:text-white mb-4">
          Explore the documentation
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Everything you need to get started, configure, and extend Colibri.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {#each data.sections as section (section.slug)}
          <a
            href={section.slug}
            class="doc-card group flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-gray-800/50 ring-1
            ring-gray-100 dark:ring-gray-700/50 hover:ring-blue-400 dark:hover:ring-blue-800/50 hover:shadow-md
            dark:hover:shadow-blue-900/10 transition-all duration-300 outline-hidden focus-visible:ring-3
            focus-visible:ring-blue-500"
          >
            <div
              class="shrink-0 size-10 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center
              text-gray-500 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30
              group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
            >
              <NotebookTextIcon />
            </div>
            <div class="flex-1 min-w-0">
              <h3
                class="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600
                dark:group-hover:text-blue-400 transition-colors"
              >
                {getTitle(section)}
              </h3>
              {#if getDescription(section)}
                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {getDescription(section)}
                </p>
              {/if}
              {#if section instanceof Directory && section.children.length > 0}
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  {section.children.length} {section.children.length === 1 ? 'article' : 'articles'}
                </p>
              {/if}
            </div>
            <ChevronRightIcon
              class="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 group-hover:translate-x-1
              transition-all duration-300"
            />
          </a>
        {/each}
      </div>
    </div>
  </section>

  <section class="py-20 md:py-28">
    <div class="mx-auto px-4">
      <div
        class="bg-linear-to-br from-blue-600 dark:from-blue-700 to-blue-900 dark:to-blue-950 max-w-4xl mx-auto
        text-center p-10 md:p-16 rounded-3xl relative overflow-hidden"
      >
        <div class="absolute inset-0 bg-radial-[at_20%_80%] from-white/10 to-transparent to-50%"
             aria-hidden="true"></div>
        <div class="absolute inset-0 bg-radial-[at_80%_20%] from-white/20 to-transparent to-50%"
             aria-hidden="true"></div>

        <div class="relative">
          <h2 class="text-3xl md:text-4xl font-bold font-serif text-white mb-4">
            Ready to organize your library?
          </h2>
          <p class="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            Get started with Colibri in minutes. Self-host your own instance or explore the documentation.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={resolve("/[...slug=slug]", {slug: "getting-started/quick-start"})}
              class="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-blue-600 font-medium
              rounded-xl hover:bg-blue-50 transition duration-300 outline-hidden ring-offset-3 ring-offset-blue-600
              focus-visible:ring-3 focus-visible:ring-white select-none"
            >
              Quick Start Guide
              <ArrowRightIcon />
            </a>

            <a
              href={PACKAGE_REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-700 text-white font-medium
              rounded-xl hover:bg-blue-800 transition duration-300 ring ring-blue-500 outline-hidden focus-visible:ring-3
              focus-visible:ring-blue-100 select-none"
            >
              <Github />
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>

<style>
    /* Hummingbird cinematic fly-through animation */
    .bird-body {
        fill: #4b5563;
    }

    .bird-beak {
        fill: #374151;
    }

    .bird-wing {
        fill: #6b7280;
        transform-origin: 24px 14px;
        animation: wing-flap 0.06s ease-in-out infinite alternate;
        animation-delay: var(--wing-delay, 0s);
    }

    @keyframes wing-flap {
        0% {
            transform: rotate(-30deg) scaleY(0.6);
        }
        100% {
            transform: rotate(20deg) scaleY(1.1);
        }
    }

    /* Dark mode: lighter colors */
    :global(.dark) .bird-body {
        fill: #9ca3af;
    }

    :global(.dark) .bird-beak {
        fill: #6b7280;
    }

    :global(.dark) .bird-wing {
        fill: #d1d5db;
    }

    /* Flight path animations - each bird has a unique curved trajectory */
    .hummingbird-0 {
        animation: flight-0 var(--duration, 4.5s) ease-in-out forwards;
    }

    .hummingbird-1 {
        animation: flight-1 var(--duration, 4.2s) ease-in-out forwards;
    }

    .hummingbird-2 {
        animation: flight-2 var(--duration, 4.8s) ease-in-out forwards;
    }

    .hummingbird-3 {
        animation: flight-3 var(--duration, 4.3s) ease-in-out forwards;
    }

    .hummingbird-4 {
        animation: flight-4 var(--duration, 4.6s) ease-in-out forwards;
    }

    /* Bird 0: Fly in from left, hover at center-right, exit top-right */
    /* Duration 4.2s: ~1s in, ~1.8s hover, ~1.4s out */
    @keyframes flight-0 {
        0% {
            transform: translate(-5vw, 22vh) rotate(-12deg);
            opacity: 0;
        }
        8% {
            opacity: 0.7;
        }
        /* Arrive at hover point */
        25% {
            transform: translate(58vw, 14vh) rotate(0deg);
            opacity: 0.7;
        }
        /* Hover phase - subtle drift */
        35% {
            transform: translate(60vw, 12vh) rotate(3deg);
        }
        45% {
            transform: translate(57vw, 15vh) rotate(-2deg);
        }
        55% {
            transform: translate(61vw, 13vh) rotate(2deg);
        }
        65% {
            transform: translate(58vw, 14vh) rotate(0deg);
            opacity: 0.7;
        }
        /* Exit flight */
        75% {
            transform: translate(72vw, 8vh) rotate(8deg);
        }
        92% {
            opacity: 0.7;
        }
        100% {
            transform: translate(105vw, -5vh) rotate(15deg);
            opacity: 0;
        }
    }

    /* Bird 1: Fly in from bottom-left, hover center-left, exit right */
    /* Duration 3.0s: ~0.8s in, ~0.9s hover, ~1.3s out */
    @keyframes flight-1 {
        0% {
            transform: translate(-8vw, 35vh) rotate(-18deg);
            opacity: 0;
        }
        10% {
            opacity: 0.6;
        }
        /* Arrive at hover point */
        28% {
            transform: translate(25vw, 18vh) rotate(0deg);
            opacity: 0.6;
        }
        /* Hover phase - subtle drift */
        38% {
            transform: translate(27vw, 16vh) rotate(4deg);
        }
        48% {
            transform: translate(24vw, 19vh) rotate(-3deg);
        }
        58% {
            transform: translate(26vw, 17vh) rotate(0deg);
            opacity: 0.6;
        }
        /* Exit flight */
        72% {
            transform: translate(55vw, 10vh) rotate(5deg);
        }
        90% {
            opacity: 0.6;
        }
        100% {
            transform: translate(102vw, 20vh) rotate(10deg);
            opacity: 0;
        }
    }

    /* Bird 2: Fly in from top, hover high center, exit bottom-right */
    /* Duration 5.0s: ~1.2s in, ~2.2s hover, ~1.6s out */
    @keyframes flight-2 {
        0% {
            transform: translate(20vw, -8vh) rotate(20deg);
            opacity: 0;
        }
        8% {
            opacity: 0.65;
        }
        /* Arrive at hover point */
        24% {
            transform: translate(42vw, 10vh) rotate(0deg);
            opacity: 0.65;
        }
        /* Hover phase - longer, more subtle */
        32% {
            transform: translate(44vw, 8vh) rotate(2deg);
        }
        40% {
            transform: translate(41vw, 11vh) rotate(-2deg);
        }
        48% {
            transform: translate(43vw, 9vh) rotate(3deg);
        }
        56% {
            transform: translate(40vw, 12vh) rotate(-1deg);
        }
        64% {
            transform: translate(42vw, 10vh) rotate(0deg);
            opacity: 0.65;
        }
        /* Exit flight */
        78% {
            transform: translate(68vw, 25vh) rotate(12deg);
        }
        92% {
            opacity: 0.65;
        }
        100% {
            transform: translate(108vw, 38vh) rotate(18deg);
            opacity: 0;
        }
    }

    /* Bird 3: Fly in from left low, hover bottom-center, quick exit */
    /* Duration 2.8s: ~0.7s in, ~0.8s hover, ~1.3s out */
    @keyframes flight-3 {
        0% {
            transform: translate(-6vw, 28vh) rotate(-15deg);
            opacity: 0;
        }
        12% {
            opacity: 0.55;
        }
        /* Arrive at hover point */
        26% {
            transform: translate(35vw, 22vh) rotate(0deg);
            opacity: 0.55;
        }
        /* Hover phase - quick */
        36% {
            transform: translate(37vw, 20vh) rotate(3deg);
        }
        46% {
            transform: translate(34vw, 23vh) rotate(-2deg);
        }
        54% {
            transform: translate(36vw, 21vh) rotate(0deg);
            opacity: 0.55;
        }
        /* Exit flight */
        70% {
            transform: translate(62vw, 15vh) rotate(8deg);
        }
        88% {
            opacity: 0.55;
        }
        100% {
            transform: translate(104vw, 5vh) rotate(12deg);
            opacity: 0;
        }
    }

    /* Bird 4: Fly in from bottom, hover right side, exit top-right */
    /* Duration 3.8s: ~1s in, ~1.4s hover, ~1.4s out */
    @keyframes flight-4 {
        0% {
            transform: translate(10vw, 40vh) rotate(-8deg);
            opacity: 0;
        }
        10% {
            opacity: 0.6;
        }
        /* Arrive at hover point */
        26% {
            transform: translate(68vw, 20vh) rotate(0deg);
            opacity: 0.6;
        }
        /* Hover phase */
        36% {
            transform: translate(70vw, 18vh) rotate(3deg);
        }
        46% {
            transform: translate(67vw, 21vh) rotate(-2deg);
        }
        56% {
            transform: translate(69vw, 19vh) rotate(2deg);
        }
        64% {
            transform: translate(68vw, 20vh) rotate(0deg);
            opacity: 0.6;
        }
        /* Exit flight */
        78% {
            transform: translate(82vw, 10vh) rotate(10deg);
        }
        92% {
            opacity: 0.6;
        }
        100% {
            transform: translate(106vw, -3vh) rotate(15deg);
            opacity: 0;
        }
    }

    /* Respect reduced motion */
    @media (prefers-reduced-motion: reduce) {
        .bird-wing {
            animation: none;
        }

        .hummingbird-0,
        .hummingbird-1,
        .hummingbird-2,
        .hummingbird-3,
        .hummingbird-4 {
            animation: none;
            opacity: 0;
        }
    }
</style>
