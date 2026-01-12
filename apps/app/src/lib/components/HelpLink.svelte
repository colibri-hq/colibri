<script lang="ts">
  import { Button } from '@colibri-hq/ui';
  import { Icon } from '@colibri-hq/ui';
  import { env } from '$env/dynamic/public';
  import type { Snippet } from 'svelte';

  interface Props {
    topic: string;
    label?: string;
    icon?: string;
    iconSnippet?: Snippet<[{ topic: string }]>;
    labelSnippet?: Snippet<[{ topic: string }]>;
    children?: Snippet;
    [key: string]: unknown;
  }

  const helpCenterUrl = env.PUBLIC_HELP_CENTER_BASE_URL.endsWith('/')
    ? env.PUBLIC_HELP_CENTER_BASE_URL
    : `${env.PUBLIC_HELP_CENTER_BASE_URL}/`;

  let {
    topic,
    label = 'Help',
    icon = 'help',
    iconSnippet,
    labelSnippet,
    children,
    ...rest
  }: Props = $props();

  let slug = $derived(topic.startsWith('/') ? topic.substring(1) : topic);
  let href = $derived(new URL(slug, helpCenterUrl).toString());
</script>

<Button {...rest} {href}>
  {#if children}
    {@render children()}
  {:else}
    {#if icon || iconSnippet}
      <Icon weight="700" class="pr-1 text-xl leading-none">
        {#if iconSnippet}
          {@render iconSnippet({ topic })}
        {:else}
          {icon}
        {/if}
      </Icon>
    {/if}
    <span>
      {#if labelSnippet}
        {@render labelSnippet({ topic })}
      {:else}
        {label}
      {/if}
    </span>
  {/if}
</Button>
