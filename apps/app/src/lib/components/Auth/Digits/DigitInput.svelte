<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script context="module" lang="ts">
  import Digit from '$lib/components/Auth/Digits/Digit.svelte';

  export interface DigitsChange {
    value: string | undefined;
  }

  export type DigitsChangeEvent = CustomEvent<DigitsChange>;

  interface DigitData {
    value: string;
    placeholder: string;
    ref: Digit | null;
  }
</script>

<script lang="ts">
  import type { BackspaceEvent, PasteEvent } from './Digit.svelte';
  import { createEventDispatcher, tick } from 'svelte';
  import { twMerge } from 'tailwind-merge';

  // region CSS Classes
  const classList = '';
  export { classList as class };
  const className = twMerge('flex flex-col', classList);
  // endregion

  // region Props
  export let value = '';
  export let amount: number = 6;
  export let initialValue: string = '';
  export let name: string = 'code';
  export let placeholder: string = '◦';
  export let emitEventOnPrefill: boolean = false;
  export let disabled: boolean = false;
  export let autofocus: boolean = false;
  export let numeric: boolean = false;
  export let separator: string | true | undefined = undefined;
  export let error: string | undefined = undefined;
  // endregion

  // region Value Handling
  let digits: DigitData[] = resetDigits('');
  $: internalValue = assembleValue(digits);
  $: tick().then(() => prefill(initialValue));

  // endregion

  function resetDigits(value: string) {
    return Array.from(Array(amount).keys()).map((index) => ({
      value: value[index] || '',
      placeholder: placeholder.length > 1 ? placeholder[index] : placeholder,
      ref: null,
    }));
  }

  function assembleValue(digits: DigitData[]) {
    const value = digits.reduce((digits, { value }) => digits + value, '');

    if (value.length < amount) {
      return undefined;
    }

    return value;
  }

  async function prefill(initial: string) {
    if (initial.trim().length === 0) {
      return;
    }

    digits = resetDigits(initial);

    await tick();

    value = internalValue ?? '';

    if (emitEventOnPrefill) {
      dispatch('input', { value });
    }

    focusDigit(digits[amount - 1]);
  }

  // region Text Input Event Handling
  const dispatch = createEventDispatcher<{ input: DigitsChange }>();

  function handleChange(index: number) {
    return async function handleChange() {
      let nextIndex;

      nextIndex = index < digits.length - 1 ? index + 1 : index;

      await tick();

      focusDigit(digits[nextIndex]);
      update();
    };
  }

  function handleBackspace(index: number) {
    return async function handleBackspace({
      detail: { focusPrevious },
    }: BackspaceEvent) {
      const focusIndex = focusPrevious ? (index > 0 ? index - 1 : 0) : index;

      await tick();

      focusDigit(digits[focusIndex], focusPrevious);
      update();
    };
  }

  async function handlePaste(event: PasteEvent) {
    let { value: pastedValue } = event.detail;

    // Take one character from the pasted value
    pastedValue = pastedValue.slice(0, amount);

    digits = resetDigits(pastedValue);

    await tick();

    // Focus the last digit after pasting
    focusDigit(digits[Math.min(value.length, amount - 1)]);
    update();
  }

  async function handleClear() {
    digits = resetDigits('');

    await tick();

    focusDigit(digits[0]);
    update();
  }

  function focusDigit(digit: DigitData, select = false) {
    digit.ref?.focus(select);
  }

  function update() {
    value = internalValue ?? '';

    if (value) {
      dispatch('input', { value });
    }
  }

  // endregion
</script>

<section {...$$restProps} class={className}>
  <div class="relative flex flex-col pb-6">
    <ol class="flex items-center justify-between space-x-2">
      {#each digits as digit, index}
        {#if separator && index === Math.floor(amount / 2)}
          <li class="contents select-none">
            <slot name="separator">
              <span class="opacity-25">
                {#if typeof separator === 'string'}
                  {separator}
                {:else}
                  &mdash;
                {/if}
              </span>
            </slot>
          </li>
        {/if}

        <li class="contents">
          <Digit
            name="{name}-digit-{index}"
            placeholder={digit.placeholder}
            {disabled}
            {numeric}
            autofocus={autofocus && index === 0}
            bind:value={digit.value}
            bind:this={digit.ref}
            on:backspace={handleBackspace(index)}
            on:input={handleChange(index)}
            on:paste={handlePaste}
            on:clear={handleClear}
          />
        </li>
      {/each}
    </ol>

    {#if error}
      <span
        class="absolute -bottom-0 left-0 w-full max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap
        text-sm text-red-600"
      >
        {error}
      </span>
    {/if}
  </div>

  {#if value}
    <slot name="input" {value}>
      <input type="hidden" {value} {name} />
    </slot>
  {/if}
</section>
