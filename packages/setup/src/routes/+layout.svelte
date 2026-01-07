<script lang="ts">
  import "../app.css";
  import { ColibriLogo } from "@colibri-hq/ui";

  let { children } = $props();
</script>

<div class="flex min-h-screen flex-col">
  <header class="border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-gray-800 dark:bg-black/80">
    <div class="mx-auto flex max-w-2xl items-center gap-3">
      <ColibriLogo class="size-8" />
      <h1 class="text-xl font-semibold">Colibri Setup</h1>
    </div>
  </header>

  <main class="flex-1 px-6 py-8">
    <div class="mx-auto max-w-2xl">
      {@render children()}
    </div>
  </main>

  <footer class="border-t border-gray-200 px-6 py-4 text-center text-sm text-gray-500 dark:border-gray-800">
    <p>Colibri &mdash; Self-hosted ebook library</p>
  </footer>
</div>
