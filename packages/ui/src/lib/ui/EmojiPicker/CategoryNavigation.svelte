<script lang="ts">
  import Icon from '../Icon/Icon.svelte';

  interface Props {
    groups: Record<string, string>;
    active?: string;
    onInput?: (group: string) => unknown;
  }

  let { groups, active = $bindable(), onInput }: Props = $props();

  function activate(group: string) {
    if (active === group) {
      return;
    }

    onInput?.(group);

    return () => {
      active = group;
    };
  }

  const activeClasses =
    'text-blue-500 hover:text-blue-500 ' +
    'dark:text-blue-500 dark:hover:text-blue-500 cursor-default';
  const inactiveClasses =
    'hover:text-gray-800 focus-visible:text-gray-800 cursor-pointer ' +
    'dark:hover:text-gray-200 dark:focus-visible:text-gray-200';
</script>

<nav class="mb-1 flex items-center justify-evenly text-gray-500 select-none">
  {#each Object.entries(groups) as [group, icon] (group)}
    <button
      class="outline-none transition {active === group
        ? activeClasses
        : inactiveClasses}"
      onclick={activate(group)}
      tabindex={active === group ? -1 : 0}
    >
      <Icon name={icon} class="text-lg" />
    </button>
  {/each}
</nav>
