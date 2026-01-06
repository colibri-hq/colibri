<script lang="ts">
  import Hero from '$lib/components/content/Hero.svelte';
  import CallToAction from '$lib/components/content/CallToAction.svelte';
  import ValueStat from '$lib/components/content/ValueStat.svelte';
  import { Button } from '@colibri-hq/ui';

  const _components = [Hero];
</script>

<Hero title="Welcome to Your Site!"
      subtitle="Create amazing static sites easily with Statue using Markdown and Svelte. Fast, secure, and SEO-friendly sites ready in minutes." />

<CallToAction
  title="Ready to get started?"
  subtitle="Join thousands of developers building with Statue today."
  actionTitle="Sign Up Now"
>
  {#snippet extraActions()}
    <Button size="large" variant="ghost">
      Learn More
    </Button>
  {/snippet}
</CallToAction>

<ValueStat label="Test Label" value="1234" />
