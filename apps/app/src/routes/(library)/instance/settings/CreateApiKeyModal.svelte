<script lang="ts">
  import { page } from '$app/state';
  import { trpc } from '$lib/trpc/client';
  import { Button, Field, Modal, Icon } from '@colibri-hq/ui';
  import { error as notifyError } from '$lib/notifications';
  import { API_KEY_SCOPES, SCOPE_REGISTRY, type ApiKeyScope } from '@colibri-hq/sdk/scopes';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    open: boolean;
    onCreated: (result: { key: string; id: string; name: string }) => void;
  }

  let { open = $bindable(), onCreated }: Props = $props();

  let name = $state('');
  let expiresIn = $state<string>('never');
  let creating = $state(false);
  let selectedScopes = $state(new SvelteSet<ApiKeyScope>(API_KEY_SCOPES));
  let showAdvanced = $state(false);

  // Group scopes by category for display
  const scopesByCategory = $derived.by(() => {
    const groups: Record<string, Array<{ name: ApiKeyScope; description: string }>> = {};

    for (const scope of API_KEY_SCOPES) {
      const def = SCOPE_REGISTRY[scope];
      const category = def.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({
        name: scope,
        description: def.description,
      });
    }

    return groups;
  });

  const categoryLabels: Record<string, string> = {
    library: 'Library',
    progress: 'Reading Progress',
    admin: 'Administration',
  };

  function toggleScope(scope: ApiKeyScope) {
    if (selectedScopes.has(scope)) {
      selectedScopes.delete(scope);
    } else {
      selectedScopes.add(scope);
    }
  }

  function selectAllScopes() {
    selectedScopes = new SvelteSet(API_KEY_SCOPES);
  }

  function clearAllScopes() {
    selectedScopes = new SvelteSet();
  }

  async function handleCreate() {
    if (!name.trim()) {
      notifyError('Please enter a name for this API key');
      return;
    }

    if (selectedScopes.size === 0) {
      notifyError('Please select at least one permission');
      return;
    }

    creating = true;
    try {
      let expiresAt: Date | null = null;

      if (expiresIn !== 'never') {
        const now = new Date();
        switch (expiresIn) {
          case '30d':
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
            break;
          case '1y':
            expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      const result = await trpc(page).apiKeys.create.mutate({
        name: name.trim(),
        scopes: Array.from(selectedScopes),
        expiresAt,
      });

      const createdName = name.trim();
      name = '';
      expiresIn = 'never';
      selectedScopes = new SvelteSet(API_KEY_SCOPES);
      showAdvanced = false;
      onCreated({ key: result.key, id: result.id, name: createdName });
    } catch (e) {
      notifyError('Failed to create API key', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      creating = false;
    }
  }

  function handleClose() {
    name = '';
    expiresIn = 'never';
    selectedScopes = new SvelteSet(API_KEY_SCOPES);
    showAdvanced = false;
    open = false;
  }
</script>

<Modal bind:open onClose={handleClose}>
  {#snippet header()}
    <h2 class="text-xl font-semibold">Create API Key</h2>
  {/snippet}

  <form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="space-y-6 min-w-80">
    <Field
      label="Name"
      placeholder="e.g., Kindle, Reading Script, Calibre"
      bind:value={name}
      required
      hint="A descriptive name to help you identify this key"
    />

    <div>
      <label for="api-key-expiration" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Expiration
      </label>
      <select
        id="api-key-expiration"
        bind:value={expiresIn}
        class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
      >
        <option value="never">Never expires</option>
        <option value="30d">30 days</option>
        <option value="90d">90 days</option>
        <option value="1y">1 year</option>
      </select>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {expiresIn === 'never'
          ? 'The key will remain valid until manually revoked.'
          : 'The key will automatically expire after this period.'}
      </p>
    </div>

    <!-- Permissions -->
    <div>
      <button
        type="button"
        onclick={() => (showAdvanced = !showAdvanced)}
        class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <Icon name={showAdvanced ? 'expand_more' : 'chevron_right'} class="text-lg" />
        Permissions
        <span class="text-gray-500 dark:text-gray-400 font-normal">
          ({selectedScopes.size} of {API_KEY_SCOPES.length} selected)
        </span>
      </button>

      {#if showAdvanced}
        <div class="mt-3 space-y-4 pl-6">
          <div class="flex gap-3 text-sm">
            <button
              type="button"
              onclick={selectAllScopes}
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onclick={clearAllScopes}
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear all
            </button>
          </div>

          {#each Object.entries(scopesByCategory) as [category, scopes] (category)}
            <div>
              <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {categoryLabels[category] ?? category}
              </h4>
              <div class="space-y-2">
                {#each scopes as { name: scope, description } (scope)}
                  <label class="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedScopes.has(scope)}
                      onchange={() => toggleScope(scope)}
                      class="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {scope}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {description}
                      </div>
                    </div>
                  </label>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 pl-6">
          {#if selectedScopes.size === API_KEY_SCOPES.length}
            Full access to all features.
          {:else if selectedScopes.size === 0}
            No permissions selected.
          {:else}
            Limited to: {Array.from(selectedScopes).join(', ')}
          {/if}
        </p>
      {/if}
    </div>

    <div class="flex justify-end gap-3 pt-4">
      <Button type="button" variant="subtle" onclick={handleClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={creating || !name.trim()}>
        {#if creating}
          Creating...
        {:else}
          Create Key
        {/if}
      </Button>
    </div>
  </form>
</Modal>
