<script lang="ts">
  // @ts-expect-error svelte-gravatar doesn't have type declarations
  import Gravatar from 'svelte-gravatar';

  interface Props {
    user: { email: string };
    size?: number;

    [key: string]: unknown;
  }

  let { user, size = 32, ...rest }: Props = $props();
</script>

<Gravatar {...rest} class="rounded-full" email={user.email} {size} />
