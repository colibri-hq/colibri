<script lang="ts">
  import { Avatar, Button, Icon } from '@colibri-hq/ui';
  import InviteUserModal from './InviteUserModal.svelte';
  import CreateUserModal from './CreateUserModal.svelte';
  import { page } from '$app/state';
  import { extractPaginationParametersFromUrl, trpc } from '$lib/trpc/client';
  import PaginatedList from '$lib/components/Pagination/PaginatedList.svelte';
  import SettingsPane from './SettingsPane.svelte';

  let inviteOpen = $state(false);
  let createOpen = $state(false);

  function showInvitationModal() {
    inviteOpen = true;
  }

  function showCreateModal() {
    createOpen = true;
  }

  function loadUsers(pagination: { page?: number; per_page?: number }) {
    return trpc(page).users.list.query(pagination);
  }

  let pagination = $derived.by(() => extractPaginationParametersFromUrl(page.url));
  let users = $derived.by(() => loadUsers(pagination));
</script>

<SettingsPane description="On this page, you can manage the user accounts of your Colibri instance.">
  {#snippet actions()}
    <Button class="ml-auto lg:ml-0" onClick={showCreateModal} variant="subtle">
      Create&nbsp;Account
    </Button>
    <Button class="ml-2" onClick={showInvitationModal}
    >Invite&nbsp;someone
    </Button>
  {/snippet}

  <PaginatedList data={users}>
    {#snippet children({ items })}
      <ul role="group" class="grid gap-4 lg:grid-cols-2">
        {#each items as user, index (index)}
          <li role="presentation">
            <article
              class="relative flex flex-col rounded-3xl bg-gray-50 p-4 px-4 shadow-sm dark:bg-gray-800/75
              dark:shadow-blue-500/10 border-gray-200 dark:border-gray-700"
            >
              <header class="flex items-center">
                <Avatar
                  {user}
                  size={48}
                  class="h-12 w-12 min-w-max shrink-0 rounded-full bg-gray-50 shadow-lg ring-1 ring-gray-300
                  dark:bg-gray-900"
                />

                <div
                  role="presentation"
                  class="absolute top-0 right-0 m-2 flex h-8 w-8 items-center justify-center
                  rounded-full bg-gray-200 leading-none dark:bg-gray-700"
                >
                  <Icon name="shield_person" />
                  <!--<Icon name="family_star"/>-->
                </div>

                <div class="ml-4 max-w-fit overflow-hidden overflow-ellipsis">
                  <h3 class="text-lg font-bold">{user.name}</h3>
                  <span class="text-gray-500">{user.email}</span>
                </div>
              </header>

              <footer class="mt-4 flex items-center space-x-2 pb-2">
                <Button size="small">Edit</Button>
                <Button size="small" variant="subtle">Remove</Button>
              </footer>
            </article>
          </li>
        {/each}
      </ul>
    {/snippet}
  </PaginatedList>
</SettingsPane>

<InviteUserModal bind:open={inviteOpen} />
<CreateUserModal bind:open={createOpen} />
