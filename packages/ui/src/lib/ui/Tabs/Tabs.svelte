<script lang="ts" generics="L extends Record<string, Snippet<[string]> | string>">
  import { Tabs } from 'bits-ui';
  import TabContent from './TabContent.svelte';
  import type { Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';

  type TabContentSnippets<T extends Record<string, unknown>> = {
    [K in keyof T as `${Extract<K, string>}Content`]: Snippet<[string]>;
  };

  type Props<T extends Record<string, Snippet<[string]> | string>> = TabContentSnippets<T> & {
    children?: Snippet;
    value?: keyof T;
    initialValue?: keyof T;
    class?: string;
    tabs: T;
    disabled?: boolean;
    noLoop?: boolean;
    onChange?: (value: keyof T) => unknown;
  }

  let {
    children,
    tabs,
    initialValue = '',
    value = $bindable(initialValue),
    class: className,
    disabled,
    onChange,
    noLoop,
    ...rest
  }: Props<L> = $props();

  const contentSnippets = $derived.by(() => Object.fromEntries(Object
    .entries(rest)
    .filter(([key]) => key.endsWith('Content') && key.substring(0, key.length - 7) in tabs)));
  const tabsProps = $derived.by(() => Object.fromEntries(Object
    .entries(rest)
    .filter(([key]) => !(key in contentSnippets)),
  ));

  const TabsRoot = Tabs.Root;
  const TabList = Tabs.List;
  const TabTrigger = Tabs.Trigger;
</script>

<TabsRoot
  bind:value={value as string}
  class={twMerge('flex flex-col gap-2', className)}
  onValueChange={onChange}
  {disabled}
  loop={!noLoop}
  {...tabsProps}
>
  <TabList
    class="flex justify-evenly items-center gap-1 bg-gray-100 p-1 mb-4 rounded-md dark:bg-gray-900 dark:ring dark:ring-gray-800 shadow-inner-sm dark:shadow-none">
    {#each Object.entries(tabs) as [key, label] (key)}
      <TabTrigger
        value={key.toString()}
        class="grow py-1 px-3 rounded-md aria-selected:bg-white aria-selected:shadow-xs aria-selected:cursor-default hover:bg-gray-200/50 dark:aria-selected:bg-gray-700 dark:hover:bg-gray-700/25 transition"
      >
        {#if typeof label === 'string'}
          <span>{label}</span>
        {:else}
          {@render label(key.toString())}
        {/if}
      </TabTrigger>
    {/each}
  </TabList>


  {#each Object.keys(tabs) as key (key)}
    <TabContent value={key.toString()}>
      {#if typeof contentSnippets[`${key}Content`] === 'function'}
        {@render (contentSnippets[`${key}Content`] as Snippet<[string]>)(key.toString())}
      {/if}
    </TabContent>
  {/each}

  {@render children?.()}
</TabsRoot>
