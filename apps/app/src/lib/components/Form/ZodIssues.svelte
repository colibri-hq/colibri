<script lang="ts">
  import type { ZodIssue } from 'zod';

  interface Props {
    issues?: ZodIssue[];
    fields?: (string | number)[] | null;
  }

  let { issues = [], fields = null }: Props = $props();

  let filteredIssues = $derived(
    fields !== null
      ? issues.filter((issue) => fields.includes(issue.path[0]))
      : issues,
  );
</script>

<ul>
  {#each filteredIssues as { message, path }}
    <li>{path[0]}: {message}</li>
  {/each}
</ul>
