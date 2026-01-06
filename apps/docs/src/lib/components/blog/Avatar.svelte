<script lang="ts">
  import { UserIcon } from '@lucide/svelte';
  import { twMerge } from 'tailwind-merge';

  type Props = {
    src?: string | null;
    alt?: string;
    size?: 'xs' | 'small' | 'medium' | 'large';
    class?: string;
  };

  const { src, alt = '', size = 'medium', class: className }: Props = $props();

  const sizeClasses = {
    xs: 'size-5',
    small: 'size-6',
    medium: 'size-10',
    large: 'size-16',
  } as const;

  const iconSizeClasses = {
    xs: 'size-2.5',
    small: 'size-3',
    medium: 'size-5',
    large: 'size-8',
  } as const;
</script>

{#if src}
  <img
    {src}
    {alt}
    class={twMerge(
      'rounded-full bg-gray-100 dark:bg-gray-800',
      sizeClasses[size],
      className
    )}
    loading="lazy"
  />
{:else}
  <div
    class={twMerge(
      'rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center',
      sizeClasses[size],
      className
    )}
  >
    <UserIcon class={twMerge('text-gray-500 dark:text-gray-400', iconSizeClasses[size])} />
  </div>
{/if}
