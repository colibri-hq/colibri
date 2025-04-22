<script lang="ts">
  import { Tabs } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    tabs: (Snippet<[string]> | string)[];
    content?: Snippet<[string]>[];
  }

  const {
    children,
    tabs,
    content,
  }: Props = $props();

  const TabsRoot = Tabs.Root;
  const TabList = Tabs.List;
  const Tab = Tabs.Trigger;
</script>

<TabsRoot>
  <TabList>
    {#each tabs as tab, index (index)}
      <Tab value={index.toString()}>
        {#if typeof tab === 'string'}
          <span>{tab}</span>
        {:else}
          {@render tab(index.toString())}
        {/if}
      </Tab>
    {/each}
  </TabList>

  {#each (content ?? []) as item, index (index)}
    <Tabs.Content value={index.toString()}>
      {@render item(index.toString())}
    </Tabs.Content>
  {/each}

  {@render children()}
</TabsRoot>
