<script lang="ts">
  import Icon from '../Icon/Icon.svelte';
  import { type Snippet } from 'svelte';

  interface Props {
    class?: string;
    value: number;
    max?: number | `${number}`;
    disabled?: boolean;
    starClasses?: string;
    size?: 'small' | 'medium' | 'large';
    before?: Snippet;
    star?: Snippet<[unknown]>;
    after?: Snippet;
    onChange?: (value: number) => unknown;
  }

  let {
    class: className = '',
    value = $bindable(),
    max = 5,
    disabled = false,
    starClasses = '',
    size = 'medium',
    before,
    star,
    after,
    onChange,
  }: Props = $props();

  let projected = $state<number | undefined>(undefined);
  let buttonElements = $state<HTMLButtonElement[]>([]);

  function update(index: number) {
    return () => onChange?.(index + 1);
  }

  function project(index: number | undefined) {
    return () => (projected = index);
  }

  function handleKeydown(index: number) {
    return (event: KeyboardEvent) => {
      if (['Left', 'ArrowLeft', 'Down', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        projected = Math.max(index - 1, 1);

        if (buttonElements[index - 1]) {
          buttonElements[index - 1].focus();
        }
      } else if (['Right', 'ArrowRight', 'Up', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        projected = Math.min(index + 1, Number(max));

        if (buttonElements[index + 1]) {
          buttonElements[index + 1].focus();
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        update(index)();
      }
    };
  }

  let amount = $derived(Math.round(Math.min(Math.max(value, 1), Number(max))));
</script>

<div
  aria-label="Rate this item from 1 to {max} stars"
  aria-valuemax={Number(max)}
  aria-valuemin="1"
  aria-valuenow={value}
  class="flex items-center {className}"
  role="slider"
>
  {@render before?.()}

  <ul class="contents">
    {#each { length: Number(max) } as _, index (index)}
      {@const filled =
        typeof projected !== 'undefined'
          ? index <= projected
          : index <= amount - 1}

      <li class="contents">
        <button
          class="flex cursor-pointer items-center justify-center rounded-full outline-none
          focus-visible:ring {starClasses}"
          onmouseover={project(index)}
          onfocus={project(index)}
          onfocusin={project(index)}
          onmouseleave={project(undefined)}
          onfocusout={project(undefined)}
          onclick={update(index)}
          onkeydown={handleKeydown(index)}
          aria-label="Rate this {index + 1} star"
          tabindex="0"
          {disabled}
          bind:this={buttonElements[index]}
        >
          {#if star}{@render star({ value, index, filled })}{:else}
            <Icon
              name="star"
              class="leading-none {{
                'small': 'text-sm',
                'medium': 'text-lg',
                'large': 'text-3xl'
              }[size]}"
              fill={filled}
            />
          {/if}
        </button>
      </li>
    {/each}
  </ul>

  {@render after?.()}
</div>
