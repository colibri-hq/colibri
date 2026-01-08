<script lang="ts">
  import { PencilIcon } from '@lucide/svelte';

  type Props = {
    repository: string;
    branch?: string;
    slug: string;
  };

  const { repository, branch = 'main', slug }: Props = $props();
  const repositoryName = $derived(repository.split('github.com/').at(1)?.replace(/\.git$/, ''));
  const href = $derived(`https://github.com/${repositoryName}/edit/${branch}${CONTENT_ROOT_REPOSITORY_PATH}/${slug}`);
</script>

<a
  {href}
  target="_blank"
  rel="noopener noreferrer"
  class="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors outline-hidden
  focus-visible:text-blue-600 dark:focus-visible:text-blue-400"
>
  <PencilIcon class="size-4" />
  <span>Edit on GitHub</span>
</a>
