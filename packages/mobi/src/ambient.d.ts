// oxlint-disable no-explicit-any
declare module "binary-parser" {
  // An empty interface to allow users to augment it.
  // oxlint-disable-next-line no-empty-object-type
  export interface ParserRegistry {}

  // A helper to resolve a choice (string name or direct parser) to its schema type.
  type ResolveChoiceType<TChoice, TRegistry> =
    TChoice extends Parser<infer T, any>
      ? T
      : TChoice extends keyof TRegistry
        ? TRegistry[TChoice]
        : never;

  type UnionOfChoiceOutputs<TChoicesMap, TRegistry> = {
    [K in keyof TChoicesMap]: ResolveChoiceType<TChoicesMap[K], TRegistry>;
  }[keyof TChoicesMap];

  interface ParserOptions<
    T extends object,
    TParent extends object | null = null,
    TRoot extends object = T,
    TIn = any,
    TOut = TIn,
  > {
    assert?: number | string | ((this: ParserContext<T, TParent, TRoot>, item: TOut) => boolean);
    formatter?: (this: ParserContext<T, TParent, TRoot>, item: TIn) => any;
  }

  type StringParserOptions<
    T extends object,
    TParent extends object | null = null,
    TRoot extends object = T,
    TOut = string,
  > = ParserOptions<T, TParent, TRoot, string, TOut> & { encoding?: string } & (
      | { length: FieldLength<T, TParent, TRoot>; stripNull?: boolean }
      | { zeroTerminated: true }
      | { greedy: true }
    );

  type FieldLength<
    T extends object,
    TParent extends object | null = null,
    TRoot extends object = T,
  > = number | keyof T | ((this: ParserContext<T, TParent, TRoot>, item: any) => number);
  type ReadUntil<T extends object, TParent extends object | null = null, TRoot extends object = T> =
    | "eof"
    | ((this: ParserContext<T, TParent, TRoot>, item: any, buffer: ArrayBuffer) => boolean);

  type BufferParserOptions<
    T extends object,
    TParent extends object | null = null,
    TRoot extends object = T,
    TOut = Uint8Array<ArrayBufferLike>,
  > = ParserOptions<T, TParent, TRoot, Uint8Array<ArrayBufferLike>, TOut> & { clone?: boolean } & (
      | { length: FieldLength<T, TParent, TRoot> }
      | { readUntil: ReadUntil<T, TParent, TRoot> }
    );

  type ArrayParserOptions<
    T extends object,
    TParent extends object | null,
    TRoot extends object,
    TItem extends object = Record<string, any>,
    TOut = TItem[],
  > = ParserOptions<T, TParent, TRoot, TItem[], TOut> & {
    type:
      | "int8"
      | "int8le"
      | "int8be"
      | "int16"
      | "int16le"
      | "int16be"
      | "int32"
      | "int32le"
      | "int32be"
      | "uint8"
      | "uint8le"
      | "uint8be"
      | "uint16"
      | "uint16le"
      | "uint16be"
      | "uint32"
      | "uint32le"
      | "uint32be"
      | Parser<any>;
  } & (
      | {
          length:
            | number
            | keyof T
            | ((this: ArrayParserContext<T, TParent, TRoot>, item: any) => number);
        }
      | {
          lengthInBytes:
            | number
            | keyof T
            | ((this: ArrayParserContext<T, TParent, TRoot>, item: any) => number);
        }
      | { readUntil: ReadUntil<T, TParent, TRoot> }
    );

  export type ParserOutput<P> = P extends Parser<infer T> ? T : never;

  type UnionOfParserOutputs<TChoices extends { [key: number]: Parser<any> }> = {
    [K in keyof TChoices]: ParserOutput<TChoices[K]>;
  }[keyof TChoices];

  interface ChoiceParserOptions<
    T extends object,
    TParent extends object | null = null,
    TRoot extends object = T,
  > extends ParserOptions<T, TParent, TRoot> {
    tag: keyof T | ((this: ParserContext<T, TParent, TRoot>, item: any) => number);
    choices: { [key: number]: Parser<T, TParent, TRoot> };
    defaultChoice?: keyof T | Parser<T, TParent, TRoot>;
  }

  interface NestedParserOptions<
    T extends object,
    TParent extends object | null = null,
    TRoot extends object = T,
  > extends ParserOptions<T, TParent, TRoot> {
    type: keyof T | Parser<T, TParent, TRoot>;
  }

  interface PointerParserOptions<
    T extends object,
    TType extends keyof T | Parser<any, TParent, TRoot>,
    TParent extends object | null = null,
    TRoot extends object = T,
  > extends ParserOptions<T, TParent, TRoot> {
    type: TType;
    offset:
      | number
      | keyof T
      | ((this: ParserContext<T, TParent, TRoot>, item: ParserContext<T, null, TRoot>) => number);
  }

  type WrappedParserOptions<
    T extends object,
    TParent extends object | null = null,
    TRoot extends object = T,
    U = any,
  > = ParserOptions<T, TParent, TRoot, U> & {
    wrapper: (buffer: ArrayBuffer) => ArrayBuffer;
    type: Parser<T, TParent, TRoot>;
  } & ({ length: FieldLength<T, TParent, TRoot> } | { readUntil: ReadUntil<T, TParent, TRoot> });

  type ParserContext<
    TCurrent extends object,
    TParent extends object | null,
    TRoot extends object,
  > = TCurrent & {
    $parent: TParent extends object ? ParserContext<TParent, Record<string, any>, TRoot> : null;
    $root: TRoot;
  };

  type ArrayParserContext<
    T extends object,
    TParent extends object | null = null,
    TRoot extends object = T,
  > = ParserContext<T, TParent, TRoot> & { $index: number };

  export declare class Parser<
    // oxlint-disable-next-line no-empty-object-type
    T extends object = {},
    TParent extends object | null = null,
    TRoot extends object = T,
    O extends ParserOptions<T, TParent, TRoot> = ParserOptions<T, TParent, TRoot>,
    TRegistry = ParserRegistry,
  > {
    options: O;
    next?: Parser<T, TParent, TRoot>;
    head?: Parser<T, TParent, TRoot>;

    static start<
      // oxlint-disable-next-line no-empty-object-type
      TInitial extends object = {},
      TInitialParent extends object | null = null,
    >(): Parser<TInitial, TInitialParent, TInitial>;

    namely<TName extends string>(alias: TName): Parser<T & { [name in TName]: number }>;

    uint8<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends {
        formatter: (this: ParserContext<T, TParent, TRoot>, item: number) => infer R;
      }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    uint16<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    uint16le<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    uint16be<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    uint32<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    uint32le<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    uint32be<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int8<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int16<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int16le<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int16be<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int32<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int32le<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int32be<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int64<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int64be<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    int64le<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    uint64<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    uint64be<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    uint64le<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    floatle<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    floatbe<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    doublele<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    doublebe<
      TName extends string,
      const TOptions extends ParserOptions<T, TParent, TRoot, number>,
      TResult = TOptions extends { formatter: (item: number) => infer R }
        ? R
        : TOptions extends { assert: infer A extends number }
          ? A
          : number,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    bit1<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit2<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit3<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit4<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit5<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit6<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit7<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit8<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit9<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit10<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit11<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit12<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit13<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit14<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit15<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit16<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit17<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit18<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit19<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit20<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit21<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit22<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit23<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit24<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit25<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit26<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit27<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit28<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit29<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit30<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit31<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    bit32<TName extends string>(
      varName: TName,
      options?: ParserOptions<T, TParent, TRoot>,
    ): Parser<T & { [name in TName]: number }, TParent, TRoot>;

    namely(alias: string): this;

    skip(length: FieldLength<T, TParent, TRoot>, options?: ParserOptions<T, TParent, TRoot>): this;

    seek(
      relOffset: FieldLength<T, TParent, TRoot>,
      options?: ParserOptions<T, TParent, TRoot>,
    ): this;

    string<
      TName extends string,
      const TOptions extends StringParserOptions<T, TParent, TRoot>,
      TResult = TOptions extends {
        formatter: (item: string, context: any) => infer FormatterOutput;
      }
        ? FormatterOutput
        : TOptions extends { assert: infer AssertType extends string | number }
          ? AssertType
          : string,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    buffer<
      TName extends string,
      TOptions extends BufferParserOptions<T, TParent, TRoot>,
      TResult extends TOptions extends Required<
        Pick<ParserOptions<T, TParent, TRoot>, "formatter">
      > &
        BufferParserOptions<T, TParent, TRoot, infer TResult>
        ? TResult
        : Uint8Array<ArrayBufferLike>,
    >(varName: TName, options: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    wrapped<
      TName extends string,
      TOptions extends WrappedParserOptions<T, TParent, TRoot>,
      TResult extends TOptions extends Required<
        Pick<ParserOptions<T, TParent, TRoot>, "formatter">
      > &
        WrappedParserOptions<T, infer TResult>
        ? TResult
        : TOptions extends WrappedParserOptions<T, infer TNested>
          ? TNested
          : never,
    >(
      varName: TName | TOptions,
      options?: TOptions,
    ): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    array<
      TName extends string,
      const TOptions extends ArrayParserOptions<T, TParent, TRoot>,
      // TItemType = TOptions extends { type: Parser<infer U> } ? U : Record<string, any>,
      TItemType = TOptions extends { type: Parser<infer U> } ? U : Record<string, any>,
      TBaseArrayType = TItemType[],
      TResult = TOptions extends { formatter: (item: TBaseArrayType) => infer R }
        ? R
        : TBaseArrayType,
    >(varName: TName, options: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    choice<
      TName extends string,
      const TChoices extends { [key: number]: keyof ParserRegistry | Parser<any, TParent, TRoot> },
      TDefaultChoice extends Parser<any, TParent, TRoot>,
      TOptions extends {
        tag:
          | keyof T
          | ((
              this: ParserContext<T, TParent, TRoot>,
              context: ParserContext<T, null, TRoot>,
            ) => number);
        choices: TChoices;
        defaultChoice?: TDefaultChoice;
        formatter?: (item: TBaseResult) => any;
      },
      TBaseResult = UnionOfChoiceOutputs<TChoices, TRegistry>,
      TResult = TOptions extends {
        formatter: (this: ParserContext<T, TParent, TRoot>, item: TBaseResult) => infer R;
      }
        ? R
        : TBaseResult,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;
    choice<
      const TChoices extends { [key: number]: keyof ParserRegistry | Parser<any, TParent, TRoot> },
      TDefaultChoice extends Parser<any, TParent, TRoot>,
      TOptions extends {
        tag:
          | keyof T
          | ((
              this: ParserContext<T, TParent, TRoot>,
              context: ParserContext<T, null, TRoot>,
            ) => number);
        choices: TChoices;
        defaultChoice?: TDefaultChoice;
        formatter?: (item: TBaseResult) => any;
      },
      TBaseResult = UnionOfChoiceOutputs<TChoices, TRegistry>,
      TResult = TOptions extends {
        formatter: (this: ParserContext<T, TParent, TRoot>, item: TBaseResult) => infer R;
      }
        ? R
        : TBaseResult,
    >(options: TOptions): Parser<T & TResult, TParent, TRoot>;

    nest<
      TName extends string,
      TNested extends object,
      const TOptions extends NestedParserOptions<TNested, T, TRoot>,
      TRegistry = ParserRegistry,
      TBaseResult = ResolveChoiceType<TOptions["type"], TRegistry>,
      // Check for formatter
      TResult = TOptions extends { formatter: (item: TBaseResult) => infer R } ? R : TBaseResult,
    >(varName: TName, options: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;
    nest<
      TNested extends object,
      const TOptions extends NestedParserOptions<TNested, T, TRoot>,
      TRegistry = ParserRegistry,
      TBaseResult = ResolveChoiceType<TOptions["type"], TRegistry>,
      // Check for formatter
      TResult = TOptions extends { formatter: (item: TBaseResult) => infer R } ? R : TBaseResult,
    >(options: TOptions): Parser<T & TResult, TParent, TRoot>;

    pointer<
      TName extends string,
      TNested extends object,
      TOptions extends PointerParserOptions<T, TNested, TParent, TRoot>,
      TBaseResult = TOptions extends { type: Parser<infer U> } ? U : string | number | ArrayBuffer,
      TResult = TOptions extends { formatter: (item: TBaseResult) => infer R } ? R : TBaseResult,
    >(varName: TName, options?: TOptions): Parser<T & { [name in TName]: TResult }, TParent, TRoot>;

    skip(length: number | string | ((item: any) => number)): this;
    seek(relOffset: number | string | ((item: any) => number)): this;
    saveOffset(varName: string, options?: ParserOptions<T, TParent, TRoot>): this;
    useContextVars(): this;

    parse(buffer: ArrayBuffer | Uint8Array): T;
  }
}
// oxlint-enable no-explicit-any

declare module "lcid" {
  export function from(code: number): string | undefined;
  export function to(name: string): number | undefined;
  export function all(): { [name: string]: number };
}
