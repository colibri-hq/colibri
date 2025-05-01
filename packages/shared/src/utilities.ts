export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function uniqueBy<T, P extends keyof T = keyof T, V = unknown>(
  array: T[],
  property: P | ((item: T) => V),
): T[] {
  const seen = new Set();
  const predicate = (item: T) =>
    typeof property === 'function' ? property(item) : item[property];

  return array.filter((item) => {
    const value = predicate(item);

    return seen.has(value) ? false : seen.add(value);
  });
}

export function wrapArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function humanReadableFileSize(size: number): string {
  const i: number = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  const unit: string = ['B', 'kB', 'MB', 'GB', 'TB'][i];

  return Number((size / Math.pow(1024, i)).toFixed(2)) + ' ' + unit;
}

export function inferNameFromEmailAddress(email: string): string {
  const mailbox =
    email

      // Pick anything before the last @ character ("foo\@bar@test.com" -> "foo\@bar")
      .slice(0, email.lastIndexOf('@'))

      // Remove any + modifiers
      .split('+', 1)
      .shift() ?? '';

  let name = mailbox

    // Replace any numbers, underscores, or dots with spaces
    .replace(/[-_.\d]+/g, ' ')

    // Replace duplicate whitespace with a single one
    .replace(/\s\s+/g, ' ')

    .trim();

  // Title case
  // `john smith` to `John Smith`
  name = name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Handle Generational (The Third) names
  // `John Smith Iii` to `John Smith III`
  ['ii', 'iii', 'iv'].forEach((suffix) => {
    const rx = new RegExp(`\\s(${suffix})$`, 'gi');

    name = name.replace(rx, (s) => s.toUpperCase());
  });

  // Handle 'Jr/Sr' names
  // `John Smith Jr` to `John Smith, Jr.`
  ['jr', 'jnr', 'sr', 'snr'].forEach((suffix) => {
    name = name.replace(
      new RegExp('\\s(' + suffix + ')$', 'gi'),
      (s) => `,${s}.`,
    );
  });

  // Handle title prefixes names
  // `Dr John Smith` to `Dr. John Smith`
  ['mr', 'mrs', 'ms', 'dr', 'prof'].forEach((prefix) => {
    name = name.replace(new RegExp(`^(${prefix})\\s`, 'gi'), (s) =>
      s.replace(' ', '. '),
    );
  });

  // Handle "son/daughter" of pattern
  name = name
    .replace(/\bAl(?=\s+\w)/g, 'al') // al Arabic or forename Al.
    .replace(/\bAp\b/g, 'ap') // ap Welsh.
    .replace(/\bBen(?=\s+\w)\b/g, 'ben') // ben Hebrew or forename Ben.
    .replace(/\bDell([ae])\b/g, 'dell$1') // della and delle Italian.
    .replace(/\bD([aeiu])\b/g, 'd$1') // da, de, di Italian; du French.
    .replace(/\bDe([lr])\b/g, 'de$1') // del Italian; der Dutch/Flemish.
    .replace(/\bEl\b/g, 'el') // el Greek
    .replace(/\bLa\b/g, 'la') // la French
    .replace(/\bL([eo])\b/g, 'l$1') // lo Italian; le French.
    .replace(/\bVan(?=\s+\w)/g, 'van') // van German or forename Van.
    .replace(/\bVon\b/g, 'von'); // von Dutch/Flemish

  // Handle 'Mc' names
  // `Marty Mcfly` to `Marty McFly`
  name = name.replace(/Mc(.)/g, (_, m1) => `Mc${m1.toUpperCase()}`);

  // Handle 'O'Connor' type names
  // `Flannery O'connor` to `Flannery O'Connor`
  name = name.replace(/[A-Z]'(.)/g, (_, m1) => `O'${m1.toUpperCase()}`);

  return name;
}
