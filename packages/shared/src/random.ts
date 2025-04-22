import { arrayBufferToHex } from './buffer';

export function generateRandomString(length: number, alphabet?: string): string {
  // noinspection SpellCheckingInspection
  const characters =
    alphabet ??
    'ABCDEFGHIJKLMNOPQRSTUVWXYZqeytrpolkadjsghfgmnbzxcvnQPOWEYRKASJHDGFMNBCV' +
    'Xjsfhrlg124903564576986483658fgh4sdfh687e4h897WETHJ68F7G468847' +
    '1877GFHJFFGJ87469857468746hfghwrtiyj4598yhdjkhgnk';

  return Array(length)
    .fill(undefined)
    .reduce<string>(
      (carry, _) =>
        carry +
        characters.charAt(Math.floor(Math.random() * characters.length)),
      '',
    );
}


export function generateRandomBytes(amount: number): string {
  return arrayBufferToHex(crypto.getRandomValues(new Uint8Array(amount)));
}

export function generateRandomDigits(amount: number): string {
  return ('' + Math.random()).substring(2, amount + 2);
}

export function generateRandomUuid(): `${string}-${string}-${string}-${string}-${string}` {
  return crypto.randomUUID();
}
