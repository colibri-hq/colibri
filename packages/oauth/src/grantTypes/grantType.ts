import { z, type ZodType } from "zod";
import type { MaybePromise } from "@colibri-hq/shared";
import type { Entities, OAuthGrantType, RequestedToken } from "../types.js";

/**
 * Define a new grant type handler
 *
 * This function is used to create a new grant type handler. It takes a grant configuration object
 * and returns a new class that extends the `GrantType` class to ensure type safety.
 *
 * A grant handler implements validation and request handling for a
 * given {@link OAuthGrantType|OAuth grant type}. It exposes a {@link https://zod.dev|Zod} schema
 * for the request payload that will be validated before the request is handled.
 *
 * All token requests will be handled like this:
 *  1. Request headers will be checked
 *  2. The payload will be parsed against the grant type schema
 *  3. The client will be resolved from the `client_id` parameter
 *  4. `validate()` will be called with the schema parsing result and client data
 *  5. `handle()` will be called with the `validate()` result, database instance, and client data
 *
 * If the request is invalid for any reason, or a token cannot be issued, both `validate()`
 * and `handle()` should throw an {@link OAuthError} if an expected error occurs. The `handle()`
 * method should return a {@link TokenPayload} object on success.
 */
export function defineGrantType<
  T extends ZodType,
  V extends ValidateFn<T, any, C, O>,
  C extends Entities.Client = Entities.Client,
  O extends GrantTypeOptions = GrantTypeOptions,
  U = T extends ZodType<infer U> ? U : never,
  W = V extends ValidateFn<T, infer U, C, O> ? U : never,
>({
  handle,
  schema,
  type,
  validate,
  configure,
}: {
  /**
   * Grant Type identifier this grant handles.
   *
   * The available types are listed
   * in [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2).
   */
  type: string & OAuthGrantType;

  /**
   * Zod Schema to validate requests against.
   *
   * This schema will be used to validate the request payload before calling the `validate()`
   * method with the parsed data. Async schemas will be awaited.
   */
  schema: T;

  /**
   * Token request handler called with the validated request data.
   *
   * The `handle()` function is called after the request payload has been parsed using the schema,
   * and has been validated by the `validate()` handler. At this point, the token request can be
   * assumed to be valid, and a token can be issued.
   *
   * The result of this function will be used as the response payload of the token request.
   */
  handle: HandleFn<T, W, C, O>;

  /**
   * Validation function receiving the parsed request data and the client data.
   *
   * The `validate()` function can be used to perform additional validation steps or data
   * transformations before calling the `handle()` method.
   * If no such steps are required, you can just return the parsed data verbatim.
   */
  validate: V;

  /**
   * Configuration function called with the grant type options.
   *
   * This function can be used to configure the grant type handler with custom options. To do so,
   * add a type annotation to the `options` parameter of the function, add any default values to
   * the received options if necessary, and return the modified options object.
   *
   * @example (options: MyCustomOptions) => ({ ...options, customOption: true })
   */
  configure?: ConfigureFn<T, C, O>;
}): GrantTypeFactory<GrantType<O, C, T, W>> {
  return class extends GrantType<O, C, T, W> {
    public readonly type = type;
    public readonly schema = schema;

    public configure(options: O): O {
      return (configure ?? super.configure).call(this, options);
    }

    public validate(params: U, client: C): MaybePromise<W> {
      return validate.call(this, params, client);
    }

    public handle(
      params: Awaited<W>,
      client: C,
    ): MaybePromise<ReturnType<HandleFn<T, U, C, O>>> {
      return handle.call(this, params, client);
    }
  };
}

/**
 * **OAuth Grant Type Handler**
 *
 * A grant handler implements validation and request handling for a
 * given {@link OAuthGrantType|OAuth grant type}. It exposes a {@link https://zod.dev|Zod} schema
 * for the request payload that will be validated bef
 *
 * All token requests will be handled like such:
 *  1. Request headers will be checked
 *  2. The payload will be parsed against the grant type schema
 *  3. The client will be resolved from the `client_id` parameter
 *  4. `validate()` will be called with the schema parsing result and client data
 *  5. `handle()` will be called with the `validate()` result, database instance, and client data
 *
 * If the request is invalid for any reason, or a token cannot be issued, both `validate()`
 * and `handle()` should throw an {@link OAuthError} if an expected error occurs, or return
 * a {@link TokenPayload} object on success.
 */
export abstract class GrantType<
  O extends GrantTypeOptions = GrantTypeOptions,
  C extends Entities.Client = Entities.Client,
  T extends ZodType = ZodType,
  W = unknown,
  U = T extends ZodType<infer U> ? U : never,
> {
  /**
   * Grant Type identifier this grant handles
   *
   * @see OAuthGrantType
   */
  abstract readonly type: string & OAuthGrantType;

  /**
   * Zod Schema to validate requests against
   */
  abstract readonly schema: T;

  public readonly options: O;

  public constructor(options: O) {
    this.options = this.configure(options);
  }

  configure(options: O): O {
    return options;
  }

  /**
   * Apply validation steps to the request.
   *
   * The return value will be passed on to the handle function.
   *
   * @param params Request payload matching the schema
   * @param client Client data
   */
  abstract validate(params: U, client: C): MaybePromise<W>;

  /**
   * Handle the grant request and return the token response
   *
   * @param params Validated request data
   * @param client Client data
   */
  abstract handle(
    params: Awaited<W>,
    client: C,
  ): MaybePromise<ReturnType<HandleFn<T, U, C, O>>>;
}

type ValidateFn<
  T extends ZodType,
  U,
  C extends Entities.Client,
  O extends GrantTypeOptions,
> = (
  this: GrantType<O, C, T>,
  params: z.output<T>,
  client: C,
) => MaybePromise<U>;

type HandleFn<
  T extends ZodType,
  U,
  C extends Entities.Client,
  O extends GrantTypeOptions,
> = (
  this: GrantType<O, C, T, U>,
  params: Awaited<U>,
  client: C,
) => MaybePromise<{
  scopes: string[];
  accessToken?: RequestedToken | undefined;
  refreshToken?: RequestedToken | undefined;
  idToken?:
    | (Omit<RequestedToken, "exchange" | "scopes"> & {
        exchange?: never;
        scopes?: never;
      })
    | undefined;
  userIdentifier?: string | undefined;
}>;

type ConfigureFn<
  T extends ZodType,
  C extends Entities.Client,
  O extends GrantTypeOptions,
> = (this: GrantType<O, C, T>, options: O) => O;

export interface GrantTypeOptions {
  /**
   * Access token time to live in seconds
   *
   * Allows to set a default TTL for access tokens issued by this grant type. Will be set from the
   * server configuration if not set.
   */
  accessTokenTtl?: number | undefined;

  /**
   * Refresh token time to live in seconds
   *
   * Allows to set a default TTL for refresh tokens issued by this grant type. Will be set from the
   * server configuration if not set.
   */
  refreshTokenTtl?: number | undefined;
}

export type GrantTypeFactory<
  G extends GrantType,
  O extends GrantTypeOptions = G extends GrantType<infer O> ? O : never,
> = {
  new (options: O): G;
};
