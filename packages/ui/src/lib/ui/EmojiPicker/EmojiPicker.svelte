<script lang="ts" module>
  export type EmojiPickerInputEvent = { emoji: string };

  const storageKey = 'colibri.emoji.recent';
</script>

<script lang="ts">
  import Field from '../Field/Field.svelte';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import CategoryNavigation from './CategoryNavigation.svelte';
  import { emoji, emoji as items, type GroupName } from './emoji.js';
  import { onDestroy, type Snippet } from 'svelte';
  import { BROWSER } from 'esm-env';
  import { Popover } from 'bits-ui';

  interface Props {
    open?: boolean;
    trigger?: Snippet<[{ open: boolean }]>;
    class?: string;
    onInput?: (event: EmojiPickerInputEvent) => unknown;
  }

  let { open = $bindable(false), onInput, trigger, class: className }: Props = $props();
  let activeGroup = $state<GroupName>('recent');
  const groups = {
    recent: 'schedule',
    people: 'person',
    nature: 'eco',
    food: 'lunch_dining',
    activity: 'sports_basketball',
    travel: 'flight',
    objects: 'lightbulb',
    symbols: 'favorite',
    flags: 'flag',
  } satisfies Record<GroupName, string>;
  const activeGroupEmoji = $derived.by(
    () => activeGroup === 'recent' ? store : items[activeGroup],
  );

  // region Recently used emojis
  const initialValue = BROWSER
    ? deserialize(localStorage.getItem(storageKey) ?? '')
    : emoji.recent;

  if (initialValue.length === 0) {
    initialValue.push(...emoji.recent);
  }

  // Recently used emojis are stored in local storage, on-device. The store
  // transparently encodes the array of strings into a single string, using a
  // null byte as the separator character.
  let store = $state(initialValue);

  export function addRecentlyUsedEmoji(emoji: string) {
    store = Array.from(new Set([emoji, ...store])).slice(0, 20);
  }

  if (BROWSER) {
    $effect(() => localStorage.setItem(storageKey, serialize(store)));

    function syncStorage(event: StorageEvent) {
      if (event.key === storageKey) {
        store = deserialize(event.newValue ?? '');
      }
    }

    // By listening to the storage event, we can keep the store in sync with
    // other tabs. This way, the recent emojis are shared in real-time across
    // all open tabs.
    window.addEventListener('storage', syncStorage);

    // Cleanup the event listener and effect when the component is destroyed.
    onDestroy(() => window.removeEventListener('storage', syncStorage));
  }

  function serialize(value: string[]) {
    return value.join('\0');
  }

  function deserialize(value: string) {
    return value.split('\0').filter(Boolean);
  }

  // endregion

  function close() {
    open = false;
  }

  function pick(emoji: string) {
    return () => {
      onInput?.({ emoji });
      addRecentlyUsedEmoji(emoji);
      close();
    };
  }
</script>

<Popover.Root bind:open={open}>
  {#if trigger}
    <Popover.Trigger>
      {@render trigger({ open })}
    </Popover.Trigger>
  {/if}

  <Popover.Content>
    <article
      transition:slide={{ duration: 125, easing: quintOut }}
      class="absolute left-0 top-full z-40 -ml-4 mt-2 w-96 rounded-3xl bg-white/75 {className}
      shadow-xl backdrop-blur-3xl backdrop-saturate-200 dark:bg-black dark:ring dark:ring-gray-800 dark:ring-opacity-50"
    >
      <header class="px-4 pt-2">
        <CategoryNavigation {groups} bind:active={activeGroup} />
        <Field placeholder="Search" />
      </header>

      <div class="relative h-48 overflow-y-auto px-4 pt-2 select-none">
        <ul class="grid grid-cols-8 gap-1">
          {#each activeGroupEmoji as emoji (emoji)}
            <li class="contents">
              <button
                class="focus-visible:ring-primary-500 flex h-10 w-10 items-center justify-center rounded-lg
                outline-none transition hover:bg-gray-100 focus-visible:bg-blue-50 cursor-pointer
                focus-visible:shadow focus-visible:ring dark:hover:bg-gray-800 dark:focus-visible:bg-blue-950/75"
                onclick={pick(emoji)}
              >
                <span class="text-2xl">{emoji}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </article>
  </Popover.Content>
</Popover.Root>
