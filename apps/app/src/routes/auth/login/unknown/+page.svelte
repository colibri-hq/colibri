<script lang="ts">
  import { Button } from '@colibri-hq/ui';
  import { goto } from '$app/navigation';

  function goBack() {
    return goto('/auth/login');
  }
</script>

<div>
  <strong class="mb-1 block text-lg">No account by that name</strong>
  <p class="leading-relaxed">
    We couldn't find an account for your email address. Please make sure you've
    entered it correctly.
    <br />
    If you've been invited to join Colibri, please make sure you're using the email
    address that the invitation was sent to and sign up using the link in the mail.
  </p>

  <Button class="mt-8" label="Go Back" onClick={goBack} type="button" />
</div>
