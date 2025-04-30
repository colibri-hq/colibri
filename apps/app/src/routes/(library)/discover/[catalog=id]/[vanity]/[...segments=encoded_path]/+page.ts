import { browser } from "$app/environment";
import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";
import { decodeBreadcrumbs, encodeBreadcrumbs } from "./breadcrumbs";

export const load = async function load(event) {
  // region Catalog retrieval
  const router = trpc(event);
  const id = event.params.catalog;
  const catalog = await router.catalogs.load.query({ id });
  // endregion

  // region Breadcrumbs and nesting
  // The segments are a spread URL parameter, meaning there can be multiple segments delimited by
  // slashes - making it look like ordinary URL paths. These segments are base64url-encoded JSON
  // arrays of two strings: the catalog link and the title of the category.
  // This makes it possible to keep state on the current page, its parent pages, and enable the user
  // to navigate back up the hierarchy without keeping any state on the server.
  const segments = event.params.segments
    .split("/")
    .filter((value) => !!value)
    .map((value) => decodeBreadcrumbs(value));
  const breadcrumbs: { link: string; title: string | null }[] = segments.reduce(
    (breadcrumbs, [link, title], i) => {
      // Since we're reducing with array containing the first item, we can work off of offset 1
      // and access the previous breadcrumb using our current index.
      const previousLink = breadcrumbs[i]!.link;
      const encoded = encodeBreadcrumbs([link, title]);

      // We're building the next breadcrumb by appending the current category data to the previous
      // link, nesting the categories.
      return [
        ...breadcrumbs,
        {
          link: `${previousLink}/${encoded}`,
          title,
        },
      ];
    },

    // Use the base URL as the starting value for the reduction.
    [
      {
        link: `/discover/${id}/${catalog.slug}`,
        title: catalog.title,
      },
    ],
  );
  // endregion

  // region Feed retrieval
  // Take the link to the category to fetch from the last decoded segment
  const categoryUrl = segments.at(-1)?.[0] ?? undefined;
  const feedUrl = categoryUrl
    ? new URL(categoryUrl, catalog.feed_url).href
    : catalog.feed_url;
  const feed = router.catalogs.fetchRemoteCatalog.query({ feedUrl });
  // endregion

  return {
    catalog,
    feed: browser ? feed : await feed,
    breadcrumbs,
  };
} satisfies PageLoad;
