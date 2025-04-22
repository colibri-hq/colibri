<script lang="ts">
  // @ts-nocheck
  import Gravatar from 'svelte-gravatar';
  import type { AuthenticationUser } from '@colibri-hq/sdk/schema';

  interface Props {
    user: Pick<AuthenticationUser, 'email'>;
    size?: number;

    [key: string]: unknown;
  }

  let { user, size = 32, ...rest }: Props = $props();
</script>

<Gravatar {...rest} class="rounded-full" email={user.email} {size} />
