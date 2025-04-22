<script lang="ts" module>
  export type ToggleEvent = CustomEvent<boolean>;
</script>

<script lang="ts">
  import { run } from 'svelte/legacy';

  import { createSwitch } from 'svelte-headlessui';
  import { twMerge } from 'tailwind-merge';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    change: ToggleEvent['detail'];
  }>();

  interface Props {
    class?: string;
    id?: string | undefined;
    value?: boolean;
    disabled?: boolean | null | undefined;
    size?: 'small' | 'medium' | 'large';

    [key: string]: any;
  }

  let {
    class: className = '',
    id = undefined,
    value = $bindable(true),
    disabled = false,
    size = 'medium',
    ...rest
  }: Props = $props();

  const Switch = createSwitch({ label: 'Set Preference', checked: value });

  let toggleClasses = $derived(
    twMerge(
      {
        small: 'h-5 w-9',
        medium: 'h-8 w-14',
        large: 'h-10 w-20',
      }[size],
      'disabled:bg-gray-300 dark:disabled:bg-gray-600',
      $Switch.checked
        ? 'bg-blue-500 ring-blue-700/50 read-only:bg-blue-300 dark:read-only:bg-blue-600'
        : 'bg-gray-200 dark:bg-gray-700 ring-blue-500/75',
    ),
  );
  let knobClasses = $derived(
    twMerge(
      $Switch.checked
        ? 'ring-blue-600 dark:ring-blue-400'
        : 'ring-blue-500 dark:ring-blue-600',
      {
        small: 'h-4 w-4 shadow',
        medium: 'h-7 w-7 shadow-md',
        large: 'w-9 h-9 shadow-lg',
      }[size],
      $Switch.checked
        ? {
            small: 'translate-x-4',
            medium: 'translate-x-6',
            large: 'translate-x-10',
          }[size]
        : {
            small: 'translate-x-0',
            medium: 'translate-x-0',
            large: 'translate-x-0',
          }[size],
    ),
  );

  run(() => {
    Switch.set({ checked: value });
  });
  Switch.subscribe(({ checked }) => {
    dispatch('change', checked);
    value = checked;
  });

  function handleKeydown(event: KeyboardEvent) {
    if (['Left', 'ArrowLeft', 'Down', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      Switch.set({ checked: false });
    } else if (['Right', 'ArrowRight', 'Up', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      Switch.set({ checked: true });
    }
  }
</script>

<div {...rest} class="flex flex-col items-center justify-center {className}">
  <button
    class="group relative inline-flex shrink-0 cursor-pointer rounded-full
    border-transparent shadow-inner outline-none transition duration-200 ease-in-out focus-visible:ring
    disabled:cursor-default {toggleClasses}"
    {disabled}
    {id}
    onkeydown={handleKeydown}
    use:Switch.toggle
  >
    <span class="sr-only">Use setting</span>
    <span
      aria-hidden="true"
      class="pointer-events-none m-0.5 inline-block transform rounded-full
      bg-white transition duration-200 ease-in-out group-focus-visible:ring-6 dark:bg-gray-950 {knobClasses}"
    ></span>
  </button>
</div>
