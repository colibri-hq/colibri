<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import { Field } from '@colibri-hq/ui';
  import { Button } from '@colibri-hq/ui';
  import MultilineField from '$lib/components/Form/MultilineField.svelte';
  import FetchMetadataButton from '../FetchMetadataButton.svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let book = $derived(data.book);
  let creators = $derived(data.creators);

  let title = $state(data.book.title);
  let sortingKey = $derived(title.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
</script>

<article>
  <header class="mb-8">
    <h1 class="font-serif text-3xl font-bold">Edit book: {book.title}</h1>
    <p class="mt-2 text-gray-500 dark:text-gray-400">
      On this page, you can edit the details of the book.
    </p>
  </header>
  <FetchMetadataButton {book} {creators} />

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
          <MultilineField
            class="col-span-2"
            label="Synopsis"
            name="synopsis"
            value={book.synopsis || ''}
          />
          <MultilineField
            class="col-span-2"
            label="Excerpt"
            name="excerpt"
            value={book.excerpt || ''}
          />
          <MultilineField
            class="col-span-2"
            label="Legal Information"
            name="legal_information"
            value={book.legal_information || ''}
          />
        </div>
      </section>

      <section>
        <header class="mb-2">
          <h2 class="font-serif text-lg font-semibold">Book Specifics</h2>
        </header>

        <div class="grid grid-cols-3 gap-4">
          <Field label="Binding" name="binding" value={book.binding || ''} />
          <Field label="Format" name="format" value={book.format || ''} />
          <Field
            label="Pages"
            min="0"
            name="pages"
            step="1"
            type="number"
            value={book.pages?.toString() || ''}
          />
          <!--          <LanguageField label="Language" name="language" value={book.language || ""} />-->
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
            value={book.published_at || ''}
          />
        </div>
      </section>

      <section>
        <header class="mb-2">
          <h2 class="font-serif text-lg font-semibold">Identifiers</h2>
        </header>

        <div class="grid grid-cols-2 gap-4">
          <Field label="ISBN 10" name="isbn_10" value={book.isbn_10 || ''} />
          <Field label="ISBN 13" name="isbn_13" value={book.isbn_13 || ''} />
        </div>
      </section>
    </div>

    <footer class="mt-8 flex space-x-2">
      <Button type="submit">Save</Button>
      <Button href="/books/{book.id}" variant="subtle">Cancel</Button>
    </footer>
  </form>
</article>
