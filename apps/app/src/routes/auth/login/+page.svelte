<script lang="ts">
  import { onMount } from 'svelte';
  import { ceremony } from './webauthn';
  import type { ActionData, PageData } from './$types';
  import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
  import EmailForm from './EmailForm.svelte';
  import PasscodeForm from './PasscodeForm.svelte';
  import type { ZodIssue } from 'zod';
  import PageHeader from '$lib/components/Page/PageHeader.svelte';

  interface Props {
    data: PageData;
    form: ActionData;
  }

  let { form }: Props = $props();

  let issues = $state<ZodIssue[]>(form?.issues ?? []);
  let webauthnAvailable = $state(true);
  let email = $state(form?.email ?? '');
  $effect(() => {
    email = form?.email ?? email;
  });

  async function webauthn() {
    if (!browserSupportsWebAuthn()) {
      webauthnAvailable = false;

      return;
    }

    try {
      await ceremony(fetch);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      webauthnAvailable = false;
      issues.push({
        code: 'custom',
        path: ['webauthn'],
        message: error.message,
      });
    }
  }

  onMount(webauthn);
</script>

<article
  class="mx-auto max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl shadow-gray-500/5"
>
  <PageHeader title="Sign in" />

  {#if form?.sent}
    <PasscodeForm bind:email bind:issues />
  {:else}
    <EmailForm bind:email bind:issues {webauthnAvailable} />
  {/if}
</article>
