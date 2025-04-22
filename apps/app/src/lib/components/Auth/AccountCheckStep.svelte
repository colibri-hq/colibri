<script lang="ts">
  import { Button } from '@colibri-hq/ui';
  import { Field } from '@colibri-hq/ui';

  interface Props {
    loading?: boolean;
    email: string;
    action: string;

    [key: string]: unknown;
  }

  let {
    loading = false,
    email = $bindable(),
    action,
    ...rest
  }: Props = $props();
</script>

<form {...rest} {action} method="POST">
  <Field
    autocomplete="email webauthn"
    autofocus
    bind:value={email}
    class="max-w-lg"
    disabled={loading}
    label="Email Address"
    name="email"
    placeholder="jane@doe.com"
    required
    type="email"
  />

  <Button class="mt-8" disabled={loading} label="Continue" type="submit" />
</form>
