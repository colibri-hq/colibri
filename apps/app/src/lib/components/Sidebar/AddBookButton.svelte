<script lang="ts">
  import { Button, Icon } from '@colibri-hq/ui';

  interface Props {
    onClick?: () => unknown;
  }

  const { onClick }: Props = $props();
</script>

<Button
  class="mt-auto justify-center bg-black text-white py-4"
  onclick={onClick}
  type="button"
  variant="primary"
>
  <Icon name="add" />
  <span class="hidden md:inline">Add Book</span>
</Button>
