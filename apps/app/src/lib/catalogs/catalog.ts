import { Feed, parseFeed } from "$lib/catalogs/atom";

export async function fetchCatalog(url: string | URL, resolveRoot = true) {
  // TODO: Avoid URL injection issues here.
  //       We don't want to fetch content from IP addresses for starters, or anything pointing back
  //       at the instance.
  let feed: Feed;

  try {
    feed = await parseFeed(url, resolveRoot);
  } catch (cause) {
    if (!(cause instanceof Error)) {
      throw new Error(`Failed to fetch catalog: ${cause}`);
    }

    throw new Error(`Failed to fetch catalog: ${cause.message}`, { cause });
  }

  return feed;
  // return {
  //   title: feed.title,
  //   imageUrl: feed.imageUrl,
  //   description: feed.description
  // };
}
