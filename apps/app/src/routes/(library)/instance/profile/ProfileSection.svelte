<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script lang="ts">
  export let title: string | undefined = undefined;
  export let help: string | undefined = undefined;
</script>

<section class="mt-8">
  <header>
    <h2 class="mb-2 text-lg font-bold dark:text-gray-400">
      {#if $$slots.title || title}
        <slot name="title">{title}</slot>
      {/if}
    </h2>
  </header>

  <div class="flex flex-col lg:flex-row">
    <slot name="before" />

    <div
      class="w-full pb-4 text-sm text-gray-400 lg:w-1/3 lg:pr-8 lg:pb-0 xl:w-1/4 dark:text-gray-600"
    >
      {#if $$slots?.help}
        <slot name="help">{help}</slot>
      {/if}
    </div>

    <div
      class="flex w-full flex-col rounded-xl border bg-gray-100 p-4 shadow-inner-sm
    lg:w-2/3 xl:w-3/4 dark:border-gray-950 dark:bg-gray-900"
    >
      <slot />

      {#if $$slots.after}
        <div class="mt-auto">
          <slot name="after" />
        </div>
      {/if}
    </div>
  </div>

  {#if $$slots.footer}
    <footer class="mt-auto">
      <slot name="footer" />
    </footer>
  {/if}
</section>
