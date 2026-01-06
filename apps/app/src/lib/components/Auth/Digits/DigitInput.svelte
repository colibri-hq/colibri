<script lang="ts">
  import Digit from '$lib/components/Auth/Digits/Digit.svelte';
  import { type Snippet, tick } from 'svelte';
  import { twMerge } from 'tailwind-merge';

  interface DigitData {
    value: string;
    placeholder: string;
    ref: Digit | null;
  }

  type Props = {
    amount?: number;
    autofocus?: boolean;
    class?: string;
    control?: Snippet<[string]>;
    disabled?: boolean;
    emitEventOnPrefill?: boolean;
    error?: string | undefined;
    initialValue?: string;
    name?: string;
    numeric?: boolean;
    oninput?: ((value: string) => unknown) | undefined;
    placeholder?: string;
    separator?: Snippet | string | true | undefined;
    value?: string;
  };

  let {
    amount = 6,
    autofocus = false,
    class: classList = '',
    control,
    disabled = false,
    emitEventOnPrefill = false,
    error,
    initialValue = '',
    name = 'code',
    numeric = false,
    oninput,
    placeholder = '◦',
    separator,
    value = $bindable(''),
  }: Props = $props();

  const className = $derived(() => twMerge('flex flex-col', classList));

  // region Value Handling
  let digits: DigitData[] = $state(resetDigits(''));
  let internalValue = $derived(assembleValue(digits));

  $effect(() => void tick().then(() => prefill(initialValue)));

  // endregion

  function resetDigits(value: string) {
    return Array.from(Array(amount).keys()).map((index) => ({
      value: value[index] || '',
      placeholder: placeholder.length > 1 ? (placeholder[index] ?? placeholder) : placeholder,
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
      oninput?.(value);
    }

    const lastDigit = digits[amount - 1];
    if (lastDigit) focusDigit(lastDigit);
  }

  // region Text Input Event Handling

  function handleChange(index: number) {
    return async function handleChange() {
      let nextIndex;

      nextIndex = index < digits.length - 1 ? index + 1 : index;

      await tick();

      const nextDigit = digits[nextIndex];
      if (nextDigit) focusDigit(nextDigit);
      update();
    };
  }

  function handleBackspace(index: number) {
    return async function handleBackspace({ focusPrevious }: { focusPrevious: boolean }) {
      const focusIndex = focusPrevious ? (index > 0 ? index - 1 : 0) : index;

      await tick();

      const targetDigit = digits[focusIndex];
      if (targetDigit) focusDigit(targetDigit, focusPrevious);
      update();
    };
  }

  async function handlePaste(pastedValue: string) {
    // Take one character from the pasted value
    pastedValue = pastedValue.slice(0, amount);

    digits = resetDigits(pastedValue);

    await tick();

    // Focus the last digit after pasting
    const targetDigit = digits[Math.min(value.length, amount - 1)];
    if (targetDigit) focusDigit(targetDigit);
    update();
  }

  async function handleClear() {
    digits = resetDigits('');

    await tick();

    const firstDigit = digits[0];
    if (firstDigit) focusDigit(firstDigit);
    update();
  }

  function focusDigit(digit: DigitData, select = false) {
    digit.ref?.focus(select);
  }

  function update() {
    value = internalValue ?? '';

    if (value) {
      oninput?.(value);
    }
  }

  // endregion
</script>

<section class={className}>
  <div class="relative flex flex-col pb-6">
    <ol class="flex items-center justify-between space-x-2">
      {#each digits as digit, index (index)}
        {#if index === Math.floor(amount / 2)}
          <li class="contents select-none">
            {#if typeof separator === 'undefined' || separator === true}
              <span class="opacity-25">&mdash;</span>
            {:else if typeof separator === 'string'}
              <span class="opacity-25">{separator}</span>
            {:else}
              {@render separator()}
            {/if}
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
            onbackspace={handleBackspace(index)}
            oninput={handleChange(index)}
            onpaste={handlePaste}
            onclear={handleClear}
          />
        </li>
      {/each}
    </ol>

    {#if error}
      <span
        class="absolute -bottom-0 left-0 w-full max-w-full overflow-hidden text-sm overflow-ellipsis
        whitespace-nowrap text-red-600"
      >
        {error}
      </span>
    {/if}
  </div>

  {#if value}
    {#if !!control}
      {@render control(value)}
    {:else}
      <input type="hidden" {value} {name} />
    {/if}
  {/if}
</section>
