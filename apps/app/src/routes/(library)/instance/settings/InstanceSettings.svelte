<script lang="ts">
  import { Avatar, Button, Icon } from '@colibri-hq/ui';
  import InviteUserModal from './InviteUserModal.svelte';
  import CreateUserModal from './CreateUserModal.svelte';
  import { page } from '$app/state';
  import { extractPaginationParametersFromUrl, trpc } from '$lib/trpc/client';
  import PaginatedList from '$lib/components/Pagination/PaginatedList.svelte';

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

  let pagination = $derived(extractPaginationParametersFromUrl(page.url));
  let users = $derived(loadUsers(pagination));
</script>

<article>
  <header
    class="mb-8 flex flex-wrap items-start justify-between lg:flex-row lg:flex-nowrap lg:items-center"
  >
    <p class="mb-4 mr-auto w-full lg:mb-0 lg:w-auto">
      On this page, you can manage the accounts of your family&nbsp;members.
    </p>

    <Button class="ml-auto lg:ml-0" onClick={showCreateModal} variant="subtle">
      Create&nbsp;Account
    </Button>
    <Button class="ml-2" onClick={showInvitationModal}
    >Invite&nbsp;someone
    </Button
    >
  </header>

  <PaginatedList data={users}>
    {#snippet children({ items })}
      <ul role="group" class="grid gap-4 lg:grid-cols-2">
        {#each items as user}
          <li role="presentation">
            <article
              class="relative flex flex-col rounded-3xl bg-gray-50 p-2 pl-3 shadow-md
              dark:bg-gray-800/75 dark:shadow-blue-500/10"
            >
              <header class="flex items-center">
                <Avatar
                  {user}
                  size={48}
                  class="h-12 w-12 min-w-max shrink-0 rounded-full bg-gray-50 shadow-lg
                  ring-1 ring-gray-300 dark:bg-gray-900"
                />

                <div
                  role="presentation"
                  class="absolute right-0 top-0 m-2 flex h-8 w-8 items-center justify-center
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
  <InviteUserModal bind:open={inviteOpen} />
  <CreateUserModal bind:open={createOpen} />
</article>
