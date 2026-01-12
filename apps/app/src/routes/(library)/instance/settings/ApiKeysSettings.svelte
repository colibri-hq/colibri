<script lang="ts">
  import { page } from '$app/state';
  import { trpc } from '$lib/trpc/client';
  import { Button, Icon, CopyToClipboard } from '@colibri-hq/ui';
  import SettingsPane from './SettingsPane.svelte';
  import { error as notifyError, success } from '$lib/notifications';
  import CreateApiKeyModal from './CreateApiKeyModal.svelte';

  interface ApiKeyDisplay {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    lastUsedAt: string | null;
    lastUsedIp: string | null;
    expiresAt: string | null;
    createdAt: string;
  }

  let loading = $state(true);
  let apiKeys = $state<ApiKeyDisplay[]>([]);
  let createModalOpen = $state(false);
  let newKeyValue = $state<string | null>(null);
  let newKeyName = $state<string | null>(null);
  let newKeyWasRotated = $state(false);
  let revokingId = $state<string | null>(null);
  let rotatingId = $state<string | null>(null);

  $effect(() => {
    loadApiKeys();
  });

  async function loadApiKeys() {
    loading = true;
    try {
      const keys = await trpc(page).apiKeys.list.query();
      apiKeys = keys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        scopes: key.scopes,
        lastUsedAt: key.lastUsedAt,
        lastUsedIp: key.lastUsedIp,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      }));
    } catch (e) {
      notifyError('Failed to load API keys', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      loading = false;
    }
  }

  function handleKeyCreated(result: { key: string; id: string; name: string }) {
    newKeyValue = result.key;
    newKeyName = result.name;
    newKeyWasRotated = false;
    createModalOpen = false;
    // Don't reload list yet - wait until user dismisses the plaintext panel
  }

  async function revokeKey(id: string, name: string) {
    revokingId = id;
    try {
      await trpc(page).apiKeys.revoke.mutate(id);
      success(`API key "${name}" revoked`);
      await loadApiKeys();
    } catch (e) {
      notifyError('Failed to revoke API key', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      revokingId = null;
    }
  }

  async function rotateKey(id: string) {
    rotatingId = id;
    try {
      const result = await trpc(page).apiKeys.rotate.mutate(id);
      newKeyValue = result.key;
      newKeyName = result.name;
      newKeyWasRotated = true;
      success('API key rotated. The old key will work for 15 more minutes.');
      // Don't reload list yet - wait until user dismisses the plaintext panel
    } catch (e) {
      notifyError('Failed to rotate API key', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      rotatingId = null;
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isExpired(dateStr: string | null): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  function clearNewKey() {
    newKeyValue = null;
    newKeyName = null;
    newKeyWasRotated = false;
    // Reload the list now that the user has dismissed the plaintext panel
    loadApiKeys();
  }

  let confirmRevoke = $state<string | null>(null);

  function startRevoke(id: string) {
    confirmRevoke = id;
  }

  function cancelRevoke() {
    confirmRevoke = null;
  }

  function confirmAndRevoke(id: string, name: string) {
    confirmRevoke = null;
    revokeKey(id, name);
  }
</script>

<SettingsPane
  description="Manage API keys for programmatic access to your library. Use these keys to authenticate e-readers, scripts, and other applications via Basic Auth."
>
  {#snippet actions()}
    <Button onclick={() => (createModalOpen = true)}>
      <Icon name="add" class="mr-1" />
      <span class="text-nowrap">Create API Key</span>
    </Button>
  {/snippet}

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  {:else}
    <!-- New Key Display Banner -->
    {#if newKeyValue}
      <div class="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="font-medium text-green-800 dark:text-green-200 mb-2">
              {newKeyName
                ? `API key "${newKeyName}" ${newKeyWasRotated ? 'rotated' : 'created'}`
                : `Your new API key has been ${newKeyWasRotated ? 'rotated' : 'created'}`}
            </h4>
            <p class="text-sm text-green-700 dark:text-green-300 mb-3">
              Copy this key now. You won't be able to see it again.
            </p>
            <div class="flex items-center gap-2">
              <code class="flex-1 p-3 bg-white dark:bg-gray-900 rounded font-mono text-sm break-all border border-green-200 dark:border-green-700">
                {newKeyValue}
              </code>
              <CopyToClipboard value={newKeyValue} variant="subtle" />
            </div>
          </div>
          <button
            type="button"
            onclick={clearNewKey}
            class="ml-4 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
    {/if}

    <!-- API Keys List -->
    {#if apiKeys.length === 0}
      <div class="text-center py-12 text-gray-500 dark:text-gray-400">
        <Icon name="key" class="text-5xl mb-4" />
        <p class="text-lg">No API keys yet</p>
        <p class="text-sm mt-1">Create an API key to enable programmatic access to your library.</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each apiKeys as key (key.id)}
          <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="font-medium text-gray-900 dark:text-gray-100">{key.name}</h4>
                  <code class="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {key.prefix}...
                  </code>
                </div>
                <div class="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <p>Created: {formatDate(key.createdAt)}</p>
                  <p>Last used: {formatDate(key.lastUsedAt)}{key.lastUsedIp ? ` from ${key.lastUsedIp}` : ''}</p>
                  {#if key.expiresAt}
                    <p>
                      Expires: {formatDate(key.expiresAt)}
                      {#if isExpired(key.expiresAt)}
                        <span class="text-red-500 font-medium ml-1">(Expired)</span>
                      {/if}
                    </p>
                  {:else}
                    <p>Expires: Never</p>
                  {/if}
                </div>
              </div>
              <div class="flex gap-2 ml-4">
                {#if confirmRevoke === key.id}
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500">Revoke?</span>
                    <Button
                      size="small"
                      variant="default"
                      onclick={() => confirmAndRevoke(key.id, key.name)}
                      disabled={revokingId === key.id}
                    >
                      Yes
                    </Button>
                    <Button
                      size="small"
                      variant="subtle"
                      onclick={cancelRevoke}
                      disabled={revokingId === key.id}
                    >
                      No
                    </Button>
                  </div>
                {:else}
                  <Button
                    size="small"
                    variant="subtle"
                    onclick={() => rotateKey(key.id)}
                    disabled={rotatingId === key.id || revokingId === key.id}
                  >
                    {#if rotatingId === key.id}
                      <Icon name="sync" class="mr-1 animate-spin" />
                    {:else}
                      <Icon name="sync" class="mr-1" />
                    {/if}
                    Rotate
                  </Button>
                  <Button
                    size="small"
                    variant="subtle"
                    onclick={() => startRevoke(key.id)}
                    disabled={revokingId === key.id || rotatingId === key.id}
                  >
                    {#if revokingId === key.id}
                      <Icon name="sync" class="mr-1 animate-spin" />
                    {:else}
                      <Icon name="delete" class="mr-1" />
                    {/if}
                    Revoke
                  </Button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Usage instructions -->
    <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <h4 class="font-medium text-blue-800 dark:text-blue-200 mb-2">How to use API keys</h4>
      <p class="text-sm text-blue-700 dark:text-blue-300 mb-2">
        Use your API key with Basic Authentication. The username is your email address, and the password is your API key.
      </p>
      <code class="block p-2 bg-white dark:bg-gray-900 rounded text-xs font-mono text-blue-800 dark:text-blue-200 overflow-x-auto">
        curl -u "your@email.com:col_your_api_key" https://your-colibri-instance/api/...
      </code>
    </div>
  {/if}
</SettingsPane>

<CreateApiKeyModal bind:open={createModalOpen} onCreated={handleKeyCreated} />
