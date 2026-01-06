import { log } from "$lib/logging";
import { Parser } from "xml2js";

export async function loadFeed(
  url: string | URL | AtomLink | OpdsLink,
  resolveRoot = true,
) {
  const feedUrl = typeof url === "string" ? url : url.href;
  let body: string;

  try {
    log("odps", "debug", "Fetching feed", { url: feedUrl });
    const response = await fetch(feedUrl, {
      redirect: "follow",
      method: "GET",
    });
    body = await response.text();

    if (!response.ok) {
      const { status, statusText } = response;

      log("odps", "error", "Failed to fetch feed", {
        url: feedUrl,
        status,
        statusText,
        body,
      });

      throw new Error(`Server reported an error: ${status}—${statusText}`);
    }
  } catch (cause) {
    log("odps", "error", "Failed to fetch feed", { url: feedUrl, cause });

    if (!(cause instanceof Error)) {
      throw new Error(`Failed to fetch feed: ${cause}`);
    }

    throw new Error(`Failed to fetch feed: ${cause.message}`, { cause });
  }

  const parser = createParser();
  let parsedBody;

  try {
    parsedBody = await parser.parseStringPromise(body);
  } catch (cause) {
    if (!(cause instanceof Error)) {
      throw cause;
    }

    throw new Error(`Failed to parse feed as XML: ${cause.message}`, { cause });
  }

  if (!isAtomFeedXmlDocument(parsedBody)) {
    throw new Error("Failed to parse feed as XML: No feed data");
  }

  const { feed } = parsedBody;

  if (!isAtomFeed(feed)) {
    throw new Error("Invalid feed format: Not an Atom feed");
  }

  if (!isOdpsFeed(feed)) {
    throw new Error("Invalid OPDS feed: Not an OPDS feed");
  }

  if (!resolveRoot) {
    return feed;
  }

  const links = Array.isArray(feed.link) ? feed.link : [feed.link];
  const catalogLink = links.find((link) => link.rel === "start");
  const selfLink = links.find((link) => link.rel === "self");

  if (!catalogLink) {
    throw new Error("Invalid OPDS feed: No start link");
  }

  if (
    (!selfLink && feedUrl !== catalogLink.href) ||
    (selfLink && selfLink.href !== catalogLink.href)
  ) {
    log(
      "odps",
      "warn",
      "OPDS feed contains different start link, parsing feed root",
      {
        url: feedUrl,
        selfLink: selfLink?.href,
        catalogLink: catalogLink.href,
      },
    );
    return loadFeed(new URL(catalogLink.href, feedUrl));
  }

  return feed;
}

export async function parseFeed(url: string | URL, resolveRoot = true) {
  const feed = await loadFeed(url, resolveRoot);

  return new Feed(feed);
}

function createParser() {
  return new Parser({
    async: true,
    normalize: true,
    normalizeTags: true,
    mergeAttrs: true,
    explicitArray: false,
    trim: true,
    attrValueProcessors: [
      /**
       * Process the `type` attribute of `link` elements in Atom feeds.
       *
       * This transformer will convert the `type` attribute value of `link` elements to an object
       * if the value starts with `application/atom+xml;`, containing the key-value pairs of the
       * attribute value.
       * This allows to access OPDS catalog link metadata in a more structured way.
       *
       * @param value
       * @param name
       */
      function processAtomLinkType(value: string, name: string) {
        if (name === "type" && value.startsWith("application/atom+xml")) {
          return `mime=${value}`
            .split(";")
            .map((part) => part.split("="))
            .reduce<Record<string, string>>((acc, [key, value]) => {
              if (key && value) {
                acc[key] = value;
              }
              return acc;
            }, {});
        }

        return value;
      },
    ],
  });
}

function isAtomFeedXmlDocument(
  xmlDocument: unknown,
): xmlDocument is { feed: object } {
  return (
    typeof xmlDocument === "object" &&
    xmlDocument !== null &&
    "feed" in xmlDocument
  );
}

function isAtomFeed(feed: unknown): feed is AtomFeed | OpdsFeed {
  return (
    typeof feed === "object" &&
    feed !== null &&
    "xmlns" in feed &&
    feed.xmlns === "http://www.w3.org/2005/Atom"
  );
}

function isOdpsFeed(feed: AtomFeed | OpdsFeed): feed is OpdsFeed {
  return (
    (feed.link &&
      (Array.isArray(feed.link) ? feed.link : [feed.link]).some(
        (link) =>
          typeof link.type === "object" &&
          "profile" in link.type &&
          link.type.profile === "opds-catalog",
      )) ??
    false
  );
}

function isOpdsLink(link: AtomLink | OpdsLink): link is OpdsLink {
  return (
    link.rel?.startsWith("http://opds-spec.org/") ||
    (typeof link.type === "object" &&
      "profile" in link.type &&
      link.type.profile === "opds-catalog")
  );
}

function isOpdsEntry(entry: AtomEntry | OpdsEntry): entry is OpdsEntry {
  return !!(
    entry.link &&
    (Array.isArray(entry.link) ? entry.link : [entry.link]).some(
      (link) => isOpdsLink(link) || link.rel === "alternate",
    )
  );
}

export class OpdsRecord<
  T extends OpdsFeed | OpdsEntry = OpdsFeed | OpdsEntry,
  P extends OpdsRecord<OpdsFeed> = OpdsRecord<OpdsFeed, never>,
> {
  readonly #record: T;
  readonly #document: P | undefined;
  readonly #links: OpdsLink[];

  constructor(record: T, document?: P) {
    this.#record = record;
    this.#document = document;
    this.#links = extractLinks(record);
  }

  public get title() {
    return extractTitle(this.#record);
  }

  public get id() {
    return this.#record.id;
  }

  public get lastUpdatedAt() {
    return this.record.updated || undefined;
  }

  public get links() {
    return this.#links;
  }

  protected get record() {
    return this.#record;
  }

  protected get document() {
    return this.#document;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }
}

export class Feed extends OpdsRecord<OpdsFeed> {
  readonly #entries: OpdsEntry[];

  public constructor(feed: OpdsFeed) {
    super(feed);
    this.#entries = extractEntries(feed);
  }

  public get links() {
    return super.links.filter(
      (link) => link.rel !== "self" && link.rel !== "start",
    );
  }

  public get selfLink() {
    return super.links.find(({ rel }) => rel === "self")?.href;
  }

  public get rootLink() {
    return super.links.find(({ rel }) => rel === "start")?.href;
  }

  public get isRoot() {
    return this.selfLink === this.rootLink;
  }

  public get root() {
    const root = this.rootLink;

    return root ? this.load(root) : Promise.resolve(this);
  }

  public get title() {
    return (
      super.title ||
      this.unrelatedEntries.find((entry) => entry.title)?.title ||
      (this.rootLink && new URL(this.rootLink).hostname) ||
      this.id
    );
  }

  public get description() {
    return this.unrelatedEntries.find((entry) => entry.summary)?.summary;
  }

  public get imageUrl() {
    return this.unrelatedEntries
      .flatMap((entry) => extractLinks(entry))
      .find((link) => link?.rel === "http://opds-spec.org/image/thumbnail")
      ?.href;
  }

  public get authors() {
    return extractAuthors(this.record);
  }

  public get entries() {
    return this.itemEntries.map((entry) => new Entry(entry, this));
  }

  public get categories() {
    return this.categoryEntries.map((entry) => new Category(entry, this));
  }

  public get unrelatedEntries() {
    return this.#entries.filter(
      (entry) =>
        !this.itemEntries.includes(entry) &&
        !this.categoryEntries.includes(entry),
    );
  }

  private get itemEntries() {
    return this.#entries.filter((entry) =>
      extractLinks(entry).some((link) =>
        link.rel.startsWith("http://opds-spec.org/acquisition"),
      ),
    );
  }

  private get categoryEntries() {
    return this.#entries.filter((entry) =>
      extractLinks(entry).some(
        (link) =>
          typeof link.type === "object" &&
          ["navigation", "acquisition"].includes(link.type.kind),
      ),
    );
  }

  public toJSON() {
    return {
      ...super.toJSON(),
      description: this.description,
      imageUrl: this.imageUrl,
      authors: this.authors,
      entries: this.entries,
      categories: this.categories,
      unrelatedEntries: this.unrelatedEntries,
      selfLink: this.selfLink,
      rootLink: this.rootLink,
      isRoot: this.isRoot,
    };
  }

  private async load(link: OpdsLink | string) {
    const feed = await loadFeed(link);

    return new Feed(feed);
  }
}

export class Entry extends OpdsRecord<OpdsEntry, Feed> {
  public get language() {
    return this.record["dc:language"]?._;
  }

  public get authors() {
    return extractAuthors(this.record);
  }

  public get description() {
    return this.record.summary;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      description: this.description,
      language: this.language,
      authors: this.authors,
      links: this.links,
    };
  }
}

export class Category extends OpdsRecord<OpdsEntry, Feed> {
  public get subsections() {
    return this.links
      .filter((link) => link.rel === "subsection")
      .map(({ href }) => new URL(href, this.document!.rootLink));
  }

  public get link() {
    return this.links.find((link) => link.rel === "subsection")?.href ?? "/";
  }

  toJSON() {
    return {
      ...super.toJSON(),
      link: this.link,
      subsections: this.subsections.length > 1 ? this.subsections : undefined,
    };
  }
}

function extractLinks({ link = [] }: OpdsFeed | OpdsEntry) {
  return (link ? (Array.isArray(link) ? link : [link]) : []).filter(isOpdsLink);
}

function extractEntries(feed: OpdsFeed) {
  return (
    feed.entry ? (Array.isArray(feed.entry) ? feed.entry : [feed.entry]) : []
  ).filter(isOpdsEntry);
}

function extractTitle(feed: OpdsFeed | AtomFeed | OpdsEntry | AtomEntry) {
  return feed.title || feed.id;
}

function extractAuthors(feed: OpdsFeed | OpdsEntry) {
  const authors = feed.author
    ? Array.isArray(feed.author)
      ? feed.author
      : [feed.author]
    : [];

  return authors.map(({ name, uri = undefined, email = undefined }) => ({
    name,
    uri,
    email,
  }));
}

export interface OpdsFeed extends Omit<AtomFeed, "link" | "entry"> {
  link: OpdsLink | AtomLink | (OpdsLink | AtomLink)[];
  entry: OpdsEntry | AtomEntry | (OpdsEntry | AtomEntry)[];
}

export interface OpdsLink extends Omit<AtomLink, "rel"> {
  rel: OpdsLinkRelType;
  href: `http://${string}` | `https://${string}` | string;
  type:
    | string
    | { profile: "opds-catalog"; kind: "acquisition" | "navigation" };
}

type OpdsLinkRelType =
  | "self"
  | "start"
  | "search"
  | "subsection"

  // A graphical Resource associated to the OPDS Catalog Entry.
  | "http://opds-spec.org/image"

  // A reduced-size version of a graphical Resource associated to the OPS Catalog Entry.
  | "http://opds-spec.org/image/thumbnail"

  // A generic relation that indicates that the complete representation of the content Resource may
  // be retrieved.
  | "http://opds-spec.org/acquisition"

  // Indicates that the complete representation of the Resource can be retrieved without any
  // requirement, which includes payment and registration.
  | "http://opds-spec.org/acquisition/open-access"

  // Indicates that the complete representation of the content Resource may be retrieved as part of
  // a lending transaction.
  | "http://opds-spec.org/acquisition/borrow"

  // Indicates that the complete representation of the content Resource may be retrieved as part of
  // a purchase.
  | "http://opds-spec.org/acquisition/buy"

  // Indicates that a subset of the content Resource may be retrieved.
  | "http://opds-spec.org/acquisition/samle"
  | "http://opds-spec.org/acquisition/preview"

  // Indicates that the complete representation of the content Resource may be retrieved as part of
  // a subscription.
  | "http://opds-spec.org/acquisition/subscribe"
  | AtomLinkRelType;

export interface OpdsEntry extends Omit<AtomEntry, "link"> {
  link: OpdsLink | AtomLink | (OpdsLink | AtomLink)[];
}

/** A Feed consists of some metadata, followed by any number of entries.  */
export interface AtomFeed {
  xmlns?: "http://www.w3.org/2005/Atom";

  /**
   * Identifies the feed using a universally unique and permanent URI. If you have a long-term,
   * renewable lease on your Internet domain name, then you can feel free to use your
   * website's address.
   */
  id: string;

  /**
   * Contains a human-readable title for the feed. Often the same as the title of the associated
   * website. This value should not be blank.
   */
  title: AtomTitle;

  /**
   * Indicates the last time the feed was modified in a significant way.
   */
  updated: Date;

  /**
   * The entries within the feed
   */
  entries: AtomEntry[];

  /**
   * Names one author of the feed. A feed may have multiple author elements. A feed must contain at
   * least one author element unless all of the entry elements contain at least one author element.
   */
  author?: AtomAuthor[];

  /**
   * Identifies a related Web page. The type of relation is defined by the rel attribute. A feed is
   * limited to one alternate per type and hreflang. A feed should contain a link back to the
   * feed itself.
   */
  link?: AtomLink[];

  /**
   * Specifies a category that the feed belongs to. A feed may have multiple category elements.
   */
  category?: AtomCategory[];

  /**
   * Names one contributor to the feed. An feed may have multiple contributor elements.
   */
  contributor?: AtomContributor[];

  /**
   * Identifies the software used to generate the feed, for debugging and other purposes. Both the
   * `uri` and `version` attributes are optional.
   */
  generator?: AtomGenerator;

  /**
   * Identifies a small image which provides iconic visual identification for the feed. Icons should
   * be square.
   */
  icon?: string;

  /**
   * Identifies a larger image which provides visual identification for the feed. Images should be
   * twice as wide as they are tall.
   */
  logo?: string;

  /**
   * Conveys information about rights, e.g. copyrights, held in and over the feed.
   */
  rights?: AtomRights;

  /**
   * Contains a human-readable description or subtitle for the feed.
   */
  subtitle?: string;
}

/**
 * Identifies the software used to generate the feed, for debugging and other purposes. Both the
 * `uri` and `version` attributes are optional.
 */
export interface AtomGenerator {
  value: string;
  uri?: string;
  version?: string;
}

export interface AtomEntry {
  /**
   * Identifies the entry using a universally unique and permanent URI. Suggestions on how to make a
   * good id can be found here. Two entries in a feed can have the same value for id if they
   * represent the same entry at different points in time. */
  id: string;

  /**
   *  Contains a human-readable title for the entry. This value should not be blank. */
  title: AtomTitle;

  /**
   * Indicates the last time the entry was modified in a significant way. This value need not change
   * after a typo is fixed, only after a substantial modification. Generally, different entries in a
   * feed will have different updated timestamps.
   */
  updated: Date;

  /**
   * Names one author of the entry. An entry may have multiple authors. An entry must contain at
   * least one author element unless there is an author element in the enclosing feed, or there is
   * an author element in the enclosed source element.
   */
  author?: AtomAuthor[];

  /**
   * Contains or links to the complete content of the entry. Content must be provided if there is no
   * alternate link, and should be provided if there is no summary.
   */
  content?: AtomContent;

  /**
   * Identifies a related Web page. The type of relation is defined by the rel attribute. An entry
   * is limited to one alternate per type and hreflang. An entry must contain an alternate link if
   * there is no content element.
   */
  link?: AtomLink[];

  /**
   * Conveys a short summary, abstract, or excerpt of the entry. Summary should be provided if there
   * either is no content provided for the entry, or that content is not inline (i.e., contains a
   * src attribute), or if the content is encoded in base64.
   */
  summary?: AtomSummary;

  /**
   * Specifies a category that the entry belongs to. A entry may have multiple category elements.
   */
  category?: AtomCategory[];

  /**
   * Names one contributor to the entry. An entry may have multiple contributor elements.
   */
  contributor?: AtomContributor[];

  /**
   * Contains the time of the initial creation or first availability of the entry.
   */
  published?: Date;

  /**
   *  Conveys information about rights, e.g. copyrights, held in and over the entry.
   *  */
  rights?: AtomRights;

  /**
   *  Contains metadata from the source feed if this entry is a copy.
   *  */
  source?: AtomSource;

  "dc:language"?: {
    _: string;
    "xmlns:dc"?: string;
  };
}

export interface AtomSource {
  id: string;
  title: string;
  updated: Date;
}

export interface AtomCategory {
  /** identifies the category */
  term: string;
  /** identifies the categorization scheme via a URI. */
  scheme?: string;
  /** provides a human-readable label for display */
  label?: string;
}

/**
 * &lt;content&gt; either contains, or links to, the complete content of the entry.
 * In the most common case, the `type` attribute is either `text`, `html`, `xhtml`, in which case
 * the content element is defined identically to other text constructs, which are described here.
 * Otherwise, if the `src` attribute is present, it represents the URI of where the content can be
 * found. The `type` attribute, if present, is the media type of the content.
 * Otherwise, if the `type` attribute ends in `+xml` or `/xml`, then an XML document of this type is
 * contained inline.
 * Otherwise, if the `type` attribute starts with `text`, then an escaped document of this type is
 * contained inline.
 * Otherwise, a base64 encoded document of the indicated media type is contained inline.
 */
export interface AtomContent {
  type?: AtomTextType;
  src?: string;
  /** the value stored here should be safe, unescaped HTML that can be put anywhere */
  value: string;
}

/**
 * &lt;link&gt; is patterned after html's link element. It has one required attribute, `href`, and
 * five optional attributes: `rel`, `type`, `hreflang`, `title`, and `length`.
 */
export interface AtomLink {
  /** `href` is the URI of the referenced resource (typically a Web page) */
  href: string;
  /**
   * rel contains a single link relationship type. It can be a full URI (see extensibility), or one
   * of the following predefined values (default=`alternate`):
   * - `alternate`: an alternate representation of the entry or feed, for example a permalink to the
   *                html version of the entry, or the front page of the weblog.
   * - `enclosure`: a related resource which is potentially large and might require special
   *                handling, for example an audio or video recording.
   * - `related`: a document related to the entry or feed.
   * - `self`: the feed itself.
   * - `via`: the source of the information provided in the entry.
   */
  rel?: AtomLinkRelType;
  /** `type` indicates the media type of the resource. */
  type?: string | Record<string, string>;
  /** `hreflang` indicates the language of the referenced resource. */
  hreflang?: string;
  /** `title`, human-readable information about the link, typically for display purposes. */
  title?: string;
  /** `length`, the length of the resource, in bytes. */
  length?: string;
}

/** describes a person, corporation, or similar entity.  */
export interface AtomPerson {
  /** conveys a human-readable name for the person. */
  name: string;
  /** contains a home page for the person. */
  uri?: string;
  /** contains an email address for the person. */
  email?: string;
}

export type AtomLinkRelType =
  | "alternate"
  | "enclosure"
  | "related"
  | "self"
  | "via";

/** representation of &lt;author&gt; element */
export interface AtomAuthor extends AtomPerson {}

/** representation of &lt;contributor&gt; element */
export interface AtomContributor extends AtomPerson {}

/**
 * &lt;title&gt;, &lt;summary&gt;, &lt;content&gt;, and &lt;rights&gt; contain human-readable text, usually in small quantities. The type attribute determines how this information is encoded (default="text")
 * - If `type="text"`, then this element contains plain text with no entity escaped html.
 * - If `type="html"`, then this element contains entity escaped html.
 * - If `type="xhtml"`, then this element contains inline xhtml, wrapped in a div element.
 */
export type AtomText = string;

export type AtomTextType = "text" | "html" | "xhtml";

/** representation of &lt;title&gt; element */
export type AtomTitle = AtomText;

/** representation of &lt;summary&gt; element */
export type AtomSummary = AtomText;

/** representation of &lt;rights&gt; element */
export type AtomRights = AtomText;
