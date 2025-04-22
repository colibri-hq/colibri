import { type Relator, relatorRoles } from '$lib/parsing/contributions';
import { wrapArray } from '@colibri-hq/shared';
import { DOMParser } from 'xmldom';
import {
  cfiToElement,
  cfiToRange,
  parseCfi,
  parseCfiFromElements,
  type RegularCfi,
} from './cfi';

const NS = {
  CONTAINER: 'urn:oasis:names:tc:opendocument:xmlns:container',
  XHTML: 'http://www.w3.org/1999/xhtml',
  OPF: 'http://www.idpf.org/2007/opf',
  EPUB: 'http://www.idpf.org/2007/ops',
  DC: 'http://purl.org/dc/elements/1.1/',
  DCTERMS: 'http://purl.org/dc/terms/',
  ENC: 'http://www.w3.org/2001/04/xmlenc#',
  NCX: 'http://www.daisy.org/z3986/2005/ncx/',
  XLINK: 'http://www.w3.org/1999/xlink',
  SMIL: 'http://www.w3.org/ns/SMIL',
};
const MIME = {
  XML: 'application/xml' as DOMParserSupportedType,
  NCX: 'application/x-dtbncx+xml' as DOMParserSupportedType,
  XHTML: 'application/xhtml+xml' as DOMParserSupportedType,
  HTML: 'text/html' as DOMParserSupportedType,
  CSS: 'text/css' as DOMParserSupportedType,
  SVG: 'image/svg+xml' as DOMParserSupportedType,
  JS: /\/(x-)?(javascript|ecmascript)/,
};

// convert to camel case
function camel<T extends string>(value: T) {
  return value
    .toLowerCase()
    .replace(/[-:](.)/g, (_, g) => g.toUpperCase()) as CamelCase<T>;
}

// strip and collapse ASCII whitespace
// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
function normalizeWhitespace(value: string) {
  if (!value) {
    return '';
  }

  return value
    .replace(/[\t\n\f\r ]+/g, ' ')
    .replace(/^[\t\n\f\r ]+/, '')
    .replace(/[\t\n\f\r ]+$/, '');
}

function filterAttribute(
  attribute: string,
  value:
    | string
    | undefined
    | ((attribute: string | null) => boolean | string | undefined),
  isList?: boolean,
) {
  if (isList) {
    return (_element: Element) => {
      return typeof value === 'function'
        ? (element: Element) =>
            element
              .getAttribute(attribute)
              ?.split(/\s/)
              ?.includes(
                value(element.getAttribute(attribute))?.toString() ?? '',
              ) ?? false
        : (element: Element) =>
            element
              .getAttribute(attribute)
              ?.split(/\s/)
              ?.includes(value ?? '') ?? false;
    };
  }

  return typeof value === 'function'
    ? (element: Element) => !!value(element.getAttribute(attribute))
    : (element: Element) =>
        typeof value === 'undefined'
          ? !element.hasAttribute(attribute)
          : element.getAttribute(attribute) === value;
}

function getAttributes<K extends string>(attributes: K[]) {
  return (element: Element) =>
    attributes.reduce(
      (values, attribute) => {
        return {
          ...values,
          [camel(attribute)]: element.getAttribute(attribute),
        };
      },
      {} as Record<CamelCase<K>, string | undefined>,
    );
}

function getElementText(element: Node | undefined) {
  return normalizeWhitespace(element?.textContent ?? '');
}

function elementAccessor(document: Element | Document, namespace: string) {
  // Ignore the namespace if it doesn't appear in document at all
  const useNamespace = !!(
    document.lookupNamespaceURI(null) === namespace ||
    document.lookupPrefix(namespace)
  );
  const predicate = useNamespace
    ? (_element: Element, name: string) => (element: Element) =>
        element.namespaceURI === namespace && element.localName === name
    : (_element: Node, name: string) => (element: Element) =>
        element.localName === name;

  return {
    $: (element: Element, name: string) =>
      Array.from(element.childNodes)
        .filter(
          (element): element is Element =>
            element.nodeType === element.ELEMENT_NODE,
        )
        .find(predicate(element, name)),
    $$: (element: Element, name: string) =>
      Array.from(element.childNodes)
        .filter(
          (element): element is Element =>
            element.nodeType === element.ELEMENT_NODE,
        )
        .filter(predicate(element, name)),
    $$$: useNamespace
      ? (element: Element | Document, name: string) =>
          Array.from(element.getElementsByTagNameNS(namespace, name))
      : (element: Element | Document, name: string) =>
          Array.from(element.getElementsByTagName(name)),
  };
}

function resolveURL(uri: string | URL, relativeTo: string | URL) {
  try {
    if (relativeTo.toString().includes(':')) {
      return new URL(uri, relativeTo).toString();
    }

    // the base needs to be a valid URL, so set a base URL and then remove it
    const root = 'https://invalid.invalid/';
    const url = new URL(uri, root + relativeTo);
    url.search = '';

    return decodeURI(url.href.replace(root, ''));
  } catch (error) {
    console.warn(error);

    return uri;
  }
}

function isExternal(uri: string) {
  return /^(?!blob)\w+:/i.test(uri);
}

// like `path.relative()` in Node.js
function pathRelative(from: string | undefined, to: string) {
  if (!from) {
    return to;
  }

  const as = from.replace(/\/$/, '').split('/');
  const bs = to.replace(/\/$/, '').split('/');
  const i = (as.length > bs.length ? as : bs).findIndex(
    (_, i) => as[i] !== bs[i],
  );

  return i < 0
    ? ''
    : Array(as.length - i)
        .fill('..')
        .concat(bs.slice(i))
        .join('/');
}

function pathDirname(value: string) {
  return value.slice(0, value.lastIndexOf('/') + 1);
}

/**
 * Replace asynchronously and sequentially.
 *
 * Same technique as https://stackoverflow.com/a/48032528
 */
async function replaceSeries(
  value: string,
  regex: RegExp,
  callback: (...args: string[]) => Promise<string>,
) {
  const matches: Promise<string>[] = [];

  value.replace(regex, (full, ...args) => {
    matches.push(callback(...args));

    return full;
  });

  const results = await Promise.all(matches);

  return value.replace(regex, () => results.shift()!);
}

function regexEscape(value: string) {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const LANGS = {
  attrs: ['dir', 'xml:lang'],
} satisfies Partial<MetadataDescriptor>;
const ALTS = {
  name: 'alternate-script',
  multiple: true,
  ...LANGS,
  props: ['file-as'],
} satisfies MetadataDescriptor;
const CONTRIB = {
  multiple: true,
  ...LANGS,
  props: [{ name: 'role', multiple: true, attrs: ['scheme'] }, 'file-as', ALTS],
  setLegacyAttrs: (metadata, element) => {
    if (
      !('role' in metadata) ||
      !Array.isArray(metadata.role) ||
      !metadata.role?.length
    ) {
      const value = element.getAttributeNS(NS.OPF, 'role');

      if (value) {
        metadata.role = value;
      }
    }

    const fileAs = element.getAttributeNS(NS.OPF, 'file-as');

    if (fileAs && !metadata.fileAs) {
      metadata.fileAs = fileAs;
    }
  },
} satisfies Partial<MetadataDescriptor>;
const METADATA = [
  {
    name: 'title',
    multiple: true,
    ...LANGS,
    props: ['title-type', 'display-seq', 'file-as', ALTS],
  },
  {
    name: 'identifier',
    multiple: true,
    props: [{ name: 'identifier-type', attrs: ['scheme'] }],
    setLegacyAttrs: (obj, element) => {
      if (!obj.identifierType) {
        const value = element.getAttributeNS(NS.OPF, 'scheme');

        if (value) {
          obj.identifierType = { value };
        }
      }
    },
  },
  { name: 'language', multiple: true },
  { name: 'creator', ...CONTRIB },
  { name: 'contributor', ...CONTRIB },
  { name: 'publisher', ...LANGS, props: ['file-as', ALTS] },
  { name: 'description', ...LANGS, props: [ALTS] },
  { name: 'rights', ...LANGS, props: [ALTS] },
  { name: 'date' },
  { name: 'dcterms:modified', type: 'meta' },
  {
    name: 'subject',
    multiple: true,
    ...LANGS,
    props: ['term', 'authority', ALTS],
    setLegacyAttrs: (obj, element) => {
      const term = element.getAttributeNS(NS.OPF, 'term');

      if (term && !obj.term) {
        obj.term = term;
      }

      const authority = element.getAttributeNS(NS.OPF, 'authority');

      if (authority && !obj.authority) {
        obj.authority = authority;
      }
    },
  },
  { name: 'source', multiple: true },
  {
    name: 'belongs-to-collection',
    type: 'meta',
    multiple: true,
    ...LANGS,
    props: [
      'collection-type',
      'group-position',
      'dcterms:identifier',
      'file-as',
      ALTS,
      { name: 'belongs-to-collection', recursive: true },
    ],
  },
] satisfies MetadataDescriptor[];

const contributorLabels = {
  art: 'artist',
  aut: 'author',
  bkp: 'producer',
  clr: 'colorist',
  ctb: 'contributor',
  edt: 'editor',
  ill: 'illustrator',
  nrt: 'narrator',
  pbl: 'publisher',
  trl: 'translator',
} as const;

function getMetadata(opf: Document) {
  const { $, $$ } = elementAccessor(opf, NS.OPF);
  const $metadata = $(opf.documentElement, 'metadata')!;
  const elements = Array.from($metadata?.childNodes ?? []).filter(
    (element): element is Element => element.nodeType === element.ELEMENT_NODE,
  );

  function getValue(
    descriptor: MetadataDescriptor,
    element: Element | undefined,
  ): MetadataValue | undefined {
    if (!element) {
      return;
    }

    const { props = [], attrs = [] } = descriptor;
    const value = getElementText(element);

    if (!props.length && !attrs.length) {
      return { value };
    }

    const id = element.getAttribute('id');
    const refines = id
      ? elements.filter(filterAttribute('refines', `#${id}`))
      : [];
    const result: MetadataValue = {
      // Include the value
      value,

      // Merge all props
      ...Object.fromEntries(
        props
          .map((prop) => {
            const propertyData =
              typeof prop === 'string'
                ? ({ name: prop } as MetadataDescriptorProp)
                : prop;
            const { name, multiple, recursive } = propertyData;
            const filter = filterAttribute('property', name);
            const subObject = recursive ? descriptor : propertyData;
            const value = multiple
              ? refines
                  .filter(filter)
                  .map((element) => getValue(subObject, element))
              : getValue(subObject, refines.find(filter));

            return [camel(name), value] as const;
          })
          .filter(([, value]) => !!value),
      ),

      // Merge all attributes
      ...Object.fromEntries(
        attrs
          .map(
            (attribute) =>
              [
                camel(attribute),
                element.getAttribute(attribute) ?? undefined,
              ] as const,
          )
          .filter(([, value]) => !!value),
      ),
    };

    descriptor.setLegacyAttrs?.(result, element);

    return result;
  }

  const refinedElements = elements.filter(
    filterAttribute('refines', undefined),
  );

  const metadata = Object.fromEntries(
    METADATA.map((obj) => {
      const { type, name, multiple } = obj;
      const filter =
        type === 'meta'
          ? (element: Element) =>
              element.namespaceURI === NS.OPF &&
              element.getAttribute('property') === name
          : (element: Element) =>
              element.namespaceURI === NS.DC && element.localName === name;

      const value = multiple
        ? refinedElements.filter(filter).map((el) => getValue(obj, el))
        : getValue(obj, refinedElements.find(filter));

      return [camel(name), value] as const;
    }).filter(
      (
        metadataProperty,
      ): metadataProperty is readonly [Lowercase<string>, MetadataValue] =>
        !!metadataProperty[1],
    ),
  );

  const $$meta = $$($metadata, 'meta');

  function getMetaElementsByPrefix(prefix: string) {
    return $$meta
      .filter(
        filterAttribute(
          'property',
          (value) => value?.startsWith(prefix) ?? false,
        ),
      )
      .map(
        (element) =>
          [
            element.getAttribute('property')?.replace(prefix, ''),
            element,
          ] as const,
      )
      .filter((entry): entry is readonly [string, Element] => !!entry[0]);
  }

  const rendition = Object.fromEntries(
    getMetaElementsByPrefix('rendition:').map(
      ([key, element]) => [key, getElementText(element)] as const,
    ),
  );

  const media: MediaDescriptor = { narrator: [], duration: {} };

  for (const [key, element] of getMetaElementsByPrefix('media:')) {
    const value = getElementText(element);

    if (key === 'duration') {
      media.duration[element?.getAttribute('refines')?.split('#')?.[1] ?? ''] =
        parseClock(value) ?? 0;
    } else if (key === 'active-class') {
      media.activeClass = value;
    } else if (key === 'narrator') {
      media.narrator.push(value);
    } else if (key === 'playback-active-class') {
      media.playbackActiveClass = value;
    }
  }

  return { metadata, rendition, media };
}

function parseNav(
  document: Element | Document,
  resolve = (uri: string) => uri,
) {
  const { $, $$, $$$ } = elementAccessor(document, NS.XHTML);

  function resolveHref(href: string | undefined | undefined) {
    return href ? decodeURI(resolve(href)) : undefined;
  }

  function parseListItem(getType?: boolean) {
    return ($li: Element): NavigationEntry => {
      const $a = $($li, 'a') ?? $($li, 'span');
      const $ol = $($li, 'ol');

      // TODO: get and concat alt/title texts in content
      return {
        label: getElementText($a) ?? $a?.getAttribute('title') ?? undefined,
        href: resolveHref($a?.getAttribute('href') ?? undefined),
        subitems: parseOrderedList($ol),
        type: getType
          ? ($a?.getAttributeNS(NS.EPUB, 'type')?.split(/\s/) ?? undefined)
          : undefined,
      };
    };
  }

  function parseOrderedList($ol: Element | undefined, getType?: boolean) {
    return $ol ? $$($ol, 'li').map(parseListItem(getType)) : undefined;
  }

  function parseNav($nav: Element, getType?: boolean) {
    return parseOrderedList($($nav, 'ol'), getType);
  }

  const $$nav = $$$(document, 'nav');
  let toc: NavigationEntry[] | undefined = undefined;
  let pageList: NavigationEntry[] | undefined = undefined;
  let landmarks: NavigationEntry[] | undefined = undefined;
  const others = [];

  for (const $nav of $$nav) {
    const type = $nav.getAttributeNS(NS.EPUB, 'type')?.split(/\s/) ?? [];

    if (type.includes('toc')) {
      toc ??= parseNav($nav);
    } else if (type.includes('page-list')) {
      pageList ??= parseNav($nav);
    } else if (type.includes('landmarks')) {
      landmarks ??= parseNav($nav, true);
    } else {
      others.push({
        label: getElementText($nav.firstElementChild ?? undefined),
        type,
        list: parseNav($nav),
      });
    }
  }

  return { toc, pageList, landmarks, others };
}

function parseNCX(doc: Document, resolve = (url: string) => url) {
  const { $, $$ } = elementAccessor(doc, NS.NCX);

  function resolveHref(href?: string | undefined) {
    return href ? decodeURI(resolve(href)) : undefined;
  }

  function parseItem(element: Element): ParsedNcxItem {
    const $label = $(element, 'navLabel');
    const $content = $(element, 'content');
    const label = getElementText($label);
    const href = resolveHref($content?.getAttribute('src') ?? undefined);

    if (element.localName === 'navPoint') {
      const elements = $$(element, 'navPoint');

      return {
        label,
        href,
        subitems: elements.length > 0 ? elements.map(parseItem) : undefined,
      };
    }

    return { label, href };
  }

  function parseList(element: Element, itemName: string) {
    return $$(element, itemName).map(parseItem);
  }

  function getSingle(container: string, itemName: string) {
    const $container = $(doc.documentElement, container);

    return $container ? parseList($container, itemName) : undefined;
  }

  return {
    toc: getSingle('navMap', 'navPoint'),
    pageList: getSingle('pageList', 'pageTarget'),
    others: $$(doc.documentElement, 'navList').map((element) => ({
      label: getElementText($(element, 'navLabel')),
      list: parseList(element, 'navTarget'),
    })),
  };
}

function parseClock(value: string | undefined) {
  if (!value) {
    return;
  }

  const parts = value.split(':').map((x) => parseFloat(x));

  if (parts.length === 3) {
    const [h, m, s] = parts;

    return h * 60 * 60 + m * 60 + s;
  }

  if (parts.length === 2) {
    const [m, s] = parts;

    return m * 60 + s;
  }

  const [x, unit] = value.split(/(?=[^\d.])/);
  const n = parseFloat(x);
  const f =
    unit === 'h' ? 60 * 60 : unit === 'min' ? 60 : unit === 'ms' ? 0.001 : 1;

  return n * f;
}

type MediaOverlayEntryItem = { text: string; begin: number; end: number };

class MediaOverlay extends EventTarget {
  public book: Epub;
  public loadXml: LoadXml;

  #entries: { src: string; items: MediaOverlayEntryItem[] }[] = [];
  #lastMediaOverlayItem: ManifestItem | undefined = undefined;
  #sectionIndex: number = -1;
  #audioIndex: number = -1;
  #itemIndex: number = -1;
  #audio: HTMLAudioElement | undefined = undefined;
  #volume = 1;
  #rate = 1;

  constructor(book: Epub, loadXml: LoadXml) {
    super();
    this.book = book;
    this.loadXml = loadXml;
  }

  get #activeAudio() {
    return this.#entries[this.#audioIndex];
  }

  get #activeItem() {
    return this.#activeAudio?.items?.[this.#itemIndex];
  }

  public async start(
    sectionIndex: number,
    filter?: (
      item: MediaOverlayEntryItem,
      index: number,
      items: MediaOverlayEntryItem[],
    ) => boolean,
  ): Promise<void> {
    filter ??= () => true;

    this.#audio?.pause();
    const sections = await this.book.sections;
    const section = sections[sectionIndex];
    const href = section?.id;

    if (!href) {
      return;
    }

    const { mediaOverlay } = section;

    if (!mediaOverlay) {
      return this.start(sectionIndex + 1);
    }

    this.#sectionIndex = sectionIndex;
    await this.#loadSMIL(mediaOverlay);

    for (let i = 0; i < this.#entries.length; i++) {
      const { items } = this.#entries[i];

      for (let j = 0; j < items.length; j++) {
        if (
          items[j].text.split('#')[0] === href &&
          filter(items[j], j, items)
        ) {
          return this.#play(i, j).catch((error: unknown) => this.#error(error));
        }
      }
    }
  }

  pause() {
    this.#audio?.pause();
  }

  resume() {
    this.#audio?.play().catch((error: unknown) => this.#error(error));
  }

  prev() {
    if (this.#itemIndex > 0) {
      return this.#play(this.#audioIndex, this.#itemIndex - 1);
    }

    if (this.#audioIndex > 0) {
      return this.#play(
        this.#audioIndex - 1,
        this.#entries[this.#audioIndex - 1].items.length - 1,
      );
    }

    if (this.#sectionIndex > 0) {
      return this.start(
        this.#sectionIndex - 1,
        (_, i, items) => i === items.length - 1,
      );
    }
  }

  next() {
    return this.#play(this.#audioIndex, this.#itemIndex + 1);
  }

  setVolume(volume: number) {
    this.#volume = volume;

    if (this.#audio) {
      this.#audio.volume = volume;
    }
  }

  setRate(rate: number) {
    this.#rate = rate;

    if (this.#audio) {
      this.#audio.playbackRate = rate;
    }
  }

  async #loadSMIL(item: ManifestItem) {
    if (this.#lastMediaOverlayItem === item) {
      return;
    }

    const document = (await this.loadXml(item.href))!;

    function resolve(href: string | URL | undefined) {
      return href ? resolveURL(href, item.href) : undefined;
    }

    const { $, $$$ } = elementAccessor(document, NS.SMIL);
    this.#audioIndex = -1;
    this.#itemIndex = -1;
    this.#entries = $$$(document, 'par').reduce<
      { src: string; items: { text: string; begin: number; end: number }[] }[]
    >((items, $par) => {
      const text = resolve(
        $($par, 'text')?.getAttribute('src') ?? undefined,
      )?.toString();
      const $audio = $($par, 'audio');

      if (!text || !$audio) {
        return items;
      }

      const src = resolve($audio.getAttribute('src') ?? undefined)?.toString();
      const begin = parseClock($audio.getAttribute('clipBegin') ?? undefined)!;
      const end = parseClock($audio.getAttribute('clipEnd') ?? undefined)!;
      const last = items.at(-1)!;

      if (last?.src === src) {
        last.items.push({ text, begin, end });
      } else if (src) {
        items.push({ src, items: [{ text, begin, end }] });
      }

      return items;
    }, []);
    this.#lastMediaOverlayItem = item;
  }

  #error(error: unknown) {
    console.error(error);
    this.dispatchEvent(new CustomEvent('error', { detail: error }));
  }

  #highlight() {
    this.dispatchEvent(
      new CustomEvent('highlight', { detail: this.#activeItem }),
    );
  }

  #unhighlight() {
    this.dispatchEvent(
      new CustomEvent('unhighlight', { detail: this.#activeItem }),
    );
  }

  async #play(audioIndex: number, itemIndex: number): Promise<void> {
    if (this.#audio) {
      this.#audio.pause();
      URL.revokeObjectURL(this.#audio.src);
      this.#audio = undefined;
    }

    this.#audioIndex = audioIndex;
    this.#itemIndex = itemIndex;
    const src = this.#activeAudio?.src;

    if (!src || !this.#activeItem) {
      return this.start(this.#sectionIndex + 1);
    }

    const url = URL.createObjectURL(await this.book.loadBlob(src));
    const audio = new Audio(url);
    this.#audio = audio;

    audio.addEventListener('timeupdate', () => {
      if (audio.paused) {
        return;
      }

      const time = audio.currentTime;
      const { items } = this.#activeAudio;

      if (time > this.#activeItem?.end) {
        this.#unhighlight();

        if (this.#itemIndex === items.length - 1) {
          this.#play(this.#audioIndex + 1, 0).catch((error: unknown) =>
            this.#error(error),
          );

          return;
        }
      }

      const oldIndex = this.#itemIndex;

      while (items[this.#itemIndex + 1]?.begin <= time) {
        this.#itemIndex++;
      }

      if (this.#itemIndex !== oldIndex) {
        this.#highlight();
      }
    });
    audio.addEventListener('error', () =>
      this.#error(new Error(`Failed to load ${src}`)),
    );
    audio.addEventListener('playing', () => this.#highlight());
    audio.addEventListener('pause', () => this.#unhighlight());
    audio.addEventListener('ended', () => {
      this.#unhighlight();
      URL.revokeObjectURL(url);
      this.#audio = undefined;
      this.#play(audioIndex + 1, 0).catch((error: unknown) =>
        this.#error(error),
      );
    });
    audio.addEventListener('canplaythrough', () => {
      audio.currentTime = this.#activeItem.begin ?? 0;
      audio.volume = this.#volume;
      audio.playbackRate = this.#rate;
      audio.play().catch((e) => this.#error(e));
    });
  }
}

function getUuid(opf: Document) {
  for (const element of opf.getElementsByTagNameNS(NS.DC, 'identifier')) {
    const [id] = getElementText(element).split(':').slice(-1);

    if (
      /([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})/.test(
        id,
      )
    ) {
      return id;
    }
  }

  return '';
}

function extractMetadataValue(
  entry: MetadataValue | MetadataValue[] | undefined,
  accessor: string | ((entry: MetadataValue) => boolean) = 'value',
): string | string[] | undefined {
  if (typeof entry === 'string' || typeof entry === 'undefined') {
    return entry;
  }

  if (Array.isArray(entry)) {
    const values = entry
      .flatMap((value) => {
        const values = extractMetadataValue(value, accessor);

        return Array.isArray(values) ? values : [values];
      })
      .filter((value): value is string => typeof value !== 'undefined');

    switch (values.length) {
      case 0:
        return undefined;

      case 1:
        return values[0];

      default:
        return values;
    }
  }

  if (entry === null || typeof entry !== 'object') {
    return undefined;
  }

  if (typeof accessor === 'string') {
    return accessor in entry ? (entry[accessor] as string) : undefined;
  }

  return Object.values(entry)
    .map((value) => (Array.isArray(value) ? value[0] : value))
    .find(accessor) as string | undefined;
}

function getIdentifier(opf: Document) {
  return getElementText(
    opf.getElementById(
      opf.documentElement.getAttribute('unique-identifier')!,
    ) ?? opf.getElementsByTagNameNS(NS.DC, 'identifier')[0],
  );
}

// https://www.w3.org/publishing/epub32/epub-ocf.html#sec-resource-obfuscation
async function deobfuscate(key: Uint8Array, length: number, blob: Blob) {
  const array = new Uint8Array(await blob.slice(0, length).arrayBuffer());
  length = Math.min(length, array.length);

  for (let i = 0; i < length; i++) {
    array[i] = array[i] ^ key[i % key.length];
  }

  return new Blob([array, blob.slice(length)], { type: blob.type });
}

async function sha1Hash(value: string) {
  const data = new TextEncoder().encode(value);
  const buffer = await globalThis.crypto.subtle.digest('sha1', data);

  return new Uint8Array(buffer);
}

function deobfuscators(): Record<string, Algorithm> {
  return {
    'http://www.idpf.org/2008/embedding': {
      key: (opf) =>
        sha1Hash(
          getIdentifier(opf)
            // eslint-disable-next-line no-control-regex
            .replaceAll(/[\u0020\u0009\u000d\u000a]/g, ''),
        ),
      decode: (key, blob) => deobfuscate(key, 1040, blob),
    },
    'http://ns.adobe.com/pdf/enc#RC': {
      key: (opf) => {
        const uuid = getUuid(opf).replaceAll('-', '');

        return Uint8Array.from({ length: 16 }, (_, i) =>
          parseInt(uuid.slice(i * 2, i * 2 + 2), 16),
        );
      },
      decode: (key, blob) => deobfuscate(key, 1024, blob),
    },
  };
}

class Encryption {
  readonly #algorithms: Record<string, Algorithm>;

  #uris = new Map<string, string>();
  #decoders = new Map<string, (blob: Blob) => Blob | Promise<Blob>>();

  constructor(algorithms: Record<string, Algorithm>) {
    this.#algorithms = algorithms;
  }

  async init(encryption: Document, opf: Document) {
    const data = Array.from(
      encryption.getElementsByTagNameNS(NS.ENC, 'EncryptedData'),
      (element: Element) => ({
        algorithm: element
          .getElementsByTagNameNS(NS.ENC, 'EncryptionMethod')[0]
          ?.getAttribute('Algorithm')!,
        uri: element
          .getElementsByTagNameNS(NS.ENC, 'CipherReference')[0]
          ?.getAttribute('URI')!,
      }),
    );

    for (const { algorithm, uri } of data) {
      if (!this.#decoders.has(algorithm)) {
        const implementation = this.#algorithms[algorithm];

        if (!implementation) {
          console.warn(
            `Unknown encryption algorithm ${algorithm}: Cannot decrypt ${uri}`,
          );

          continue;
        }

        const key = await implementation.key(opf);
        this.#decoders.set(algorithm, (blob) =>
          implementation.decode(key, blob),
        );
      }

      this.#uris.set(uri, algorithm);
    }
  }

  getDecoder(uri: string) {
    const algorithm = this.#uris.get(uri);
    const decoder = algorithm ? this.#decoders.get(algorithm) : undefined;

    return decoder ?? ((value) => value);
  }
}

class Resources {
  public opf: Document;
  public manifest: ManifestItem[];
  public spine: SpineItem[];
  public pageProgressionDirection?: 'ltr' | 'rtl' | 'auto';
  public cover: ManifestItem | undefined = undefined;
  public guide: NavigationEntry[] | undefined = undefined;
  public navPath: string | undefined = undefined;
  public ncxPath: string | undefined = undefined;
  public cfis: string[] = [];

  public constructor(opf: Document, linkResolver: (href: string) => string) {
    this.opf = opf;
    const { $, $$, $$$ } = elementAccessor(opf, NS.OPF);

    const $manifest = $(opf.documentElement, 'manifest')!;
    const $spine = $(opf.documentElement, 'spine')!;
    const $$itemRef = $$($spine, 'itemref');

    this.manifest = $$($manifest, 'item')
      .map(
        getAttributes([
          'href',
          'id',
          'media-type',
          'properties',
          'media-overlay',
        ]),
      )
      .map((item) => ({
        ...item,
        mediaType:
          (item.mediaType as DOMParserSupportedType | undefined) ?? MIME.XML,
        href: linkResolver(item?.href ?? ''),
        properties: item?.properties?.split(/\s/) ?? [],
      }));

    this.spine = $$itemRef
      .map(getAttributes(['idref', 'id', 'linear', 'properties']))
      .map((item) => ({
        ...item,
        properties: item?.properties?.split(/\s/) ?? [],
      }));

    const direction = $spine!.getAttribute('page-progression-direction') as
      | 'ltr'
      | 'rtl'
      | 'auto'
      | undefined;
    this.pageProgressionDirection = direction ?? 'auto';

    this.navPath = this.getItemByProperty('nav')?.href;
    this.ncxPath = (
      this.getItemByID($spine.getAttribute('toc')!) ??
      this.manifest.find((item) => item.mediaType === MIME.NCX)
    )?.href;

    const $guide = $(opf.documentElement, 'guide');

    if ($guide) {
      this.guide = $$($guide, 'reference')
        .map(getAttributes(['type', 'title', 'href']))
        .map(({ type, title, href }) => ({
          label: title,
          type: type?.split(/\s/) ?? [],
          href: linkResolver(href ?? ''),
        }));
    }

    this.cover =
      this.getItemByProperty('cover-image') ??
      // EPUB 2 compatibility
      this.getItemByID(
        $$$(opf, 'meta')
          .find(filterAttribute('name', 'cover'))
          ?.getAttribute('content') ?? '',
      ) ??
      this.getItemByHref(
        this.guide?.find(({ type }) => type?.includes('cover'))?.href ?? '',
      );

    this.cfis = parseCfiFromElements($$itemRef);
  }

  getItemByID(id: string) {
    return this.manifest.find((item) => item.id === id);
  }

  getItemByHref(href: string) {
    return this.manifest.find((item) => item.href === href);
  }

  getItemByProperty(prop: string) {
    return this.manifest.find((item) => item.properties?.includes(prop));
  }

  resolveCfi(cfi: string) {
    const parts = parseCfi(cfi);
    const top = (Array.isArray(parts) ? parts : parts.parent).shift() ?? [];
    let $itemref = cfiToElement(this.opf, top) as Element | undefined;

    // make sure it's an idref; if not, try again without the ID assertion mainly because Epub.js
    // used to generate wrong ID assertions. See also:
    // https://github.com/futurepress/epub.js/issues/1236
    if ($itemref && $itemref.nodeName !== 'idref') {
      top.at(-1)!.id = undefined;
      $itemref = cfiToElement(this.opf, top) as Element | undefined;
    }

    const idref = $itemref?.getAttribute('idref');
    const index = this.spine.findIndex((item) => item.idref === idref);

    function anchor(doc: Document) {
      return cfiToRange(doc, parts as RegularCfi);
    }

    return { index, anchor };
  }
}

class Loader {
  public allowScript = false;
  public loadText: TextLoader;
  public loadBlob: BlobLoader;
  public manifest: ManifestItem[];

  #cache = new Map<string, string>();
  #children = new Map<string, string[]>();
  #refCount = new Map<string, number>();

  public constructor(
    loadText: TextLoader,
    loadBlob: BlobLoader,
    manifest: ManifestItem[],
  ) {
    this.loadText = loadText;
    this.loadBlob = loadBlob;
    this.manifest = manifest;
  }

  public createURL(href: string, data: BlobPart, type: string, parent: string) {
    if (!data) {
      return undefined;
    }

    const url = URL.createObjectURL(new Blob([data], { type }));
    this.#cache.set(href, url);
    this.#refCount.set(href, 1);

    if (parent) {
      const childList = this.#children.get(parent);

      if (childList) {
        childList.push(href);
      } else {
        this.#children.set(parent, [href]);
      }
    }

    return url;
  }

  public ref(href: string, parent: string) {
    const childList = this.#children.get(parent);

    if (!childList?.includes(href)) {
      this.#refCount.set(href, (this.#refCount.get(href) ?? 0) + 1);

      if (childList) {
        childList.push(href);
      } else {
        this.#children.set(parent, [href]);
      }
    }

    return this.#cache.get(href);
  }

  public unref(href: string | undefined) {
    if (!href || !this.#refCount.has(href)) {
      return;
    }

    const count = (this.#refCount.get(href) ?? 0) - 1;

    if (count < 1) {
      URL.revokeObjectURL(this.#cache.get(href) ?? '');
      this.#cache.delete(href);
      this.#refCount.delete(href);

      // unref children
      const childList = this.#children.get(href);

      if (childList) {
        while (childList.length) {
          this.unref(childList.pop());
        }
      }

      this.#children.delete(href);
    } else {
      this.#refCount.set(href, count);
    }
  }

  /**
   * Load manifest item, recursively loading all resources as needed.
   */
  async loadItem(item: ManifestItem | undefined, parents: string[] = []) {
    if (!item) {
      return undefined;
    }

    const { href, mediaType } = item;
    const isScript = MIME.JS.test(mediaType);

    if (isScript && !this.allowScript) {
      return undefined;
    }

    const parent = parents.at(-1) ?? '';

    if (this.#cache.has(href)) {
      return this.ref(href, parent);
    }

    if (
      (isScript ||
        [MIME.XHTML, MIME.HTML, MIME.CSS, MIME.SVG].includes(mediaType)) &&
      // prevent circular references
      parents.every((parent) => parent !== href)
    ) {
      return this.loadReplaced(item, parents);
    }

    return this.createURL(href, await this.loadBlob(href), mediaType, parent);
  }

  async loadHref(href: string, base: string, parents: string[] = []) {
    if (isExternal(href)) {
      return href;
    }

    const path = resolveURL(href, base);
    const item = this.manifest.find(({ href }) => href === path);

    if (!item) {
      return href;
    }

    return this.loadItem(item, parents.concat(base));
  }

  async loadReplaced(item: ManifestItem, parents: string[] = []) {
    const { href, mediaType = '' as DOMParserSupportedType } = item;
    const parent = parents.at(-1) ?? '';
    const value = await this.loadText(href);

    if (!value) {
      return undefined;
    }

    // note that one can also just use `replaceString` for everything:
    // ```
    // const replaced = await this.replaceString(str, href, parents)
    // return this.createURL(href, replaced, mediaType, parent)
    // ```
    // which is basically what Epub.js does, which is simpler, but will
    // break things like iframes (because you don't want to replace links)
    // or text that just happen to be paths

    // parse and replace in HTML
    if (mediaType && [MIME.XHTML, MIME.HTML, MIME.SVG].includes(mediaType)) {
      let document = new DOMParser().parseFromString(value, mediaType);

      // change to HTML if it's not valid XHTML
      if (
        mediaType === MIME.XHTML &&
        document.getElementsByTagName('parsererror').length > 0
      ) {
        const parserError =
          document.getElementsByTagName('parsererror')[0]?.textContent;
        console.warn(`Could not parse XHTML: ${parserError}`);

        item.mediaType = MIME.HTML;
        document = new DOMParser().parseFromString(value, item.mediaType!);
      }

      // Replace HREFs in XML processing instructions. This is mainly for SVGs that
      // use xml-stylesheet.
      if ([MIME.XHTML, MIME.SVG].includes(item.mediaType!)) {
        let child = document.firstChild;

        while (child instanceof ProcessingInstruction) {
          if (child.data) {
            const replacedData = await replaceSeries(
              child.data,
              /(?:^|\s*)(href\s*=\s*['"])([^'"]*)(['"])/i,
              (_, p1, p2, p3) =>
                this.loadHref(p2, href, parents).then(
                  (p2) => `${p1}${p2}${p3}`,
                ),
            );

            child.replaceWith(
              document.createProcessingInstruction(child.target, replacedData),
            );
          }

          child = child.nextSibling;
        }
      }

      // replace hrefs (excluding anchors)
      // TODO: srcset?
      const replace = async (element: Element, attribute: string) => {
        const uri = element.getAttribute(attribute) ?? '';
        const value = (await this.loadHref(uri, href, parents)) ?? '';

        return element.setAttribute(attribute, value);
      };

      await Promise.all([
        ...Array.from(document.querySelectorAll('link[href]')).map(
          async (element) => replace(element, 'href'),
        ),
        ...Array.from(document.querySelectorAll('[src]')).map(async (element) =>
          replace(element, 'src'),
        ),
        ...Array.from(document.querySelectorAll('[poster]')).map(
          async (element) => replace(element, 'poster'),
        ),
        ...Array.from(document.querySelectorAll('object[data]')).map(
          async (element) => replace(element, 'data'),
        ),
      ]);

      for (const element of document.querySelectorAll('[*|href]:not([href])')) {
        const link = element.getAttributeNS(NS.XLINK, 'href') ?? '';
        const namespace = (await this.loadHref(link, href, parents)) ?? '';

        element.setAttributeNS(NS.XLINK, 'href', namespace);
      }

      // replace inline styles
      await Promise.all([
        ...Array.from(document.getElementsByTagName('style')).map(
          async (element) => {
            if (element.textContent) {
              element.textContent = await this.replaceCSS(
                element.textContent,
                href,
                parents,
              );
            }
          },
        ),

        ...Array.from(document.querySelectorAll('[style]')).map(
          async (element) => {
            const styles = element.getAttribute('style');

            if (!styles) {
              return;
            }

            element.setAttribute(
              'style',
              await this.replaceCSS(styles, href, parents),
            );
          },
        ),
      ]);

      // TODO: replace inline scripts? probably not worth the trouble
      const result = new XMLSerializer().serializeToString(document);

      return this.createURL(href, result, item.mediaType, parent);
    }

    const result =
      mediaType === MIME.CSS
        ? await this.replaceCSS(value, href, parents)
        : await this.replaceString(value, href, parents);

    return this.createURL(href, result, mediaType, parent);
  }

  async replaceCSS(value: string, href: string, parents: string[] = []) {
    const replacedUrls = await replaceSeries(
      value,
      /url\(\s*["']?([^'"\n]*?)\s*["']?\s*\)/gi,
      (_, url) =>
        this.loadHref(url, href, parents).then((url) => `url("${url}")`),
    );
    // apart from `url()`, strings can be used for `@import` (but why?!)
    const replacedImports = await replaceSeries(
      replacedUrls,
      /@import\s*["']([^"'\n]*?)["']/gi,
      (_, url) =>
        this.loadHref(url, href, parents).then((url) => `@import "${url}"`),
    );
    const width = window?.innerWidth ?? 800;
    const height = window?.innerHeight ?? 600;

    return (
      replacedImports
        // un-prefix as most of the props are (only) supported unprefixed
        .replace(/(?<=[{\s;])-epub-/gi, '')
        // replace vw and vh as they cause problems with layout
        .replace(
          /(\d*\.?\d+)vw/gi,
          (_, d) => (parseFloat(d) * width) / 100 + 'px',
        )
        .replace(
          /(\d*\.?\d+)vh/gi,
          (_, d) => (parseFloat(d) * height) / 100 + 'px',
        )
        // `page-break-*` unsupported in columns; replace with `column-break-*`
        .replace(
          /page-break-(after|before|inside)\s*:/gi,
          (_, x) => `-webkit-column-break-${x}:`,
        )
        .replace(
          /break-(after|before|inside)\s*:\s*(avoid-)?page/gi,
          (_, x, y) => `break-${x}: ${y ?? ''}column`,
        )
    );
  }

  /**
   * Find & replace all possible relative paths for all assets without parsing.
   */
  replaceString(
    value: string,
    href: string,
    parents: string[] = [],
  ): Promise<string> {
    const assetMap = new Map();
    const urls = this.manifest
      .map((asset) => {
        // do not replace references to the file itself
        if (asset.href === href) {
          return;
        }

        // href was decoded and resolved when parsing the manifest
        const relative = pathRelative(pathDirname(href), asset.href);
        const relativeEnc = encodeURI(relative);
        const rootRelative = '/' + asset.href;
        const rootRelativeEnc = encodeURI(rootRelative);
        const set = new Set([
          relative,
          relativeEnc,
          rootRelative,
          rootRelativeEnc,
        ]);

        for (const url of set) {
          assetMap.set(url, asset);
        }

        return Array.from(set);
      })
      .flat()
      .filter((value): value is string => !!value);

    if (!urls.length) {
      return Promise.resolve(value);
    }

    const regex = new RegExp(urls.map(regexEscape).join('|'), 'g');

    return replaceSeries(value, regex, async (match) => {
      const item = await this.loadItem(
        assetMap.get(match.replace(/^\//, ''))!,
        parents.concat(href),
      );

      return item ?? '';
    });
  }

  unloadItem(item: ManifestItem) {
    this.unref(item?.href);
  }

  destroy() {
    for (const url of this.#cache.values()) {
      URL.revokeObjectURL(url);
    }
  }
}

function getHTMLFragment(document_: Document, id: string) {
  return (
    document_.getElementById(id) ??
    document_.querySelector(`[name="${CSS.escape(id)}"]`)
  );
}

function getPageSpread(properties: string[]) {
  for (const property of properties) {
    if (['page-spread-left', 'rendition:page-spread-left'].includes(property)) {
      return 'left';
    }

    if (
      ['page-spread-right', 'rendition:page-spread-right'].includes(property)
    ) {
      return 'right';
    }

    if (property === 'rendition:page-spread-center') {
      return 'center';
    }
  }
}

function getDisplayOptions(document: Document | undefined) {
  if (!document) {
    return undefined;
  }

  return {
    fixedLayout: getElementText(
      document.querySelector('option[name="fixed-layout"]')!,
    ),
    openToSpread: getElementText(
      document.querySelector('option[name="open-to-spread"]')!,
    ),
  };
}

export class Epub {
  public readonly loadText: TextLoader;
  public readonly loadBlob: BlobLoader;
  public readonly getSize: (href: string) => number;
  public toc: ParsedNcxItem[] | undefined;
  public pageList: ParsedNcxItem[] | undefined;
  public landmarks: NavigationEntry[] | undefined;
  public rendition: Record<string, string> | undefined;
  public media: MediaDescriptor | undefined;
  public direction: 'ltr' | 'rtl' | 'auto' | undefined;
  readonly #encryption: Encryption;
  readonly #parser = new DOMParser();
  #resources: Resources | undefined;
  #metadata: Partial<BookMetadata> | undefined = undefined;
  #sections: SectionItem[] | undefined = undefined;
  #loader: Loader | undefined;

  constructor(
    loadBlob: BlobLoader,
    loadText: TextLoader,
    getSize: (href: string) => number,
  ) {
    this.loadText = cached(loadText, new Map());
    this.loadBlob = cached(loadBlob, new Map());
    this.getSize = getSize;

    this.#encryption = new Encryption(deobfuscators());
  }

  get loader() {
    return new Promise<Loader>(async (resolve) => {
      if (!this.#loader) {
        const { manifest } = await this.resources;
        this.#loader = new Loader(
          this.loadText,
          async (uri) => {
            const blob = await this.loadBlob(uri);
            const decoder = this.#encryption.getDecoder(uri);

            return decoder(blob);
          },
          manifest,
        );
      }

      resolve(this.#loader);
    });
  }

  get resources() {
    return new Promise<Resources>(async (resolve) => {
      if (!this.#resources) {
        this.#resources = await this.#loadResources();
      }

      resolve(this.#resources);
    });
  }

  get metadata() {
    return new Promise<Partial<BookMetadata>>(async (resolve) => {
      if (!this.#metadata) {
        const resources = await this.resources;
        this.#metadata = this.#loadMetadata(resources);
      }

      resolve(this.#metadata);
    });
  }

  get sections() {
    return new Promise<SectionItem[]>(async (resolve) => {
      if (!this.#sections) {
        const resources = await this.resources;
        const loader = await this.loader;

        this.#sections = this.#loadSections(resources, loader);
      }

      return resolve(this.#sections);
    });
  }

  async initialize() {
    const resources = await this.resources;
    const { navPath, ncxPath } = resources;

    if (navPath) {
      const document = (await this.#loadXml(navPath))!;

      try {
        const { landmarks, pageList, toc } = parseNav(
          document,
          (url: string | URL) => resolveURL(url, navPath).toString(),
        );
        this.toc = toc;
        this.pageList = pageList;
        this.landmarks = landmarks;
      } catch (error) {
        console.warn(error);
      }
    }

    if (!this.toc && ncxPath) {
      const document = (await this.#loadXml(ncxPath))!;

      try {
        const { pageList, toc } = parseNCX(document, (url) =>
          resolveURL(url, ncxPath).toString(),
        );

        this.toc = toc;
        this.pageList = pageList;
      } catch (error: unknown) {
        console.warn(`Failed to parse NCX: ${error}`);
      }
    }

    this.landmarks ??= resources.guide;

    const { rendition, media } = getMetadata(resources.opf);

    this.rendition = rendition;
    this.media = media;
    this.direction = resources.pageProgressionDirection;

    const displayOptions = await this.#resolveDisplayOptions();

    if (displayOptions) {
      if (displayOptions.fixedLayout === 'true') {
        this.rendition.layout ??= 'pre-paginated';
      }

      if (displayOptions.openToSpread === 'false') {
        const sections = await this.sections;
        const section = sections.find((section) => section.linear !== 'no');

        if (section) {
          section.pageSpread ??= this.direction === 'rtl' ? 'left' : 'right';
        }
      }
    }

    return this;
  }

  async loadDocument(item: ManifestItem) {
    const str = await this.loadText(item.href);
    return this.#parser.parseFromString(str, item.mediaType);
  }

  getMediaOverlay() {
    return new MediaOverlay(this, this.#loadXml.bind(this));
  }

  resolveCFI(cfi: string) {
    return this.#resources!.resolveCfi(cfi);
  }

  resolveHref(href: string) {
    const [path, hash] = href.split('#');
    const item = this.#resources!.getItemByHref(decodeURI(path));

    if (!item) {
      return undefined;
    }

    const index = this.#resources!.spine.findIndex(
      (spineItem) => 'idref' in spineItem && spineItem.idref === item.id,
    );
    const anchor = hash
      ? (document: Document) => getHTMLFragment(document, hash)
      : () => 0;

    return { index, anchor };
  }

  splitTocHref(href: string | undefined) {
    return href?.split('#') ?? [];
  }

  getTocFragment(document: Document, id: string) {
    return (
      document.getElementById(id) ??
      document.querySelector(`[name="${CSS.escape(id)}"]`)
    );
  }

  isExternal(uri: string) {
    return isExternal(uri);
  }

  async getCover() {
    const cover = this.#resources?.cover;
    return cover?.href
      ? new Blob([await this.loadBlob(cover.href)], { type: cover.mediaType })
      : undefined;
  }

  async getCalibreBookmarks() {
    const txt = await this.loadText('META-INF/calibre_bookmarks.txt');
    const magic = 'encoding=json+base64:';
    if (txt?.startsWith(magic)) {
      const json = atob(txt.slice(magic.length));

      return JSON.parse(json);
    }
  }

  async destroy() {
    (await this.loader).destroy();
  }

  async #resolveDisplayOptions() {
    let document: Document | undefined;

    try {
      document = await this.#loadXml(
        'META-INF/com.apple.ibooks.display-options.xml',
      );

      if (!document) {
        document = await this.#loadXml(
          'META-INF/com.kobobooks.display-options.xml',
        );
      }
    } catch {
      // No-op
    }

    return document ? getDisplayOptions(document) : undefined;
  }

  async #loadResources() {
    const $container = await this.#loadXml('META-INF/container.xml');

    if (!$container) {
      throw new Error('Failed to load container file');
    }

    const opfs = Array.from(
      $container.getElementsByTagNameNS(NS.CONTAINER, 'rootfile'),
      getAttributes(['full-path', 'media-type']),
    ).filter(
      (
        file,
      ): file is {
        fullPath: string | undefined;
        mediaType: 'application/oebps-package+xml';
      } => file && file.mediaType === 'application/oebps-package+xml',
    );

    if (!opfs.length) {
      throw new Error('No package document defined in container');
    }

    const opfPath = opfs[0].fullPath;

    if (!opfPath) {
      throw new Error('Failed to load package document: Missing path');
    }

    const opf = await this.#loadXml(opfPath);

    if (!opf) {
      throw new Error('Failed to load package document');
    }

    let $encryption: Document | undefined;

    try {
      $encryption = await this.#loadXml('META-INF/encryption.xml');
    } catch {
      $encryption = undefined;
    }

    if ($encryption) {
      await this.#encryption.init($encryption, opf);
    }

    return new Resources(opf, (url) => resolveURL(url, opfPath).toString());
  }

  #loadSections(resources: Resources, loader: Loader) {
    return resources.spine
      .filter(
        (spineItem): spineItem is SpineItem & { idref: string } =>
          !!spineItem.idref,
      )
      .map(({ idref, linear, properties }, index) => {
        const item = resources.getItemByID(idref);

        if (!item) {
          console.warn(`Could not find item with ID "${idref}" in manifest`);

          return;
        }

        return {
          id: item.href,
          load: () => loader.loadItem(item),
          unload: () => loader.unloadItem(item),
          createDocument: () => this.loadDocument(item),
          size: this.getSize(item.href),
          cfi: this.#resources!.cfis[index],
          linear: linear ?? undefined,
          pageSpread: getPageSpread(properties ?? []),
          resolveHref: (href: string) => resolveURL(href, item.href),
          mediaOverlay: item.mediaOverlay
            ? this.#resources!.getItemByID(item.mediaOverlay)
            : undefined,
        } satisfies SectionItem;
      })
      .filter((section): section is SectionItem => !!section);
  }

  #loadMetadata(resources: Resources) {
    const { metadata: documentMetadata } = getMetadata(resources.opf);
    const titleValues = wrapArray(documentMetadata?.title ?? []);

    const metadata: Partial<BookMetadata> = {
      title: extractMetadataValue(titleValues),
      subtitle: wrapArray(
        extractMetadataValue(
          titleValues,
          (title) =>
            !!(
              title &&
              typeof title !== 'string' &&
              'titleType' in title &&
              title.titleType === 'subtitle'
            ),
        ),
      ).shift(),
      sortAs: wrapArray(extractMetadataValue(titleValues, 'fileAs')).shift(),
      language: extractMetadataValue(documentMetadata?.language),
      identifier: getIdentifier(resources.opf),
      description: wrapArray(
        extractMetadataValue(documentMetadata?.description),
      ).shift(),
      publisher: wrapArray(extractMetadataValue(documentMetadata?.publisher))
        .filter((publisher): publisher is string => !!publisher)
        .map(
          (publisher): ContributorMetadata => ({
            name: publisher,
            roles: ['bkp'],
            fileAs: publisher,
            sortAs: publisher,
          }),
        )
        .shift(),
      published: extractMetadataValue(documentMetadata?.date),
      modified: extractMetadataValue(documentMetadata?.dctermsModified),
      subject: wrapArray(documentMetadata?.subject ?? [])
        ?.filter(
          (
            subject,
          ): subject is
            | { value: string; term?: string; authority?: string }
            | { value?: string; term: string; authority?: string } =>
            !!(
              typeof subject !== 'string' &&
              ('term' in subject || 'value' in subject) &&
              (subject.term || subject.value)
            ),
        )
        ?.map(({ value, term, authority }) => ({
          name: value ?? term ?? '',
          term,
          authority,
        })),
      rights: extractMetadataValue(documentMetadata?.rights) as
        | string
        | undefined,
    };

    function mapContributor(this: void, defaultRole: Relator) {
      return (item: MetadataValue) => {
        if (typeof item === 'string' || Array.isArray(item)) {
          return;
        }

        const value = item.value;
        const fileAs = item.fileAs ?? value;
        const roles = [
          ...new Set(
            wrapArray(item.role)
              .map((value) =>
                typeof value === 'string'
                  ? { value }
                  : (value as { value: string; scheme?: string }),
              )
              .filter(
                (role): role is { value: Relator } =>
                  (!role.scheme || role.scheme === 'marc:relators') &&
                  relatorRoles.includes(role.value as Relator),
              )
              .map(({ value }) => value),
          ),
        ];

        return {
          name: value as string,
          roles: roles?.length > 0 ? roles : [defaultRole],
          sortAs: fileAs as string,
        };
      };
    }

    const authors = wrapArray(documentMetadata?.creator ?? []).map(
      mapContributor('aut'),
    );
    const contributors = wrapArray(documentMetadata?.contributor ?? []).map(
      mapContributor('ctb'),
    );
    metadata.contributors = [...authors, ...contributors].filter(
      (item): item is ContributorMetadata => !!item,
    );

    return metadata;
  }

  async #loadXml(uri: string) {
    const plainText = await this.loadText(uri);

    if (!plainText) {
      return undefined;
    }

    const document = this.#parser.parseFromString(plainText, MIME.XML);

    if (document.getElementsByTagName('parsererror').length > 0) {
      const error =
        document.getElementsByTagName('parsererror')[0]?.textContent;

      throw new Error(`XML parsing error: ${uri}\n${error ?? 'Unknown error'}`);
    }

    return document;
  }
}

type IsGap<T extends string> = Uppercase<T> extends Lowercase<T> ? true : false;
type CamelCase<S extends string> =
  S extends Lowercase<S>
    ? S extends `${infer F}-${infer RF}${infer R}`
      ? RF extends '-'
        ? `${F}-${CamelCase<`-${R}`>}`
        : `${F}${IsGap<RF> extends true ? `-${RF}` : Uppercase<RF>}${CamelCase<R>}`
      : S
    : CamelCase<Lowercase<S>>;

type MetadataDescriptor = {
  multiple?: boolean;
  name: string;
  setLegacyAttrs?: (
    obj: Extract<MetadataValue, Record<string, unknown>>,
    element: Element,
  ) => void;
  attrs?: string[];
  props?: (string | MetadataDescriptorProp)[];
  type?: string;
};
type MetadataDescriptorProp = {
  name: string;
  recursive?: boolean;
  multiple?: boolean;
  attrs?: string[];
};
type MetadataValue = { [key: string]: MetadataValue } | string | string[];

type LoadXml = (href: string) => Promise<Document | undefined>;

type Decoder = (key: Uint8Array, blob: Blob) => Blob | Promise<Blob>;
type Algorithm = {
  key: (opf: Document) => Promise<Uint8Array> | Uint8Array;
  decode: Decoder;
};

type ManifestItem = {
  href: string;
  properties: string[];
  mediaType: DOMParserSupportedType;
  id?: string | undefined;
  mediaOverlay?: string | undefined;
};

type SpineItem = {
  idref?: string | undefined;
  id?: string | undefined;
  linear?: string | undefined;
  properties: string[];
};

type SectionItem = {
  cfi: any;
  createDocument: () => Promise<Document>;
  id: string;
  linear: string | undefined;
  load: () => Promise<string | undefined>;
  mediaOverlay: ManifestItem | undefined;
  pageSpread: string | undefined;
  resolveHref: (href: string) => string | URL;
  size: number;
  unload: () => void;
};

type TextLoader = (href: string) => Promise<string>;
type BlobLoader = (href: string) => Promise<Blob>;

type ParsedNcxItem = {
  label: string | undefined;
  href: string | undefined;
  subitems?: ParsedNcxItem[] | undefined;
};

type NavigationEntry = {
  label: string | undefined;
  href: string | undefined;
  subitems?: NavigationEntry[] | undefined;
  type?: string[] | undefined;
};

type MediaDescriptor = {
  narrator: string[];
  duration: Record<string, number>;
  activeClass?: string;
  playbackActiveClass?: string;
};

type ContributorMetadata = {
  roles: Relator[];
  fileAs: string;
  sortAs: string;
  name: string;
};

type BookMetadata = {
  title: string | string[] | undefined;
  subtitle: string | undefined;
  sortAs: string | undefined;
  language: string | string[] | undefined;
  identifier: string | string[] | undefined;
  description: string | undefined;
  publisher: ContributorMetadata | undefined;
  published: string | string[] | undefined;
  modified: string | string[] | undefined;
  subject:
    | {
        name: string;
        term?: string | undefined;
        authority?: string | undefined;
      }[]
    | undefined;
  rights: string | undefined;
  contributors: ContributorMetadata[] | undefined;
};

type RelatorRoleSpec = Relator | { value: Relator; scheme?: string };

function cached<T>(
  resolver: (href: string) => Promise<T>,
  cache: Map<string, T>,
) {
  return async (href: string) => {
    if (!cache.has(href)) {
      cache.set(href, await resolver(href));
    }

    return cache.get(href) as T;
  };
}
