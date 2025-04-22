<script lang="ts">
  import { Field } from '@colibri-hq/ui';
  import TextareaInput from '$lib/components/Form/TextareaInput.svelte';

  interface Props {
    class?: string;
    value: string | undefined;
    label?: string | undefined;
    name: string;

    [key: string]: any;
  }

  let {
    class: className = '',
    value = $bindable(),
    label = undefined,
    name,
    ...rest
  }: Props = $props();
</script>

<Field {...rest} class="relative {className}" {label}>
  {#snippet control({ id: id, disabled: disabled })}
    <TextareaInput {id} {name} disabled={disabled || undefined} bind:value />
  {/snippet}
</Field>
