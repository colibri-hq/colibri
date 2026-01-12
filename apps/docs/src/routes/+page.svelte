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
  import { HummingbirdFlock } from '$lib/components/hero';

  const { data }: PageProps = $props();

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

    <!-- Hummingbird animation -->
    <HummingbirdFlock />

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
