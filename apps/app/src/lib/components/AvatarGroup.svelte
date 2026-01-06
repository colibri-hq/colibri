<script lang="ts">
  import { Avatar } from '@colibri-hq/ui';

  type AvatarUser = { email: string; name?: string | null };

  interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users?: any[];
    size?: number;
  }

  let { users = [], size = 32 }: Props = $props();

  function asAvatarUser(user: unknown): AvatarUser {
    return user as AvatarUser;
  }
</script>

<ul class="group flex items-center space-x-1" role="list">
  {#each users as user, index (index)}
    {@const avatarUser = asAvatarUser(user)}
    <li
      class="-translate-x-1/2 transition group-hover:translate-x-0 first:translate-x-0"
      title={avatarUser.name}
    >
      <Avatar user={avatarUser} {size} />
    </li>
  {/each}
</ul>
