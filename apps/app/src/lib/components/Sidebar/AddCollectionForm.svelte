<script lang="ts">
  import { Field } from '@colibri-hq/ui';
  import { savable, trpc } from '$lib/trpc/client';
  import { clickOutside } from '$lib/utilities';
  import { success, error as notifyError } from '$lib/notifications';
  import { createEventDispatcher } from 'svelte';
  import { createMdiIconUrn } from '@colibri-hq/sdk/client';
  import { page } from '$app/state';

  let loading: boolean = $state(false);
  let name: string = $state('');

  const dispatch = createEventDispatcher<{ done: { created: boolean } }>();

  async function create() {
    loading = true;

    try {
      await trpc(page).collections.save.mutate(
        savable({
          icon: createMdiIconUrn('collections_bookmark'),
          name,
        }),
      );
      success('Collection created', { message: `"${name}" has been added to your library` });
    } catch (error) {
      console.error('Failed to create collection', error);
      notifyError('Failed to create collection', { message: 'Please try again later' });
    } finally {
      loading = false;
    }

    dispatch('done', { created: true });
    name = '';
  }

  function cancel() {
    dispatch('done', { created: false });
    name = '';
  }
</script>

<form onClickOutside={cancel} onsubmit={create} use:clickOutside>
  <Field
    autofocus
    bind:value={name}
    disabled={loading}
    name="collectionName"
    placeholder="Collection Name"
  />
</form>
