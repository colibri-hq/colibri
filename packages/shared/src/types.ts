export type ThenArg<TType> =
  TType extends PromiseLike<infer U> ? ThenArg<U> : TType;

export type AsyncReturnType<TFunction extends (...args: unknown[]) => unknown> =
  ThenArg<ReturnType<TFunction>>;

export type MaybePromise<T> = T | Promise<T>;

export type DeepRequired<T> = Required<{
  [K in keyof T]: T[K] extends Required<T[K]> ? T[K] : DeepRequired<T[K]>
}>

export type Optional<T, K extends keyof T = keyof T> = Pick<Partial<T>, K> &
  Omit<T, K>;
