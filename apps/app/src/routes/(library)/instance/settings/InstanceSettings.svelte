<script lang="ts">
  import { page } from '$app/state';
  import { trpc } from '$lib/trpc/client';
  import { Button } from '@colibri-hq/ui';
  import SettingsPane from './SettingsPane.svelte';
  import { error as notifyError, success, warning } from '$lib/notifications';
  import { SvelteSet } from 'svelte/reactivity';

  // Simplified setting type for the UI
  type SettingCategory = 'general' | 'security' | 'content' | 'metadata';

  interface UISetting {
    key: string;
    category: SettingCategory;
    type: string;
    default: unknown;
    adminOnly: boolean;
    description: string;
    value: unknown;
    source: 'environment' | 'database' | 'default';
  }

  // Group settings by category
  let settings = $state<Record<SettingCategory, UISetting[]>>({
    general: [],
    security: [],
    content: [],
    metadata: [],
  });

  let loading = $state(true);
  let savingKeys = $state<Set<string>>(new Set());

  // Category display names
  const categoryLabels: Record<SettingCategory, string> = {
    general: 'General',
    security: 'Security',
    content: 'Content',
    metadata: 'Metadata',
  };

  // Category descriptions
  const categoryDescriptions: Record<SettingCategory, string> = {
    general: 'Basic instance configuration like name and description.',
    security: 'User registration and authentication settings.',
    content: 'Content visibility and sharing options.',
    metadata: 'Automatic metadata fetching configuration.',
  };

  // Load settings on mount
  $effect(() => {
    loadSettings();
  });

  async function loadSettings() {
    loading = true;

    try {
      const allSettings = await trpc(page).settings.list.query();

      // Group by category
      settings = {
        general: [],
        security: [],
        content: [],
        metadata: [],
      };

      for (const setting of allSettings) {
        const category = setting.category as SettingCategory;
        if (settings[category]) {
          settings[category].push(setting as UISetting);
        }
      }
    } catch (e) {
      notifyError('Failed to load settings', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      loading = false;
    }
  }

  async function saveSetting(key: string, value: unknown) {
    savingKeys.add(key);
    savingKeys = new SvelteSet(savingKeys);

    try {
      await trpc(page).settings.set.mutate({ key, value });
      // Update local state to reflect the change
      for (const category of Object.keys(settings) as unknown as SettingCategory[]) {
        const settingIndex = settings[category].findIndex(({ key: k }) => k === key);

        if (settingIndex !== -1) {
          const existing = settings[category][settingIndex];
          if (existing) {
            settings[category][settingIndex] = {
              ...existing,
              value,
              source: 'database',
            };
          }
        }
      }

      success('Setting saved');
    } catch (error) {

      notifyError('Failed to save setting', {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      savingKeys.delete(key);
      savingKeys = new SvelteSet(savingKeys);
    }
  }

  async function resetSetting(key: string) {
    savingKeys.add(key);
    savingKeys = new SvelteSet(savingKeys);

    try {
      const result = await trpc(page).settings.reset.mutate({ key });
      // Update local state with default value
      for (const category of Object.keys(settings) as SettingCategory[]) {
        const settingIndex = settings[category].findIndex((s) => s.key === key);
        if (settingIndex !== -1) {
          const existing = settings[category][settingIndex];
          if (existing) {
            settings[category][settingIndex] = {
              ...existing,
              value: result.defaultValue,
              source: 'default',
            };
          }
        }
      }
      success('Setting reset to default');
    } catch (e) {
      notifyError('Failed to reset setting', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      savingKeys.delete(key);
      savingKeys = new SvelteSet(savingKeys);
    }
  }

  async function exportSettings() {
    try {
      const data = await trpc(page).settings.export.query();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'colibri-settings.json';
      a.click();
      URL.revokeObjectURL(url);
      success('Settings exported');
    } catch (e) {
      notifyError('Failed to export settings', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    }
  }

  async function importSettings(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await trpc(page).settings.import.mutate({ data });

      if (result.errors.length > 0) {
        warning('Import completed with errors', {
          message: result.errors.map((e) => `${e.key}: ${e.error}`).join(', '),
        });
      } else {
        success('Settings imported successfully');
      }

      // Reload settings to show imported values
      await loadSettings();
    } catch (e) {
      notifyError('Failed to import settings', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    }

    // Reset file input
    input.value = '';
  }

  function isSaving(key: string): boolean {
    return savingKeys.has(key);
  }

  function getSettingLabel(key: string): string {
    // Extract readable name from URN key
    // urn:colibri:settings:general:instance-name -> Instance Name
    const parts = key.split(':');
    const name = parts[parts.length - 1];
    if (!name) return key;
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getSourceBadge(source: string): string {
    switch (source) {
      case 'environment':
        return 'ENV';
      case 'database':
        return 'DB';
      case 'default':
        return 'Default';
      default:
        return source;
    }
  }
</script>

<SettingsPane
  description="Configure global instance settings. Settings marked with ENV are overridden by environment variables.">
  {#snippet actions()}
    <div class="flex gap-2">
      <label class="cursor-pointer">
        <input
          type="file"
          accept=".json"
          class="hidden"
          onchange={importSettings}
        />
        <Button as="span">Import</Button>
      </label>
      <Button onClick={exportSettings}>Export</Button>
    </div>
  {/snippet}

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  {/if}

  <div class="space-y-8">
    {#each Object.entries(settings) as [category, categorySettings] (category)}
      {#if categorySettings.length > 0}
        <section>
          <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            {categoryLabels[category as SettingCategory]}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {categoryDescriptions[category as SettingCategory]}
          </p>

          <div class="space-y-4">
            {#each categorySettings as setting (setting.key)}
              <div class="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-gray-900 dark:text-gray-100">
                      {getSettingLabel(setting.key)}
                    </span>
                    <span
                      class="text-xs px-1.5 py-0.5 rounded {setting.source === 'environment'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : setting.source === 'database'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}"
                    >
                      {getSourceBadge(setting.source)}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {setting.description}
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  {#if setting.type === 'boolean'}
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.value as boolean}
                        disabled={setting.source === 'environment' || isSaving(setting.key)}
                        onchange={(e) => saveSetting(setting.key, (e.target as HTMLInputElement).checked)}
                        class="sr-only peer"
                      />
                      <span
                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4
                        peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700
                        peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                        peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px]
                        after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full
                        after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600
                        peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"
                      ></span>
                    </label>
                  {:else if setting.type === 'string'}
                    <input
                      type="text"
                      value={setting.value as string}
                      disabled={setting.source === 'environment' || isSaving(setting.key)}
                      onblur={(e) => {
                        const newValue = (e.target as HTMLInputElement).value;
                        if (newValue !== setting.value) {
                          saveSetting(setting.key, newValue);
                        }
                      }}
                      class="px-3 py-1.5 border rounded-md bg-white dark:bg-gray-900 border-gray-300
                      dark:border-gray-600 text-gray-900 dark:text-gray-100 disabled:opacity-50
                      disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  {:else if setting.type === 'string[]'}
                    <input
                      type="text"
                      value={(setting.value as string[]).join(', ')}
                      disabled={setting.source === 'environment' || isSaving(setting.key)}
                      onblur={(e) => {
                        const newValue = (e.target as HTMLInputElement).value
                          .split(',')
                          .map((s) => s.trim())
                          .filter((s) => s.length > 0);
                        saveSetting(setting.key, newValue);
                      }}
                      class="px-3 py-1.5 border rounded-md bg-white dark:bg-gray-900 border-gray-300
                      dark:border-gray-600 text-gray-900 dark:text-gray-100 disabled:opacity-50
                      disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="value1, value2, ..."
                    />
                  {:else if setting.type === 'number'}
                    <input
                      type="number"
                      value={Number(setting.value)}
                      disabled={setting.source === 'environment' || isSaving(setting.key)}
                      onblur={({target}) => {
                        const newValue = Number((target as HTMLInputElement).value);

                        if (newValue !== Number(setting.value)) {
                          saveSetting(setting.key, newValue);
                        }
                      }}
                      class="px-3 py-1.5 border rounded-md bg-white dark:bg-gray-900 border-gray-300
                      dark:border-gray-600 text-gray-900 dark:text-gray-100 disabled:opacity-50
                      disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
                    />
                  {/if}

                  {#if setting.source !== 'environment' && setting.source !== 'default'}
                    <button
                      type="button"
                      onclick={() => resetSetting(setting.key)}
                      disabled={isSaving(setting.key)}
                      class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400
                      dark:hover:text-gray-200 disabled:opacity-50"
                      title="Reset to default"
                    >
                      Reset
                    </button>
                  {/if}

                  {#if isSaving(setting.key)}
                    <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    {/each}
  </div>
</SettingsPane>
