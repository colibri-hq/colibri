<script lang="ts">
  import { Field } from '@colibri-hq/ui';
  import { savable, trpc } from '$lib/trpc/client';
  import { clickOutside } from '$lib/utilities';
  import { createEventDispatcher } from 'svelte';

  let loading: boolean = $state(false);
  let name: string = $state('');

  const dispatch = createEventDispatcher<{ done: { created: boolean } }>();

  async function create() {
    loading = true;

    try {
      await trpc().collections.save.mutate(
        savable({
          icon: 'collections_bookmark',
          name,
        }),
      );
    } catch (error) {
      console.error('Failed to create collection', error);

      // TODO: Show notification
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

<form onclickOutside={cancel} onsubmit={create} use:clickOutside>
  <Field
    autofocus
    bind:value={name}
    disabled={loading}
    name="collectionName"
    placeholder="Collection Name"
  />
</form>
