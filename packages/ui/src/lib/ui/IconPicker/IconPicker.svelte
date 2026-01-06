<script lang="ts" module>
  export type IconPickerInputEvent = { value: string };

  export const iconGroups: { name: string; icons: string[] }[] = [
    {
      name: 'Suggested',
      icons: ['home', 'star', 'favorite', 'bolt', 'swords', 'science', 'construction'],
    },
    {
      name: 'Sports & Activities',
      icons: [
        'school', 'campaign', 'construction', 'engineering', 'volunteer_activism',
        'science', 'sports_esports', 'cake', 'self_improvement', 'sports_soccer',
        'air', 'biotech', 'water', 'hiking', 'architecture', 'personal_injury',
        'sports_basketball', 'sports_tennis', 'nights_stay', 'sports_gymnastics',
        'backpack', 'surfing', 'piano', 'sports', 'toys', 'sports_volleyball',
        'sports_baseball', 'camping', 'downhill_skiing', 'kayaking', 'swords',
        'phishing', 'sports_football', 'skateboarding', 'sports_golf', 'sports_cricket',
        'roller_skating', 'scuba_diving', 'paragliding', 'snowboarding', 'sports_hockey',
        'ice_skating',
      ],
    },
    {
      name: 'Business',
      icons: [
        'shopping_cart', 'payments', 'shopping_bag', 'monitoring', 'storefront',
        'sell', 'account_balance', 'work', 'paid', 'savings', 'calculate',
        'account_tree', 'domain', 'precision_manufacturing', 'forklift',
        'front_loader', 'trolley', 'currency_rupee', 'euro', 'currency_ruble',
        'currency_yuan', 'currency_lira', 'currency_pound', 'currency_bitcoin',
        'pie_chart', 'barcode_scanner', 'copyright', 'conversion_path',
        'track_changes', 'tenancy', 'family_history', 'data_exploration',
        'bubble_chart', 'mediation',
      ],
    },
    {
      name: 'Food & Travel',
      icons: [
        'apartment', 'fitness_center', 'lunch_dining', 'spa', 'cottage',
        'local_cafe', 'hotel', 'family_restroom', 'beach_access', 'local_bar',
        'pool', 'luggage', 'casino', 'sports_bar', 'bakery_dining', 'ramen_dining',
        'nightlife', 'local_dining', 'icecream', 'dinner_dining', 'festival',
        'attractions', 'golf_course', 'smoking_rooms', 'brunch_dining',
        'houseboat', 'tapas', 'child_friendly',
      ],
    },
    {
      name: 'Transportation',
      icons: [
        'local_shipping', 'flight', 'directions_run', 'directions_bus',
        'directions_bike', 'directions_boat', 'train', 'two_wheeler',
        'agriculture', 'sailing', 'electric_car', 'commute', 'subway',
        'electric_scooter', 'airlines', 'u_turn_right', 'fork_left', 'snowmobile',
      ],
    },
    {
      name: 'Home',
      icons: [
        'laundry', 'tools_power_drill', 'ev_charger', 'home_storage',
        'nest_multi_room', 'nest_secure_alarm', 'light_group', 'self_care',
        'phone_iphone', 'save', 'smartphone', 'print', 'computer', 'devices',
        'desktop_windows', 'smart_display', 'dns', 'memory', 'headphones',
        'smart_toy', 'route', 'point_of_sale',
      ],
    },
    {
      name: 'People',
      icons: [
        'person', 'group', 'share', 'thumb_up', 'groups', 'public', 'handshake',
        'support_agent', 'face', 'sentiment_satisfied', 'rocket_launch',
        'workspace_premium', 'psychology', 'water_drop', 'emoji_objects',
        'diversity_3', 'eco', 'pets', 'travel_explore', 'mood', 'sunny', 'quiz',
        'health_and_safety', 'sentiment_dissatisfied', 'sentiment_very_satisfied',
        'military_tech', 'recycling', 'thumb_down', 'gavel', 'diamond',
        'monitor_heart', 'emoji_people', 'diversity_1', 'workspaces', 'vaccines',
        'compost', 'forest', 'waving_hand', 'group_work',
      ],
    },
    {
      name: 'Miscellaneous',
      icons: [
        'info', 'visibility', 'schedule', 'help', 'language', 'lock', 'warning',
        'error', 'visibility_off', 'verified', 'task_alt', 'history', 'event',
        'bookmark', 'calendar_today', 'tips_and_updates', 'question_mark',
        'fingerprint', 'lightbulb', 'category', 'update', 'lock_open',
        'priority_high', 'code', 'build', 'date_range', 'settings_suggest',
        'touch_app', 'stars', 'new_releases', 'account_box', 'celebration',
        'bug_report', 'push_pin', 'alarm', 'extension', 'hourglass_empty',
        'support', 'bookmarks', 'accessibility_new', 'pan_tool_alt',
        'supervised_user_circle', 'collections_bookmark', 'interests',
        'dangerous', 'all_inclusive', 'rule', 'change_history', 'priority',
        'build_circle', 'wysiwyg', 'pan_tool', 'circle_notifications',
        'hotel_class', 'api', 'manage_history', 'accessible', 'anchor',
      ],
    },
  ];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Picker } from '../Picker/index.js';
  import Field from '../Field/Field.svelte';
  import Icon from '../Icon/Icon.svelte';
  import { createMdiIconUrn, parseIconUrn, isMdiIcon } from '@colibri-hq/sdk/client';

  interface Props {
    open?: boolean;
    value?: string | undefined;
    trigger?: Snippet<[{ open: boolean; props: Record<string, unknown> }]>;
    onInput?: (event: IconPickerInputEvent) => void;
    mountTarget?: HTMLElement | null;
    [key: string]: unknown;
  }

  let {
    open = $bindable(false),
    value = $bindable(undefined),
    trigger,
    onInput,
    mountTarget,
    ...rest
  }: Props = $props();

  let filter = $state('');

  // Parse the current value to extract the MDI icon name for selection highlighting
  let parsedValue = $derived(parseIconUrn(value));
  let selectedIconName = $derived(isMdiIcon(parsedValue) ? parsedValue.value : null);

  let filterTerm = $derived(filter.toLowerCase().replace(/\s+/g, '_'));
  let filteredGroups = $derived(
    filterTerm
      ? iconGroups
        .map(({ name, icons }) => ({
          name,
          icons: name.toLowerCase().startsWith(filterTerm)
            ? icons
            : icons.filter((icon) => icon.includes(filterTerm)),
        }))
        .filter(({ icons }) => icons.length > 0)
      : iconGroups,
  );

  function selectIcon(iconName: string) {
    return () => {
      const urn = createMdiIconUrn(iconName);
      value = urn;
      open = false;
      filter = '';
      onInput?.({ value: urn });
    };
  }

  function onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      filter = '';
    }
  }
</script>

<Picker
  bind:open
  {trigger}
  {onOpenChange}
  {mountTarget}
  {...rest}
  class="max-h-80 w-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800
  dark:bg-black"
>
  <header class="p-2">
    <Field
      type="search"
      bind:value={filter}
      placeholder="Filter icons…"
      appendIcon="filter_list"
      autofocus
    />
  </header>

  <div class="gap-y-8">
    {#each filteredGroups as group (group.name)}
      <section>
        <header
          class="sticky top-0 mb-2 border-b border-gray-200 bg-white px-6 py-2 dark:border-gray-800
          dark:bg-black"
        >
          <h4 class="font-bold">{group.name}</h4>
        </header>

        <div class="grid grid-cols-6 px-2 pb-2">
          {#each group.icons as icon (icon)}
            <button
              class="cursor-pointer rounded-lg pb-1 pt-3 hover:bg-gray-200 dark:hover:bg-gray-900"
              class:text-blue-500={selectedIconName === icon}
              onclick={selectIcon(icon)}
            >
              <Icon name={icon} class="text-lg leading-none" fill />
            </button>
          {/each}
        </div>
      </section>
    {/each}

    {#if filteredGroups.length === 0}
      <section class="p-4">
        <span class="text-gray-500">
          No results found.
        </span>
      </section>
    {/if}
  </div>
</Picker>
