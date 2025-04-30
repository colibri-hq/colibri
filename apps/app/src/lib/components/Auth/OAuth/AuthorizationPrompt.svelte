<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button, Icon } from '@colibri-hq/ui';

  interface Props {
    clientName: string;
    scopes: {
      id: string;
      description: string | null;
    }[];
    children?: import('svelte').Snippet;
  }

  let { clientName, scopes, children }: Props = $props();
</script>

<article>
  <header class="text-gray-700 dark:text-gray-400">
    <h3><strong>{clientName}</strong> is requesting access to your account.</h3>
    <p>This will allow <strong>{clientName}</strong> to:</p>
  </header>

  <form method="post" use:enhance>
    {@render children?.()}

    <ul class="mt-2 flex flex-col">
      {#each scopes as scope, index (index)}
        <li class="flex items-center justify-between">
          <strong class="text-sm">{scope.description ?? ''}</strong>

          <Button
            icon
            variant="subtle"
            class="ml-2"
            target="_blank"
            href="/help/oauth/scopes/#scope-{scope.id}"
          >
            <Icon name="info" class="leading-none" />
          </Button>
          <!-- TODO: Depending on the client, we may let the user choose the scopes here -->
          <!--<ToggleField-->
          <!--  class="mb-0 grow font-semibold"-->
          <!--  name="scopes[]"-->
          <!--  label={scope.description ?? ''}-->
          <!--  readonly-->
          <!--  value-->
          <!--/>-->
        </li>
      {/each}
    </ul>

    <div class="mt-4 flex items-center justify-end">
      <Button class="order-2" formaction="?/grantConsent" type="submit">
        Allow
      </Button>
      <Button
        class="order-1 mr-2"
        formaction="?/rejectConsent"
        variant="subtle"
        type="submit"
      >
        Deny
      </Button>
    </div>
  </form>
</article>
