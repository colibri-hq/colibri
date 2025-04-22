<script lang="ts">
  import { Button } from '@colibri-hq/ui';

  interface Props {
    action: string;
    email: string;
    loading: boolean;
  }

  let { action, email, loading }: Props = $props();
</script>

<form {action} method="POST">
  <p class="block py-8">
    No account exists for "{email}". Do you want to sign up with this address?
  </p>

  <input name="email" type="hidden" value={email} />
  <input name="register" type="hidden" value={true} />

  <Button disabled={loading} label="Sign up" type="submit" />
</form>
