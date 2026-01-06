<script lang="ts">
  interface Props {
    name: string;
    id?: string | undefined;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    numeric?: boolean;
    autofocus?: boolean;

    onbackspace?: (event: { focusPrevious: boolean }) => void;
    oninput?: (value: string) => void;
    onpaste?: (value: string) => void;
    onclear?: () => void;
  }

  let {
    name,
    id = undefined,
    value = $bindable(''),
    placeholder = '·',
    disabled = false,
    numeric = false,
    autofocus = false,
    onbackspace,
    oninput,
    onpaste,
    onclear,
  }: Props = $props();

  let digit = $state<HTMLInputElement>();

  function handlePaste(event: Event) {
    event.preventDefault();

    // Get pasted data via clipboard API
    let clipboardData = (event as ClipboardEvent).clipboardData;
    let value = clipboardData
      ?.getData('Text')
      ?.toUpperCase()
      ?.replace(numeric ? /[^0-9]/g : /[^0-9A-Z]/g, '');

    if (!value) {
      return;
    }

    updateValue(value.slice(0, 1));
    onpaste?.(value);
  }

  function handleKey(event: KeyboardEvent) {
    // Clear all digits on CMD + Backspace
    if (event.metaKey && event.key === 'Backspace') {
      event.preventDefault();
      onclear?.();
      value = '';

      return;
    }

    // Do not interrupt keyboard combinations
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    // Delete the digit on backspace. If the digit is empty, focus the previous digit
    if (event.key === 'Backspace') {
      event.preventDefault();
      onbackspace?.({ focusPrevious: value === '' });
      value = '';

      return;
    }

    if (['Enter', 'Tab'].includes(event.key)) {
      return;
    }

    updateValue(event.key);
    event.preventDefault();
  }

  function updateValue(newValue: string) {
    if (!newValue.match(numeric ? /^[0-9]$/ : /^[0-9a-zA-Z]$/)) {
      return;
    }

    value = newValue.toUpperCase();
    oninput?.(value);
  }

  export function focus(selectDigit = false) {
    digit?.focus();

    if (selectDigit) {
      select();
    }
  }

  export function select() {
    digit?.select();
  }
</script>

<label class="digit" for={name}>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    {autofocus}
    bind:this={digit}
    class="h-12 w-10 rounded border-gray-200 bg-white px-0 py-2 text-center font-mono
     shadow-sm transition focus:placeholder-transparent disabled:bg-gray-100 dark:bg-black"
    {disabled}
    id={id ?? name}
    inputmode={numeric ? 'numeric' : 'text'}
    maxlength={1}
    {name}
    onkeydown={handleKey}
    onpaste={handlePaste}
    {placeholder}
    type="text"
    {value}
  />
</label>
