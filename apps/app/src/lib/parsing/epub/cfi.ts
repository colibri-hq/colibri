function findIndices<T>(
  items: T[],
  callback: (value: T, index: number, items: T[]) => boolean,
) {
  return items
    .map((value, index, items) =>
      callback(value, index, items) ? index : null,
    )
    .filter((value): value is number => value !== null);
}

function splitAt<T>(items: T[], indices: number[]) {
  return [-1, ...indices, items.length].reduce<{ values?: T[][]; a?: number }>(
    ({ values, a }, b) => ({
      values: values?.concat([items.slice((a ?? 0) + 1, b)]) ?? [],
      a: b,
    }),
    {},
  ).values;
}

function concatArrays<T>(a: T[][], b: T[][]) {
  return a
    .slice(0, -1)
    .concat([a[a.length - 1].concat(b[0])])
    .concat(b.slice(1));
}

const isNumber = /\d/;
export const isCFI = /^epubcfi\((.*)\)$/;

function escapeCFI(value: string) {
  return value.replace(/[\^[\](),;=]/g, '^$&');
}

function wrap(value: string) {
  return isCFI.test(value) ? value : `epubcfi(${value})`;
}

function unwrap(value: string) {
  return value.match(isCFI)?.[1] ?? value;
}

function lift(callback: (...values: string[]) => string) {
  return (values: string[]) => {
    const cfi = callback(...values.map((x) => x.match(isCFI)?.[1] ?? x));

    return `epubcfi(${cfi})`;
  };
}

export const joinIndirect = lift((...values: string[]) => values.join('!'));

function tokenize(input: string) {
  const tokens: (string | number)[][] = [];
  let state: string | null = null;
  let escape = false;
  let value = '';

  function push(newTokens: (string | number)[]) {
    state = null;
    value = '';

    return tokens.push(newTokens);
  }

  function cat(token: string) {
    escape = false;

    return (value += token);
  }

  for (const character of Array.from(input.trim()).concat('')) {
    if (character === '^' && !escape) {
      escape = true;

      continue;
    }

    if (state === '!') {
      push(['!']);
    } else if (state === ',') {
      push([',']);
    } else if (state === '/' || state === ':') {
      if (isNumber.test(character)) {
        cat(character);

        continue;
      }

      push([state, parseInt(value)]);
    } else if (state === '~') {
      if (isNumber.test(character) || character === '.') {
        cat(character);

        continue;
      }

      push(['~', parseFloat(value)]);
    } else if (state === '@') {
      if (character === ':') {
        push(['@', parseFloat(value)]);
        state = '@';

        continue;
      }

      if (isNumber.test(character) || character === '.') {
        cat(character);

        continue;
      }

      push(['@', parseFloat(value)]);
    } else if (state === '[') {
      if (character === ';' && !escape) {
        push(['[', value]);
        state = ';';
      } else if (character === ',' && !escape) {
        push(['[', value]);
        state = '[';
      } else if (character === ']' && !escape) {
        push(['[', value]);
      } else {
        cat(character);
      }

      continue;
    }

    if (state?.startsWith(';')) {
      if (character === '=' && !escape) {
        state = `;${value}`;
        value = '';
      } else if (character === ';' && !escape) {
        push([state, value]);
        state = ';';
      } else if (character === ']' && !escape) {
        push([state, value]);
      } else {
        cat(character);
      }

      continue;
    }

    if ([',', '/', ':', '~', '@', '[', ';', ']', '!'].includes(character)) {
      state = character;
    }
  }

  return tokens;
}

function findTokens(tokens: (string | number)[][], value: string | number) {
  return findIndices(tokens, ([token]) => token === value);
}

type Part = {
  index: number;
  id?: string | undefined;
  offset?: number;
  temporal?: number;
  spatial?: number[];
  text?: string[];
  side?: number;
};
export type RegularCfi = Part[][];
export type RangeCfi = {
  parent: RegularCfi;
  start: RegularCfi;
  end: RegularCfi;
};

export type Cfi = RegularCfi | RangeCfi;

function parse(tokens: (string | number)[][]) {
  const parts: Part[] = [];
  let state: string | undefined = undefined;

  for (const [type, val] of tokens) {
    if (type === '/') {
      parts.push({ index: Number(val) });
    } else {
      const last = parts[parts.length - 1];

      if (type === ':') {
        last.offset = Number(val);
      } else if (type === '~') {
        last.temporal = Number(val);
      } else if (type === '@') {
        last.spatial = (last.spatial ?? []).concat(Number(val));
      } else if (type === ';s') {
        last.side = Number(val);
      } else if (type === '[') {
        if (state !== '/' || !val) {
          last.text = (last.text ?? []).concat(val.toString());

          continue;
        }

        last.id = val.toString();
      }
    }

    state = type.toString();
  }

  return parts;
}

// split at step indirections, then parse each part
function parseIndirect(tokens: (string | number)[][]) {
  return splitAt(tokens, findTokens(tokens, '!'))?.map(parse) ?? [];
}

export function parseCfi(cfi: string): Cfi {
  const tokens = tokenize(unwrap(cfi));
  const commas = findTokens(tokens, ',');

  if (!commas.length) {
    return parseIndirect(tokens);
  }

  const [parent, start, end] = splitAt(tokens, commas)!.map(parseIndirect);

  return { parent, start, end };
}

function partToString({
  index,
  id,
  offset,
  temporal,
  spatial,
  text,
  side,
}: Part) {
  const param = side ? `;s=${side}` : '';

  return (
    `/${index}` +
    (id ? `[${escapeCFI(id)}${param}]` : '') +
    // "CFI expressions […] SHOULD include an explicit character offset"
    (offset != null && index % 2 ? `:${offset}` : '') +
    (temporal ? `~${temporal}` : '') +
    (spatial ? `@${spatial.join(':')}` : '') +
    (text || (!id && side)
      ? '[' + (text?.map(escapeCFI)?.join(',') ?? '') + param + ']'
      : '')
  );
}

function toInnerString(parsed: Cfi): string {
  return !Array.isArray(parsed)
    ? [parsed.parent, parsed.start, parsed.end].map(toInnerString).join(',')
    : parsed.map((parts: Part[]) => parts.map(partToString).join('')).join('!');
}

function toString(parsed: Cfi) {
  return wrap(toInnerString(parsed));
}

export function collapse(value: string, toEnd?: boolean): string;
export function collapse(value: Cfi, toEnd?: boolean): RegularCfi;
export function collapse(value: Part[], toEnd?: boolean): Part[];
export function collapse(
  value: string | Cfi | Part[],
  toEnd?: boolean,
): RegularCfi | Part[] | string {
  if (typeof value === 'string') {
    return toString(collapse(parseCfi(value), toEnd));
  }

  return Array.isArray(value)
    ? value
    : concatArrays(value.parent, value[toEnd ? 'end' : 'start']);
}

// create range CFI from two CFIs
function buildRange(from: string | Cfi, to: string | Cfi) {
  if (typeof from === 'string') {
    from = parseCfi(from);
  }

  if (typeof to === 'string') {
    to = parseCfi(to);
  }

  from = collapse(from);
  to = collapse(to, true);

  // ranges across multiple documents are not allowed; handle local paths only
  const localFrom = from[from.length - 1];
  const localTo = to[to.length - 1];
  const localParent: Part[] = [];
  const localStart: Part[] = [];
  const localEnd: Part[] = [];

  const length = Math.max(localFrom.length, localTo.length);
  let pushToParent = true;

  for (let i = 0; i < length; i++) {
    const a = localFrom[i];
    const b = localTo[i];

    pushToParent &&= a?.index === b?.index && !a?.offset && !b?.offset;

    if (pushToParent) {
      localParent.push(a);

      continue;
    }

    if (a) {
      localStart.push(a);
    }

    if (b) {
      localEnd.push(b);
    }
  }

  // copy non-local paths from `from`
  const parent = from.slice(0, -1).concat([localParent]);

  return toString({ parent, start: [localStart], end: [localEnd] });
}

export function compare(a: string | Cfi, b: string | Cfi): -1 | 0 | 1 {
  if (typeof a === 'string') {
    a = parseCfi(a);
  }

  if (typeof b === 'string') {
    b = parseCfi(b);
  }

  if (!Array.isArray(a) || !Array.isArray(b)) {
    return (
      compare(collapse(a), collapse(b)) ||
      compare(collapse(a, true), collapse(b, true))
    );
  }

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const p = a[i];
    const q = b[i];
    const maxIndex = Math.max(p.length, q.length) - 1;

    for (let i = 0; i <= maxIndex; i++) {
      const x = p[i];
      const y = q[i];

      if (!x) {
        return -1;
      }

      if (!y) {
        return 1;
      }

      if (x.index > y.index) {
        return 1;
      }

      if (x.index < y.index) {
        return -1;
      }

      if (i === maxIndex) {
        // TODO: compare temporal & spatial offsets
        if ((x.offset ?? 0) > (y.offset ?? 0)) {
          return 1;
        }

        if ((x.offset ?? 0) < (y.offset ?? 0)) {
          return -1;
        }
      }
    }
  }

  return 0;
}

function isTextNode({ nodeType }: Node) {
  return nodeType === 3 || nodeType === 4;
}

function isElementNode({ nodeType }: Node) {
  return nodeType === 1;
}

function getChildNodes(node: Node, filter?: NodeFilter): Node[] {
  // "content other than element and character data is ignored"
  const nodes = Array.from(node.childNodes).filter(
    (node) => isTextNode(node) || isElementNode(node),
  );

  return filter
    ? nodes
        .map((node) => {
          const accept =
            typeof filter === 'function'
              ? filter(node)
              : filter.acceptNode(node);

          if (accept === NodeFilter.FILTER_REJECT) {
            return null;
          }

          if (accept === NodeFilter.FILTER_SKIP) {
            return getChildNodes(node, filter);
          }

          return node;
        })
        .flat()
        .filter((node): node is Node => !!node)
    : nodes;
}

// child nodes are organized such that the result is always
//     [element, text, element, text, ..., element],
// regardless of the actual structure in the document;
// so multiple text nodes need to be combined, and nonexistent ones counted;

// see "Step Reference to Child Element or Character Data (/)" in EPUB CFI spec
function indexChildNodes(node: Node, filter?: NodeFilter) {
  const nodes = getChildNodes(node, filter).reduce<
    (Node | Node[] | null | 'first' | 'last' | 'before' | 'after')[]
  >((nodes, node) => {
    const last = nodes[nodes.length - 1];

    if (!last) {
      nodes.push(node);
    }

    // "there is one chunk between each pair of child elements"
    else if (isTextNode(node)) {
      if (Array.isArray(last)) {
        last.push(node);
      } else if (typeof last === 'object' && isTextNode(last)) {
        nodes[nodes.length - 1] = [last, node];
      } else {
        nodes.push(node);
      }
    } else {
      if (
        typeof last === 'object' &&
        !Array.isArray(last) &&
        isElementNode(last)
      ) {
        nodes.push(null, node);
      } else {
        nodes.push(node);
      }
    }

    return nodes;
  }, []);

  // "the first chunk is located before the first child element"
  const firstNode = nodes[0];

  if (
    typeof firstNode === 'object' &&
    !Array.isArray(firstNode) &&
    firstNode !== null &&
    isElementNode(firstNode)
  ) {
    nodes.unshift('first');
  }

  // "the last chunk is located after the last child element"
  const lastNode = nodes[nodes.length - 1];

  if (
    typeof lastNode === 'object' &&
    !Array.isArray(lastNode) &&
    lastNode !== null &&
    isElementNode(lastNode)
  ) {
    nodes.push('last');
  }

  // "'virtual' elements"
  nodes.unshift('before'); // "0 is a valid index"
  nodes.push('after'); // "n+2 is a valid index"

  return nodes;
}

function partsToNode(
  node: Element,
  parts: Part[],
  filter?: NodeFilter,
): {
  node: Node;
  offset?: number;
  before?: boolean;
  after?: boolean;
} {
  let _node: Node | Node[] | null = node;
  const { id } = parts[parts.length - 1];

  if (id) {
    const element = node.ownerDocument.getElementById(id);

    if (element) {
      return { node: element, offset: 0 };
    }
  }

  for (const { index } of parts) {
    const newNode = node ? indexChildNodes(node, filter)[index] : null;

    // handle non-existent nodes
    if (newNode === 'first') {
      return { node: node.firstChild ?? node };
    }

    if (newNode === 'last') {
      return { node: node.lastChild ?? node };
    }

    if (newNode === 'before') {
      return { node, before: true };
    }

    if (newNode === 'after') {
      return { node, after: true };
    }

    _node = newNode;
  }

  const { offset = 0 } = parts[parts.length - 1];

  if (!Array.isArray(_node)) {
    return { node: _node!, offset };
  }

  // get underlying text node and offset from the chunk
  let sum = 0;

  for (const node of _node) {
    const { length } = node.nodeValue ?? { length: 0 };

    if (sum + length >= offset) {
      return { node, offset: offset - sum };
    }

    sum += length;
  }

  return { node: _node[_node.length - 1], offset: offset - sum };
}

function nodeToParts(
  node: Element,
  offset?: number | null,
  filter?: NodeFilter,
): Part[] {
  const { parentNode, id } = node;

  if (!parentNode) {
    return [];
  }

  const indexed = indexChildNodes(parentNode, filter);
  const index = indexed.findIndex((x) =>
    Array.isArray(x) ? x.some((x) => x === node) : x === node,
  );

  // adjust offset as if merging the text nodes in the chunk
  const chunk = indexed[index];

  if (Array.isArray(chunk)) {
    let sum = 0;

    for (const item of chunk) {
      if (item === node) {
        sum += offset ?? 0;

        break;
      }

      sum += item.nodeValue?.length ?? 0;
    }

    offset = sum;
  }

  const part = { id, index, offset: offset ?? 0 } satisfies Part;

  return (
    (
      parentNode !== node.ownerDocument.documentElement
        ? nodeToParts(parentNode as Element, null, filter).concat(part)
        : [part]
    )
      // remove ignored nodes
      .filter((part) => part.index !== -1)
  );
}

export function fromRange(range: Range, filter: NodeFilter) {
  const { startContainer, startOffset, endContainer, endOffset } = range;
  const start = nodeToParts(startContainer as Element, startOffset, filter);

  if (range.collapsed) {
    return toString([start]);
  }

  const end = nodeToParts(endContainer as Element, endOffset, filter);

  return buildRange([start], [end]);
}

export function cfiToRange(
  doc: Document,
  parts: Part[][],
  filter?: NodeFilter,
) {
  const startParts = collapse(parts);
  const endParts = collapse(parts, true);

  const root = doc.documentElement;
  const start = partsToNode(root, startParts[0], filter);
  const end = partsToNode(root, endParts[0], filter);

  const range = doc.createRange();

  if (start) {
    if (start.before) {
      range.setStartBefore(start.node);
    } else if (start.after) {
      range.setStartAfter(start.node);
    } else {
      range.setStart(start.node, start.offset ?? 0);
    }
  }

  if (end) {
    if (end.before) {
      range.setEndBefore(end.node);
    } else if (end.after) {
      range.setEndAfter(end.node);
    } else {
      range.setEnd(end.node, end.offset ?? 0);
    }
  }

  return range;
}

// faster way of getting CFIs for sorted elements in a single parent
export function parseCfiFromElements(elements: Element[]) {
  const results: string[] = [];
  const { parentNode } = elements[0];
  const parts = nodeToParts(parentNode as Element);

  for (const [index, node] of indexChildNodes(
    parentNode as Element,
  ).entries()) {
    const element = elements[results.length];

    if (node === element) {
      results.push(toString([parts.concat({ id: element.id, index })]));
    }
  }

  return results;
}

export function cfiToElement(doc: Document, parts: Part[]) {
  const { node } = partsToNode(doc.documentElement, collapse(parts));

  return node;
}

// turn indices into standard CFIs when you don't have an actual package document
export const fake = {
  fromIndex: (index: number) => wrap(`/6/${(index + 1) * 2}`),
  toIndex: (parts: Part[] | undefined) => (parts?.at(-1)?.index ?? 0) / 2 - 1,
};

// get CFI from Calibre bookmarks

// see https://github.com/johnfactotum/foliate/issues/849
export function fromCalibrePos(position: string) {
  const [parts] = parseCfi(position) as unknown as RegularCfi;
  const item = parts.shift()!;
  parts.shift();

  return toString([[{ index: 6 }, item], parts]);
}

export function fromCalibreHighlight({
  spine_index,
  start_cfi,
  end_cfi,
}: {
  spine_index: number;
  start_cfi: string;
  end_cfi: string;
}) {
  const pre = fake.fromIndex(spine_index) + '!';

  return buildRange(pre + start_cfi.slice(2), pre + end_cfi.slice(2));
}
