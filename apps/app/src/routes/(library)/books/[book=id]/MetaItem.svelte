<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script lang="ts">
  export let name: string | undefined = undefined;
  export let value: string | number | undefined = undefined;
</script>

<li
  class="flex grow flex-col items-center border-r border-gray-200 px-4
  last:border-r-0 dark:border-r-gray-700"
>
  <span class="mb-1 text-sm font-bold uppercase dark:text-gray-500">
    <slot name="name">{name}</slot>
  </span>
  <div
    class="flex grow flex-col items-center justify-center dark:text-gray-300"
  >
    <span class="text-2xl font-bold leading-none">
      <slot>{value}</slot>
    </span>

    <slot name="secondary" />
  </div>
</li>
