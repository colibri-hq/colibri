<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button, Field, TextareaField } from '@colibri-hq/ui';
  import FetchMetadataButton from '../FetchMetadataButton.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let work = $derived(data.work);

  let title = $state(data.work.title);
  let sortingKey = $derived(title.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
</script>

<article>
  <header class="mb-8">
    <h1 class="font-serif text-3xl font-bold">Edit work: {work.title}</h1>
    <p class="mt-2 text-gray-500 dark:text-gray-400">
      On this page, you can edit the details of the work.
    </p>
  </header>
  <FetchMetadataButton workId={work.id} />

  <form method="post" use:enhance>
    <div class="grid gap-4">
      <section>
        <header class="mb-2">
          <h2 class="font-serif text-lg font-semibold">Content</h2>
        </header>

        <div class="grid grid-cols-2 gap-4">
          <Field bind:value={title} label="Title" name="title" />
          <Field
            label="Title Sorting Key"
            name="sorting_key"
            readonly
            value={sortingKey}
          />
          <TextareaField
            class="col-span-2"
            label="Synopsis"
            name="synopsis"
            value={work.synopsis || ''}
          />
          <TextareaField
            class="col-span-2"
            label="Excerpt"
            name="excerpt"
            value={work.excerpt || ''}
          />
          <TextareaField
            class="col-span-2"
            label="Legal Information"
            name="legal_information"
            value={work.legal_information || ''}
          />
        </div>
      </section>

      <section>
        <header class="mb-2">
          <h2 class="font-serif text-lg font-semibold">Work Specifics</h2>
        </header>

        <div class="grid grid-cols-3 gap-4">
          <Field label="Binding" name="binding" value={work.binding || ''} />
          <Field label="Format" name="format" value={work.format || ''} />
          <Field
            label="Pages"
            min="0"
            name="pages"
            step="1"
            type="number"
            value={work.pages?.toString() || ''}
          />
          <!--          <LanguageField label="Language" name="language" value={work.language || ""} />-->
        </div>
      </section>

      <section>
        <header class="mb-2">
          <h2 class="font-serif text-lg font-semibold">Publishing</h2>
        </header>

        <div class="grid gap-4">
          <Field
            label="Publication date"
            name="published_at"
            type="date"
            value={work.published_at ? new Date(work.published_at).toISOString().split('T')[0] : ''}
          />
        </div>
      </section>

      <section>
        <header class="mb-2">
          <h2 class="font-serif text-lg font-semibold">Identifiers</h2>
        </header>

        <div class="grid grid-cols-2 gap-4">
          <Field label="ISBN 10" name="isbn_10" value={work.isbn_10 || ''} />
          <Field label="ISBN 13" name="isbn_13" value={work.isbn_13 || ''} />
        </div>
      </section>
    </div>

    <footer class="mt-8 flex space-x-2">
      <Button type="submit">Save</Button>
      <Button href="/works/{work.id}" variant="subtle">Cancel</Button>
    </footer>
  </form>
</article>
