<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script lang="ts">
  import { Button } from '@colibri-hq/ui';
  import { Icon } from '@colibri-hq/ui';
  import { env } from '$env/dynamic/public';

  const helpCenterUrl = env.PUBLIC_HELP_CENTER_BASE_URL.endsWith('/')
    ? env.PUBLIC_HELP_CENTER_BASE_URL
    : `${env.PUBLIC_HELP_CENTER_BASE_URL}/`;
  export let topic: string;
  export let label = 'Help';
  export let icon = 'help';
  $: slug = topic.startsWith('/') ? topic.substring(1) : topic;
  $: href = new URL(slug, helpCenterUrl).toString();
</script>

<Button {...$$restProps} {href}>
  <slot>
    {#if icon || $$slots.icon}
      <Icon weight="700" class="pr-1 text-xl leading-none">
        <slot {topic} name="icon">{icon}</slot>
      </Icon>
    {/if}
    <span>
      <slot name="label" {topic}>{label}</slot>
    </span>
  </slot>
</Button>
