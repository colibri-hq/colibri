<script lang="ts">
  import { Button } from '@colibri-hq/ui';
  import { Field } from '@colibri-hq/ui';
  import { enhance } from '$app/forms';
  import type { ZodIssue } from 'zod';
  import { page } from '$app/stores';

  interface Props {
    email: string;
    issues: ZodIssue[];
    webauthnAvailable?: boolean;
  }

  let {
    email = $bindable(),
    issues = $bindable(),
    webauthnAvailable = false,
  }: Props = $props();

  let emailIssue = $derived(
    issues.find((issue) => issue.path[0] === 'email')?.message,
  );
  let webauthnIssue = $derived(
    issues.find((issue) => issue.path[0] === 'webauthn')?.message,
  );
  let previous = $derived($page.url.searchParams.get('previous') || '/');
</script>

<form action="?/request" method="POST" use:enhance>
  <!-- If the client does not forward the previous URL cookie, we'll include it as a fallback -->
  <input name="previous" type="hidden" value={previous} />

  <Field
    autocomplete="email webauthn"
    bind:value={email}
    class="max-w-lg"
    error={emailIssue}
    label="Email Address"
    name="email"
    placeholder="jane@doe.com"
    required
    type="email"
  />

  {#if webauthnAvailable && webauthnIssue}
    <span class="mt-4 text-red-500">{webauthnIssue}</span>
  {/if}

  <div class="flex items-center justify-end">
    <Button class="mt-8" label="Continue" type="submit" />
  </div>
</form>
