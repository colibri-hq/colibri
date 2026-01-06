<script lang="ts">
  import Icon from '../Icon/Icon.svelte';
  import type { FormEventHandler, HTMLInputAttributes } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';
  import type { Snippet } from 'svelte';

  interface ControlProps {
    /**
     * The type of the field. Defaults to 'text'.
     */
    type?: HTMLInputAttributes['type'];

    /**
     * The name of the field. Used for form submission.
     */
    name?: HTMLInputAttributes['name'];

    /**
     * The placeholder text for the field. Displayed when the field is empty.
     */
    placeholder?: HTMLInputAttributes['placeholder'];

    /**
     * The autocomplete attribute for the field. Used for browser autocomplete suggestions.
     */
    autocomplete?: HTMLInputAttributes['autocomplete'];

    /**
     * Whether the field is disabled. When true, the field is not interactive and cannot be focused.
     */
    disabled?: HTMLInputAttributes['disabled'];

    /**
     * Whether the field is read-only. When true, the field cannot be edited, but can be focused.
     */
    readonly?: HTMLInputAttributes['readonly'];

    /**
     * Whether the field is required. When true, the field must be filled out before submission.
     */
    required?: HTMLInputAttributes['required'];

    /**
     * Whether the field should be focused automatically when the page loads.
     * When true, the field receives focus as soon as it is rendered.
     *
     * Note: Using the `autofocus` attribute is not recommended for accessibility reasons. It can be disruptive for
     * users who rely on assistive technologies or keyboard navigation.
     */
    autofocus?: HTMLInputAttributes['autofocus'];

    /**
     * The step attribute for the field. Used for numeric input types to specify the granularity of the input.
     */
    step?: HTMLInputAttributes['step'];

    /**
     * The maximum value for the field. Used for numeric input types to specify the upper limit of the input.
     */
    max?: HTMLInputAttributes['max'];

    /**
     * The maximum length of the input value. Used to limit the number of characters that can be entered in the field.
     */
    maxlength?: HTMLInputAttributes['maxlength'];

    /**
     * The minimum value for the field. Used for numeric input types to specify the lower limit of the input.
     */
    min?: HTMLInputAttributes['min'];

    /**
     * The minimum length of the input value. Used to enforce a minimum number of characters that must be entered in
     * the field.
     */
    minlength?: HTMLInputAttributes['minlength'];

    /**
     * The size of the field. Used to specify the width of the field in characters.
     */
    size?: HTMLInputAttributes['size'];

    /**
     * The pattern attribute for the field. Used to specify a regular expression that the input value must match.
     */
    pattern?: HTMLInputAttributes['pattern'];

    /**
     * The inputmode attribute for the field. Used to specify the type of keyboard to display on mobile devices.
     */
    inputmode?: HTMLInputAttributes['inputmode'];

    // Event handlers
    onSubmit?: () => unknown;
    onPaste?: (event: ClipboardEvent) => unknown;
    onKeydown?: (event: KeyboardEvent) => unknown;
    onKeyup?: (event: KeyboardEvent) => unknown;
    onInput?: FormEventHandler<HTMLInputElement>;
    onChange?: (event: Event) => unknown;
    onFocus?: (event: FocusEvent) => unknown;
    onBlur?: (event: FocusEvent) => unknown;
  }

  interface Props extends ControlProps {
    // region Field Props

    /**
     * Additional class names for the field.
     */
    class?: string;
    value?: string;

    /**
     * Content of the field label. Accepts a string for the plain label content or a Snippet for custom label rendering.
     */
    label?: string | Snippet;

    /**
     * Override label text.
     */
    labelText?: Snippet;

    /**
     * Optional snippet to append to the label.
     */
    appendLabel?: Snippet;

    /**
     * Optional hint text to display below the field. Accepted as a string or a Snippet.
     */
    hint?: string | Snippet;

    /**
     * Optional error message to display below the field. Accepted as a string or a Snippet.
     */
    error?: string | Snippet;

    /**
     * Optional snippet to display additional messages. If `messages` is provided, it needs to handle the rendering of
     * error and hint messages.
     */
    messages?: Snippet<[{
      attributes: Record<string, string>;
      errorAttributes: Record<string, string>;
      hintAttributes: Record<string, string>;
      error: string | Snippet | undefined;
      hint: string | Snippet | undefined;
    }]>;
    /**
     * Optional snippet to display before the field content.
     */
    prepend?: Snippet;

    /**
     * Optional icon to display before the field content. Can be a string representing the icon name or a Snippet for
     * custom rendering.
     */
    prependIcon?: string | Snippet;

    /**
     * Optional snippet to display after the field content. Can be a string representing the icon name or a Snippet for
     * custom rendering.
     */
    appendIcon?: string | Snippet;

    /**
     * Optional snippet to display after the field control.
     */
    children?: Snippet<[string]>;

    /**
     * Snippet to override the default field control. It receives the field props  and the current value as arguments.
     */
    control?: Snippet<[ControlProps & {
      value: string;
      id: string;
    }]>;

    /**
     * Optional snippet to display after the field content.
     */
    postfix?: Snippet;
    // endregion

    [key: string]: unknown;
  }

  let {
    value = $bindable(''),
    class: className = '',
    label,
    labelText,
    appendLabel,
    messages,
    hint,
    error,
    prepend,
    prependIcon,
    appendIcon,
    children,
    control,
    postfix,
    type = 'text',
    name,
    placeholder,
    autocomplete,
    disabled = false,
    readonly = false,
    required = false,
    autofocus = false,
    step,
    max,
    maxlength,
    min,
    minlength,
    size,
    pattern,
    inputmode,

    onSubmit,
    onPaste,
    onKeydown,
    onKeyup,
    onInput,
    onChange,
    onFocus,
    onBlur,

    ...rest
  }: Props = $props();
  const id = $props.id();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      onSubmit?.();
    }

    onKeydown?.(event);
  }

  const classList = $derived(twMerge(
    'relative flex items-center flex-wrap ring-1 ring-gray-200 dark:ring-gray-700 rounded-md ' +
    'mb-2 bg-white dark:bg-black transition shadow focus:outline-none focus-within:ring-2 ' +
    'focus-within:ring-blue-500 focus-within:shadow-blue-500/10 focus-within:shadow-lg ' +
    'dark:focus-within:ring-blue-700 dark:text-gray-300 selection:bg-blue-500 select-none ' +
    'selection:text-white dark:selection:text-gray-300 aria-disabled:bg-gray-50 ' +
    'aria-disabled:shadow-none has-[[readonly]]:bg-gray-100 has-[[readonly]]:dark:bg-gray-800 ' +
    'has-[[readonly]]:pointer-events-none has-[[data-form-field="messages"]]:mb-7 group',
    error ? 'ring-red-500 dark:ring-red-400' : '',
    className,
  ));
</script>

<label
  aria-disabled={disabled || readonly}
  class={classList}
  inert={readonly}
  {...rest}
  data-form-field
  for={id}
>
  {#if prepend}
    {@render prepend()}
  {/if}

  {#if prependIcon}
    <span
      class="order-2 hidden h-6 select-none pl-2 leading-none
      text-gray-500 transition group-focus-within:text-blue-500 md:inline"
      data-form-field="prepend-icon"
    >
      {#if typeof prependIcon === 'string'}
        <Icon name={prependIcon} />
      {:else}
        {@render prependIcon()}
      {/if}
    </span>
  {/if}

  <span class="peer/control order-3 flex flex-auto" data-form-field="control">
    {#if control}
      {@render control({
        ...rest,
        autocomplete,
        autofocus,
        disabled,
        id,
        inputmode,
        max,
        maxlength,
        min,
        minlength,
        name,
        onBlur,
        onChange,
        onFocus,
        onInput,
        onKeydown,
        onKeyup,
        onPaste,
        onSubmit,
        pattern,
        placeholder,
        readonly,
        required,
        size,
        step,
        type,
        value,
      })}
    {:else}

      <!-- See https://stackoverflow.com/questions/57392773/75298645#75298645 -->
      <!-- svelte-ignore a11y_autofocus -->
      <input
        {...{ type }}
        {autocomplete}
        {autofocus}
        bind:value
        class="min-w-0 grow rounded-md border-none bg-transparent px-2 pb-1 pt-1 outline-none ring-0
        focus-visible:ring-0"
        {disabled}
        {id}
        {inputmode}
        {max}
        {maxlength}
        {min}
        {minlength}
        {name}
        onkeydown={handleKeydown}
        onkeyup={onKeyup}
        onpaste={onPaste}
        onsubmit={onSubmit}
        oninput={onInput}
        onchange={onChange}
        onfocus={onFocus}
        onblur={onBlur}
        {pattern}
        {placeholder}
        {readonly}
        {required}
        {size}
        {step}
        tabindex={disabled || readonly ? -1 : 0}
      />
    {/if}
  </span>

  {#if typeof label === 'string'}
    <span
      class="order-1 flex w-full shrink-0 select-none items-center justify-between px-2 text-sm text-gray-500
      transition group-focus-within:text-blue-500  peer-data-[form-field=control]/control:mt-1"
      data-form-field="label"
    >
      {#if labelText}
        {@render labelText()}
      {:else}
        <span class="inline-flex gap-px items-baseline">
          {label}
          {#if required}
            <span class="text-red-500 group-focus-within:text-blue-500">*</span>
          {/if}
        </span>
      {/if}

      {#if appendLabel}
        {@render appendLabel()}
      {/if}
    </span>
  {:else if !!label}
    {@render label()}
  {/if}

  {#if appendIcon}
    <span
      class="order-4 hidden h-6 select-none px-2 leading-none text-gray-500 transition
      group-focus-within:text-blue-500 md:inline"
      data-form-field="append-icon"
    >

      {#if typeof appendIcon === 'string'}
        <Icon name={appendIcon} />
      {:else}
        {@render appendIcon()}
      {/if}
    </span>
  {/if}

  {#if children}
    {@render children(value)}
  {/if}

  {#if postfix}
    <div class="order-5 p-1" data-form-field="postfix">
      {@render postfix()}
    </div>
  {/if}

  {#if messages}
    {@render messages({
      attributes: { 'data-form-field': 'messages' },
      errorAttributes: { 'data-form-field-message': 'error' },
      hintAttributes: { 'data-form-field-message': 'hint' },
      hint,
      error,
    })}
  {:else if hint || error}
    <span
      class="absolute -bottom-6 left-0 w-full shrink-0 select-none overflow-hidden text-ellipsis whitespace-nowrap px-2
        text-xs text-gray-500"
      data-form-field="messages"
    >
      {#if typeof error === 'string'}
        <span data-form-field-message="error" class="text-red-700">{error}</span>
      {:else if !!error}
        {@render error()}
      {:else if typeof hint === 'string'}
        <span data-form-field-message="hint">{hint}</span>
      {:else if !!hint}
        {@render hint()}
      {/if}
    </span>
  {/if}
</label>
