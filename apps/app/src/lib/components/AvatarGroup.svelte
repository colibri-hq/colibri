<script lang="ts">
  import type { User } from '@colibri-hq/sdk';
  import { Avatar } from '@colibri-hq/ui';

  interface Props {
    users?: User[];
    size?: number;
  }

  let { users = [], size = 32 }: Props = $props();
</script>

<ul class="group flex items-center space-x-1" role="list">
  {#each users as user, index (index)}
    <li
      class="-translate-x-1/2 transition group-hover:translate-x-0 first:translate-x-0"
      title={user.name}
    >
      <Avatar {user} {size} />
    </li>
  {/each}
</ul>
