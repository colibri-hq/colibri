<script lang="ts">
  import type { ZodIssue } from 'zod';

  interface Props {
    issues?: ZodIssue[];
    fields?: (string | number)[] | null;
  }

  let { issues = [], fields = null }: Props = $props();

  let filteredIssues = $derived(
    fields !== null
      ? issues.filter((issue) => {
          const pathItem = issue.path[0];
          return pathItem !== undefined && fields.includes(pathItem);
        })
      : issues,
  );
</script>

<ul>
  {#each filteredIssues as { message, path }, index (index)}
    <li>{path[0]}: {message}</li>
  {/each}
</ul>
