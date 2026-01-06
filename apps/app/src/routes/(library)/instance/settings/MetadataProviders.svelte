<script lang="ts">
  import { page } from '$app/state';
  import { trpc } from '$lib/trpc/client';
  import { Field, ToggleField } from '@colibri-hq/ui';
  import SettingsPane from './SettingsPane.svelte';
  import { error as notifyError, success } from '$lib/notifications';
  import { Icon } from '@colibri-hq/ui';
  import type { SettingKey } from '@colibri-hq/sdk';

  interface ProviderState {
    enabled: boolean;
    apiKeys: Record<string, string>;
    showKeys: Record<string, boolean>;
  }

  // Free provider definitions
  const freeProviders = [
    {
      id: 'OpenLibrary',
      name: 'Open Library',
      description: 'Free, comprehensive book metadata from the Internet Archive.',
    },
    {
      id: 'WikiData',
      name: 'Wikidata',
      description: 'Structured data from Wikipedia and other Wikimedia projects.',
    },
    {
      id: 'LibraryOfCongress',
      name: 'Library of Congress',
      description: 'Authoritative bibliographic data from the U.S. Library of Congress.',
    },
    {
      id: 'ISNI',
      name: 'ISNI',
      description: 'International Standard Name Identifier for creators and contributors.',
    },
    {
      id: 'VIAF',
      name: 'VIAF',
      description: 'Virtual International Authority File for author information.',
    },
  ];

  const configurableProviders = [
    {
      id: 'GoogleBooks',
      name: 'Google Books',
      description: 'Rich metadata and previews from Google Books. Requires API key.',
      enabledKey: 'urn:colibri:settings:metadata:google-books-enabled' as const,
      apiKeyFields: [
        {
          key: 'urn:colibri:settings:metadata:google-books-api-key' as const,
          label: 'API Key',
          placeholder: 'Enter your Google Books API key',
          hint: 'Get your API key from the Google Cloud Console',
        },
      ],
    },
    {
      id: 'Amazon',
      name: 'Amazon Product Advertising API',
      description: 'Book metadata from Amazon. Requires Product Advertising API credentials.',
      enabledKey: 'urn:colibri:settings:metadata:amazon-enabled' as const,
      apiKeyFields: [
        {
          key: 'urn:colibri:settings:metadata:amazon-access-key' as const,
          label: 'Access Key',
          placeholder: 'Enter your Amazon access key',
          hint: undefined,
        },
        {
          key: 'urn:colibri:settings:metadata:amazon-secret-key' as const,
          label: 'Secret Key',
          placeholder: 'Enter your Amazon secret key',
          hint: undefined,
        },
        {
          key: 'urn:colibri:settings:metadata:amazon-partner-tag' as const,
          label: 'Partner Tag',
          placeholder: 'Enter your Amazon partner tag',
          hint: undefined,
        },
        {
          key: 'urn:colibri:settings:metadata:amazon-region' as const,
          label: 'Region',
          placeholder: 'us',
          hint: 'Amazon region (e.g., "us", "uk", "de")',
        },
      ],
    },
    {
      id: 'ISBNdb',
      name: 'ISBNdb',
      description: 'Comprehensive ISBN database. Requires API key.',
      enabledKey: 'urn:colibri:settings:metadata:isbndb-enabled' as const,
      apiKeyFields: [
        {
          key: 'urn:colibri:settings:metadata:isbndb-api-key' as const,
          label: 'API Key',
          placeholder: 'Enter your ISBNdb API key',
          hint: 'Get your API key from isbndb.com',
        },
      ],
    },
    {
      id: 'Springer',
      name: 'Springer',
      description: 'Academic and scientific book metadata. Requires API key.',
      enabledKey: 'urn:colibri:settings:metadata:springer-enabled' as const,
      apiKeyFields: [
        {
          key: 'urn:colibri:settings:metadata:springer-api-key' as const,
          label: 'API Key',
          placeholder: 'Enter your Springer API key',
          hint: 'Get your API key from dev.springernature.com',
        },
      ],
    },
    {
      id: 'LibraryThing',
      name: 'LibraryThing',
      description: 'Community-driven book metadata and recommendations. Requires API key.',
      enabledKey: 'urn:colibri:settings:metadata:librarything-enabled' as const,
      apiKeyFields: [
        {
          key: 'urn:colibri:settings:metadata:librarything-api-key' as const,
          label: 'API Key',
          placeholder: 'Enter your LibraryThing API key',
          hint: 'Get your API key from librarything.com/services',
        },
      ],
    },
  ] as const;

  // Cover settings keys
  const coverSettings = {
    fallbackEnabled: 'urn:colibri:settings:metadata:cover-fallback-enabled' as const,
    minWidth: 'urn:colibri:settings:metadata:cover-min-width' as const,
    minHeight: 'urn:colibri:settings:metadata:cover-min-height' as const,
  };

  // State
  let loading = $state(true);
  let savingKeys = $state<Set<string>>(new Set());
  let enabledProviders = $state<string[]>([]);
  let providersState = $state<Record<string, ProviderState>>({});
  let coverFallbackEnabled = $state(true);
  let coverMinWidth = $state(400);
  let coverMinHeight = $state(600);

  // Load settings on mount
  $effect(() => {
    loadSettings();
  });

  async function loadSettings() {
    loading = true;

    try {
      const allSettings = await trpc(page).settings.list.query();
      const settingsMap = new Map(allSettings.map((s) => [s.key, s.value]));

      // Get enabled providers list
      const enabledProvidersKey = 'urn:colibri:settings:metadata:enabled-providers' as const;
      const enabledProvidersValue = settingsMap.get(enabledProvidersKey);
      enabledProviders = Array.isArray(enabledProvidersValue) ? enabledProvidersValue : [];

      // Initialize provider states
      const newProvidersState: Record<string, ProviderState> = {};

      // Configurable providers
      for (const provider of configurableProviders) {
        const apiKeys: Record<string, string> = {};
        const showKeys: Record<string, boolean> = {};

        for (const field of provider.apiKeyFields) {
          apiKeys[field.key] = (settingsMap.get(field.key) as string | undefined) ?? '';
          showKeys[field.key] = false;
        }

        newProvidersState[provider.id] = {
          enabled: (settingsMap.get(provider.enabledKey) as boolean | undefined) ?? false,
          apiKeys,
          showKeys,
        };
      }

      providersState = newProvidersState;

      // Load cover settings
      coverFallbackEnabled = (settingsMap.get(coverSettings.fallbackEnabled) as boolean | undefined) ?? true;
      coverMinWidth = (settingsMap.get(coverSettings.minWidth) as number | undefined) ?? 400;
      coverMinHeight = (settingsMap.get(coverSettings.minHeight) as number | undefined) ?? 600;
    } catch (e) {
      notifyError('Failed to load metadata provider settings', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      loading = false;
    }
  }

  async function saveSetting(key: SettingKey, value: unknown) {
    savingKeys.add(key);
    savingKeys = new Set(savingKeys);

    try {
      await trpc(page).settings.set.mutate({ key, value });
      success('Setting saved');
    } catch (e) {
      notifyError('Failed to save setting', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      savingKeys.delete(key);
      savingKeys = new Set(savingKeys);
    }
  }

  function toggleFreeProviderEnabled(providerId: string) {
    const newEnabled = !enabledProviders.includes(providerId);
    if (newEnabled) {
      enabledProviders = [...enabledProviders, providerId];
    } else {
      enabledProviders = enabledProviders.filter(p => p !== providerId);
    }
    const key = 'urn:colibri:settings:metadata:enabled-providers' as const;
    saveSetting(key, enabledProviders);
  }

  function toggleConfigurableProviderEnabled(providerId: string, config: typeof configurableProviders[number]) {
    const state = providersState[providerId];
    if (!state) return;

    const newEnabled = !state.enabled;
    state.enabled = newEnabled;
    saveSetting(config.enabledKey, newEnabled);
  }

  function toggleShowKey(providerId: string, fieldKey: string) {
    const state = providersState[providerId];
    if (!state) return;

    state.showKeys[fieldKey] = !state.showKeys[fieldKey];
  }

  function saveApiKey(providerId: string, fieldKey: string, value: string) {
    const state = providersState[providerId];
    if (!state) return;

    state.apiKeys[fieldKey] = value;
    // fieldKey is already a SettingKey from the configurableProviders definition
    saveSetting(fieldKey as SettingKey, value);
  }

  function saveCoverFallback(enabled: boolean) {
    coverFallbackEnabled = enabled;
    saveSetting(coverSettings.fallbackEnabled, enabled);
  }

  function saveCoverMinWidth(width: number) {
    coverMinWidth = width;
    saveSetting(coverSettings.minWidth, width);
  }

  function saveCoverMinHeight(height: number) {
    coverMinHeight = height;
    saveSetting(coverSettings.minHeight, height);
  }

  function isSaving(key: string): boolean {
    return savingKeys.has(key);
  }
</script>

<SettingsPane
  description="Configure metadata providers for automatic book information fetching. Enable or disable providers and add API keys for paid services."
>
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  {:else}
    <div class="space-y-8">
      <!-- Free Providers -->
      <section>
        <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Free Providers
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          These providers are always available and don't require API keys.
        </p>

        <div class="space-y-3">
          {#each freeProviders as provider (provider.id)}
            <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <ToggleField
                checked={enabledProviders.includes(provider.id)}
                disabled={isSaving('urn:colibri:settings:metadata:enabled-providers')}
                onCheckedChange={() => toggleFreeProviderEnabled(provider.id)}
              >
                {#snippet label()}
                  <div>
                    <div class="font-medium text-gray-900 dark:text-gray-100">
                      {provider.name}
                    </div>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {provider.description}
                    </p>
                  </div>
                {/snippet}
              </ToggleField>
              {#if isSaving('urn:colibri:settings:metadata:enabled-providers')}
                <div class="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  Saving...
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </section>

      <!-- Configurable Providers -->
      <section>
        <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Configurable Providers
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          These providers require API keys. Sign up for an account with each provider to get your credentials.
        </p>

        <div class="space-y-4">
          {#each configurableProviders as provider (provider.id)}
            {@const state = providersState[provider.id]}
            {#if state}
              <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <ToggleField
                  checked={state.enabled}
                  disabled={isSaving(provider.enabledKey)}
                  onCheckedChange={() => toggleConfigurableProviderEnabled(provider.id, provider)}
                >
                  {#snippet label()}
                    <div>
                      <div class="font-medium text-gray-900 dark:text-gray-100">
                        {provider.name}
                      </div>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {provider.description}
                      </p>
                    </div>
                  {/snippet}
                </ToggleField>

                {#if state.enabled && provider.apiKeyFields}
                  <div class="mt-4 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    {#each provider.apiKeyFields as field (field.key)}
                      <div class="relative">
                        <Field
                          type={state.showKeys[field.key] ? 'text' : 'password'}
                          label={field.label}
                          placeholder={field.placeholder}
                          hint={field.hint}
                          value={state.apiKeys[field.key]}
                          disabled={isSaving(field.key)}
                          onBlur={(e) => {
                            const newValue = (e.target as HTMLInputElement).value;
                            if (newValue !== state.apiKeys[field.key]) {
                              saveApiKey(provider.id, field.key, newValue);
                            }
                          }}
                        >
                          {#snippet postfix()}
                            <button
                              type="button"
                              onclick={() => toggleShowKey(provider.id, field.key)}
                              class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                              title={state.showKeys[field.key] ? 'Hide' : 'Show'}
                            >
                              <Icon name={state.showKeys[field.key] ? 'eye-off' : 'eye'} />
                            </button>
                          {/snippet}
                        </Field>
                        {#if isSaving(field.key)}
                          <div class="absolute right-0 top-0 mt-8 flex items-center gap-2 text-xs text-gray-500">
                            <div class="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            Saving...
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}

                {#if isSaving(provider.enabledKey)}
                  <div class="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    Saving...
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      </section>

      <!-- Cover Settings -->
      <section>
        <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Cover Image Settings
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Configure how cover images are fetched and validated.
        </p>

        <div class="space-y-3">
          <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <ToggleField
              checked={coverFallbackEnabled}
              disabled={isSaving(coverSettings.fallbackEnabled)}
              onCheckedChange={saveCoverFallback}
            >
              {#snippet label()}
                <div>
                  <div class="font-medium text-gray-900 dark:text-gray-100">
                    Enable Cover Fallback Cascade
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Try multiple providers if the first one doesn't return a suitable cover image.
                  </p>
                </div>
              {/snippet}
            </ToggleField>
          </div>

          <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                type="number"
                label="Minimum Cover Width (px)"
                value={String(coverMinWidth)}
                min="100"
                max="5000"
                step="50"
                disabled={isSaving(coverSettings.minWidth)}
                hint="Cover images smaller than this will be rejected"
                onBlur={(e) => {
                  const newValue = Number((e.target as HTMLInputElement).value);
                  if (newValue !== coverMinWidth && newValue >= 100) {
                    saveCoverMinWidth(newValue);
                  }
                }}
              />

              <Field
                type="number"
                label="Minimum Cover Height (px)"
                value={String(coverMinHeight)}
                min="100"
                max="5000"
                step="50"
                disabled={isSaving(coverSettings.minHeight)}
                hint="Cover images smaller than this will be rejected"
                onBlur={(e) => {
                  const newValue = Number((e.target as HTMLInputElement).value);
                  if (newValue !== coverMinHeight && newValue >= 100) {
                    saveCoverMinHeight(newValue);
                  }
                }}
              />
            </div>

            {#if isSaving(coverSettings.minWidth) || isSaving(coverSettings.minHeight)}
              <div class="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                Saving...
              </div>
            {/if}
          </div>
        </div>
      </section>
    </div>
  {/if}
</SettingsPane>
