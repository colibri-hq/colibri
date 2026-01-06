<script lang="ts">
  import { Switch } from 'bits-ui';
  import { twMerge } from 'tailwind-merge';

  interface Props {
    /**
     * Whether the toggle is checked.
     */
    checked?: boolean;

    /**
     * Additional class names for the toggle container.
     */
    class?: string;

    /**
     * Whether the toggle is disabled.
     */
    disabled?: boolean;

    /**
     * The name attribute for form submission.
     */
    name?: string;

    /**
     * The value attribute for form submission.
     */
    value?: string;

    /**
     * Size variant of the toggle.
     * @default 'medium'
     */
    size?: 'small' | 'medium' | 'large';

    /**
     * Called when the toggle state changes.
     */
    onCheckedChange?: (checked: boolean) => void;
  }

  let {
    checked = $bindable(false),
    class: className = '',
    disabled = false,
    name,
    value,
    size = 'medium',
    onCheckedChange,
  }: Props = $props();

  const sizeClasses = {
    small: {
      root: 'h-5 w-9',
      thumb: 'h-4 w-4',
      translate: 'data-[state=checked]:translate-x-4',
    },
    medium: {
      root: 'h-7 w-12',
      thumb: 'h-6 w-6',
      translate: 'data-[state=checked]:translate-x-5',
    },
    large: {
      root: 'h-9 w-16',
      thumb: 'h-8 w-8',
      translate: 'data-[state=checked]:translate-x-7',
    },
  };

  const rootClasses = $derived(
    twMerge(
      'inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
      'shadow-inner transition-colors duration-200 ease-in-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200',
      'dark:data-[state=checked]:bg-blue-600 dark:data-[state=unchecked]:bg-gray-700',
      sizeClasses[size].root,
      className,
    ),
  );

  const thumbClasses = $derived(
    twMerge(
      'pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out',
      'dark:bg-gray-950',
      sizeClasses[size].thumb,
      sizeClasses[size].translate,
    ),
  );
</script>

<Switch.Root
  bind:checked
  class={rootClasses}
  {disabled}
  {name}
  {onCheckedChange}
  {value}
>
  <Switch.Thumb class={thumbClasses} />
</Switch.Root>
