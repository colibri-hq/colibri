<script lang="ts">
  import { page } from '$app/state';

  interface Props {
    visible?: boolean;
    onClose?: () => void;
  }

  let { onClose, visible = false }: Props = $props();
</script>

<dialog open={visible}>
  <article>
    <header>
      <a aria-label="Cancel" class="close" href="#cancel" onclick={onClose}></a>
      Unauthorized!
    </header>
    <p>You need to login before trying to perform this action.</p>
    <footer>
      <button class="secondary" onclick={onClose}>Cancel</button>
      <a
        class="primary"
        href={`/auth/login?returnTo=${page.url.pathname}`}
        onclick={onClose}
        role="button">Login</a
      >
    </footer>
  </article>
</dialog>
