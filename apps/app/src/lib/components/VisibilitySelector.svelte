<script lang="ts">
  import { Icon } from '@colibri-hq/ui';

  export type Visibility = 'private' | 'shared' | 'public';

  interface Props {
    value: Visibility;
    onInput?: (value: Visibility) => void;
    disabled?: boolean;
  }

  let { value = $bindable('shared'), onInput, disabled = false }: Props = $props();

  const options: Array<{ value: Visibility; label: string; icon: string; description: string }> = [
    {
      value: 'private',
      label: 'Private',
      icon: 'lock',
      description: 'Only you can see this collection',
    },
    {
      value: 'shared',
      label: 'Shared',
      icon: 'group',
      description: 'All users on this instance can see this',
    },
    {
      value: 'public',
      label: 'Public',
      icon: 'public',
      description: 'Anyone with the link can view',
    },
  ];

  function select(v: Visibility) {
    if (disabled) return;
    value = v;
    onInput?.(v);
  }
</script>

<fieldset class="space-y-2" {disabled}>
  <legend class="sr-only">Collection visibility</legend>

  {#each options as option (option.value)}
    <label
      class="flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition
        {value === option.value
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/25'
        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}
        {disabled ? 'cursor-not-allowed opacity-50' : ''}"
    >
      <input
        type="radio"
        name="visibility"
        value={option.value}
        checked={value === option.value}
        onchange={() => select(option.value)}
        class="sr-only"
        {disabled}
      />

      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
          {value === option.value
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}"
      >
        <Icon name={option.icon} />
      </div>

      <div class="flex-1">
        <div class="font-medium text-gray-900 dark:text-gray-100">
          {option.label}
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {option.description}
        </div>
      </div>

      {#if value === option.value}
        <div class="text-primary-500">
          <Icon name="check_circle" />
        </div>
      {/if}
    </label>
  {/each}
</fieldset>
