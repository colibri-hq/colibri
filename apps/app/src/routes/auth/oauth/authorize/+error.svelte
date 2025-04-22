<script lang="ts">
  import { page } from '$app/stores';
    import { Icon } from '@colibri-hq/ui';

  let status: number = $derived($page.status ?? 500);

  let title = $derived($page.error?.title ?? status);
  let message = $derived($page.error?.message.replace(/\.$/, '') + '.');
</script>

<article class="error mx-auto my-16 max-w-prose">
  <header class="mb-4">
    <h1 class="flex items-center text-3xl font-bold">
      <Icon
        class="text-3xl leading-none text-orange-500"
        name="gpp_maybe"
        weight={700}
      />
      <span class="ml-2">Integration Authorization failed</span>
    </h1>
  </header>

  <div class="flex flex-col gap-y-1 text-lg text-gray-700">
    <p>
      The integration you're trying to connect to Colibri had an error and
      couldn't connect to your&nbsp;account properly. To prevent unauthorized
      access to your data, Colibri has denied the connection.
    </p>
    <p>
      The reason for this error may be temporary issues, an outdated
      integration, or simply a bug in its code; in some cases, though, this may
      also hint at a malicious application or someone trying to do something
      more nefarious.
    </p>
    <p>
      If the problems persist, try to contact the integration author or the
      Colibri development team, and be careful.
    </p>
  </div>
  <details
    class="mt-6 rounded-2xl bg-white p-4 shadow-lg shadow-black/5 dark:bg-black"
  >
    <summary class="cursor-pointer text-sm font-medium text-gray-700">
      Technical Details
    </summary>

    <ul class="mt-2 border-t border-gray-200 pt-2 dark:border-gray-600">
      <li>
        <span>Error Code:</span>
        <code class="text-sm" data-testid="oauthErrorType">{title}</code>
      </li>
      <li>
        <span>HTTP Status:</span>
        <code class="text-sm" data-testid="oauthErrorStatus">{status}</code>
      </li>
      <li>
        <span>Description:</span>
        <span data-testid="oauthErrorDescription">{message}</span>
      </li>
    </ul>
  </details>
</article>
