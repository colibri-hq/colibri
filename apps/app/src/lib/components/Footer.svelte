<script lang="ts">
  import ContentSection from '$lib/components/ContentSection.svelte';
  import { ColibriLogo } from '@colibri-hq/ui';
  import { Icon } from '@colibri-hq/ui';
</script>

<footer class="mt-auto w-full py-4 text-sm text-gray-400 dark:text-gray-600">
  <ContentSection>
    <div class="flex items-center gap-4">
      <a href={PACKAGE_HOMEPAGE_URL} target="_blank" rel="noopener noreferrer">
        <ColibriLogo
          class="size-10 text-gray-100 hover:text-gray-200 dark:text-gray-800 dark:hover:text-gray-700"
        />
      </a>

      <span class="me-auto">
        © 2025, the Colibri maintainers. Colibri is open source software.
      </span>

      <nav class="flex items-center gap-4 select-none">
        <ul class="contents">
          <li>
            <a
              class="group flex items-baseline gap-0.5 focus-visible:outline-none"
              href={PACKAGE_BUGS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon class="translate-y-0.5" name="flag" />
              <span class="group-hover:underline group-focus-visible:underline">
                Report a bug
              </span>
            </a>
          </li>
          <li>
            <a
              class="group flex items-baseline gap-0.5 focus-visible:outline-none"
              href={`${PACKAGE_BUGS_URL}/new?template=bug_report.yml`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon class="translate-y-0.5" name="campaign" />
              <span class="group-hover:underline group-focus-visible:underline">
                Request a feature
              </span>
            </a>
          </li>
          <li>
            <a
              class="group flex items-baseline gap-0.5 focus-visible:outline-none"
              href={`${PACKAGE_REPOSITORY_URL}/new?template=feature_request.yml`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon class="translate-y-0.5" name="volunteer_activism" />
              <span class="group-hover:underline group-focus-visible:underline">
                Contribute
              </span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </ContentSection>
</footer>
