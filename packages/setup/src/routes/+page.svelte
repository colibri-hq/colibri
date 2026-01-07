<script lang="ts">
  import { Button, Field, Toggle, LoadingIndicator } from "@colibri-hq/ui";

  type Step = "database" | "admin" | "instance" | "storage" | "smtp" | "complete";

  const steps: { id: Step; label: string }[] = [
    { id: "database", label: "Database" },
    { id: "admin", label: "Admin" },
    { id: "instance", label: "Instance" },
    { id: "storage", label: "Storage" },
    { id: "smtp", label: "SMTP" },
    { id: "complete", label: "Complete" },
  ];

  let currentStep = $state<Step>("database");
  let isLoading = $state(false);
  let error = $state("");

  // Form state
  let databaseDsn = $state("");
  let databaseConnected = $state(false);

  let adminEmail = $state("");
  let adminName = $state("");

  let instanceName = $state("Colibri");
  let instanceDescription = $state("");

  let storageEndpoint = $state("");
  let storageAccessKey = $state("");
  let storageSecretKey = $state("");
  let storageRegion = $state("");
  let storageForcePathStyle = $state(true);

  let configureSmtp = $state(false);
  let smtpHost = $state("");
  let smtpPort = $state("587");
  let smtpUsername = $state("");
  let smtpPassword = $state("");
  let smtpFrom = $state("");

  const currentStepIndex = $derived(steps.findIndex((s) => s.id === currentStep));

  async function testDatabaseConnection() {
    isLoading = true;
    error = "";

    try {
      const response = await fetch("/api/test-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dsn: databaseDsn }),
      });

      const result = await response.json();

      if (result.success) {
        databaseConnected = true;
        error = "";
      } else {
        error = result.error || "Connection failed";
        databaseConnected = false;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Connection failed";
      databaseConnected = false;
    } finally {
      isLoading = false;
    }
  }

  async function applyConfiguration() {
    isLoading = true;
    error = "";

    try {
      const response = await fetch("/api/apply-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseDsn,
          admin: { email: adminEmail, name: adminName },
          instance: { name: instanceName, description: instanceDescription },
          storage: {
            endpoint: storageEndpoint,
            accessKeyId: storageAccessKey,
            secretAccessKey: storageSecretKey,
            region: storageRegion || undefined,
            forcePathStyle: storageForcePathStyle,
          },
          smtp: configureSmtp
            ? {
                host: smtpHost,
                port: parseInt(smtpPort),
                username: smtpUsername,
                password: smtpPassword,
                from: smtpFrom,
              }
            : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        currentStep = "complete";
      } else {
        error = result.error || "Configuration failed";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Configuration failed";
    } finally {
      isLoading = false;
    }
  }

  function goToStep(step: Step) {
    currentStep = step;
    error = "";
  }

  function nextStep() {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      currentStep = steps[nextIndex].id;
      error = "";
    }
  }

  function prevStep() {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      currentStep = steps[prevIndex].id;
      error = "";
    }
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case "database":
        return databaseConnected;
      case "admin":
        return adminEmail.includes("@") && adminName.length > 0;
      case "instance":
        return instanceName.length > 0;
      case "storage":
        return storageEndpoint.length > 0 && storageAccessKey.length > 0 && storageSecretKey.length > 0;
      case "smtp":
        return !configureSmtp || (smtpHost.length > 0 && smtpFrom.length > 0);
      default:
        return true;
    }
  }
</script>

<!-- Step indicator -->
<nav class="mb-8">
  <ol class="flex items-center gap-2">
    {#each steps as step, index}
      <li class="flex items-center gap-2">
        <button
          class="flex size-8 items-center justify-center rounded-full text-sm font-medium transition
            {currentStepIndex === index
            ? 'bg-blue-500 text-white'
            : currentStepIndex > index
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}"
          onclick={() => currentStepIndex > index && goToStep(step.id)}
          disabled={currentStepIndex <= index}
          type="button"
        >
          {#if currentStepIndex > index}
            ✓
          {:else}
            {index + 1}
          {/if}
        </button>
        <span
          class="hidden text-sm sm:inline
            {currentStepIndex === index ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500'}"
        >
          {step.label}
        </span>
        {#if index < steps.length - 1}
          <div class="h-px w-4 bg-gray-300 dark:bg-gray-600"></div>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<!-- Step content -->
<div class="space-y-6">
  {#if currentStep === "database"}
    <div>
      <h2 class="mb-2 text-2xl font-bold">Database Connection</h2>
      <p class="mb-6 text-gray-600 dark:text-gray-400">
        Enter your PostgreSQL connection string. The database should already have the Colibri schema applied.
      </p>

      <Field
        label="PostgreSQL Connection String"
        placeholder="postgres://user:pass@localhost:5432/colibri"
        bind:value={databaseDsn}
        error={error}
        disabled={isLoading}
      />

      <div class="mt-4 flex gap-3">
        <Button onclick={testDatabaseConnection} disabled={isLoading || !databaseDsn}>
          {#if isLoading}
            <LoadingIndicator class="size-4" />
            Testing...
          {:else}
            Test Connection
          {/if}
        </Button>

        {#if databaseConnected}
          <span class="flex items-center gap-2 text-green-600 dark:text-green-400">
            ✓ Connected
          </span>
        {/if}
      </div>
    </div>
  {:else if currentStep === "admin"}
    <div>
      <h2 class="mb-2 text-2xl font-bold">Admin Account</h2>
      <p class="mb-6 text-gray-600 dark:text-gray-400">
        Create the first administrator account for your Colibri instance.
      </p>

      <Field label="Email Address" placeholder="admin@example.com" bind:value={adminEmail} type="email" required />

      <Field label="Display Name" bind:value={adminName} placeholder={adminEmail.split("@")[0] || "Admin"} required />
    </div>
  {:else if currentStep === "instance"}
    <div>
      <h2 class="mb-2 text-2xl font-bold">Instance Settings</h2>
      <p class="mb-6 text-gray-600 dark:text-gray-400">Configure your Colibri instance name and description.</p>

      <Field label="Instance Name" bind:value={instanceName} required />

      <Field label="Description (optional)" placeholder="My personal ebook library" bind:value={instanceDescription} />
    </div>
  {:else if currentStep === "storage"}
    <div>
      <h2 class="mb-2 text-2xl font-bold">Storage Configuration</h2>
      <p class="mb-6 text-gray-600 dark:text-gray-400">
        Configure S3-compatible storage for your ebook files and covers.
      </p>

      <Field label="S3 Endpoint" placeholder="https://s3.amazonaws.com" bind:value={storageEndpoint} required />

      <Field label="Access Key ID" bind:value={storageAccessKey} required />

      <Field label="Secret Access Key" type="password" bind:value={storageSecretKey} required />

      <Field label="Region (optional)" placeholder="us-east-1" bind:value={storageRegion} />

      <div class="flex items-center gap-3 py-2">
        <Toggle bind:checked={storageForcePathStyle} />
        <span class="text-sm">Force path-style URLs (required for MinIO/local S3)</span>
      </div>
    </div>
  {:else if currentStep === "smtp"}
    <div>
      <h2 class="mb-2 text-2xl font-bold">Email Configuration</h2>
      <p class="mb-6 text-gray-600 dark:text-gray-400">
        Optionally configure SMTP for email notifications. You can skip this step and configure it later.
      </p>

      <div class="mb-6 flex items-center gap-3">
        <Toggle bind:checked={configureSmtp} />
        <span>Configure SMTP for email notifications</span>
      </div>

      {#if configureSmtp}
        <div class="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <Field label="SMTP Host" bind:value={smtpHost} required />

          <Field label="SMTP Port" bind:value={smtpPort} type="number" />

          <Field label="Username" bind:value={smtpUsername} />

          <Field label="Password" type="password" bind:value={smtpPassword} />

          <Field label="From Address" placeholder="noreply@example.com" bind:value={smtpFrom} required />
        </div>
      {/if}
    </div>
  {:else if currentStep === "complete"}
    <div class="text-center">
      <div class="mb-4 text-6xl">🎉</div>
      <h2 class="mb-2 text-2xl font-bold">Setup Complete!</h2>
      <p class="mb-6 text-gray-600 dark:text-gray-400">
        Your Colibri instance has been configured successfully. You can now start the application.
      </p>

      <div class="rounded-lg bg-gray-100 p-4 font-mono text-sm dark:bg-gray-800">pnpm dev:app</div>

      <p class="mt-4 text-sm text-gray-500">You can close this window now.</p>
    </div>
  {/if}

  {#if error && currentStep !== "database"}
    <div class="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
      {error}
    </div>
  {/if}

  <!-- Navigation buttons -->
  {#if currentStep !== "complete"}
    <div class="flex justify-between pt-4">
      <Button onclick={prevStep} disabled={currentStepIndex === 0} variant="subtle">Back</Button>

      {#if currentStep === "smtp"}
        <Button onclick={applyConfiguration} disabled={!canProceed() || isLoading}>
          {#if isLoading}
            <LoadingIndicator class="size-4" />
            Applying...
          {:else}
            Complete Setup
          {/if}
        </Button>
      {:else}
        <Button onclick={nextStep} disabled={!canProceed()}>Continue</Button>
      {/if}
    </div>
  {/if}
</div>
