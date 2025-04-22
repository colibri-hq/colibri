import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// @ts-ignore
type MatcherParam<M> = M extends (param : string) => param is infer U ? U extends string ? U : string : string;
type RouteParams = {  };
type RouteId = '/';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type LayoutRouteId = RouteId | "/(library)" | "/(library)/authors" | "/(library)/authors/[author]" | "/(library)/books" | "/(library)/books/[book=id]" | "/(library)/books/[book=id]/cover" | "/(library)/books/[book=id]/edit" | "/(library)/books/add" | "/(library)/collections" | "/(library)/collections/[collection]" | "/(library)/creators" | "/(library)/creators/[creator=id]" | "/(library)/discover" | "/(library)/discover/[catalog=id]" | "/(library)/discover/[catalog=id]/[vanity]/[...segments=encoded_path]" | "/(library)/discover/featured" | "/(library)/help" | "/(library)/instance/profile" | "/(library)/instance/settings" | "/(library)/publishers" | "/(library)/publishers/[publisher]" | "/api/docs" | "/auth/attestation" | "/auth/login" | "/auth/login/unknown" | "/auth/oauth/authorize" | "/auth/oauth/device" | null
type LayoutParams = RouteParams & { author?: string; book?: MatcherParam<typeof import('../../../../src/params/id.js').match>; collection?: string; creator?: MatcherParam<typeof import('../../../../src/params/id.js').match>; catalog?: MatcherParam<typeof import('../../../../src/params/id.js').match>; vanity?: string; segments?: MatcherParam<typeof import('../../../../src/params/encoded_path.js').match>; publisher?: string }
type LayoutServerParentData = EnsureDefined<{}>;
type LayoutParentData = EnsureDefined<{}>;

export type LayoutServerLoad<OutputData extends OutputDataShape<LayoutServerParentData> = OutputDataShape<LayoutServerParentData>> = Kit.ServerLoad<LayoutParams, LayoutServerParentData, OutputData, LayoutRouteId>;
export type LayoutServerLoadEvent = Parameters<LayoutServerLoad>[0];
export type LayoutServerData = Expand<OptionalUnion<EnsureDefined<Kit.LoadProperties<Awaited<ReturnType<typeof import('../../../../src/routes/+layout.server.js').load>>>>>>;
export type LayoutData = Expand<Omit<LayoutParentData, keyof LayoutServerData> & EnsureDefined<LayoutServerData>>;
export type LayoutProps = { data: LayoutData; children: import("svelte").Snippet }
export type RequestEvent = Kit.RequestEvent<RouteParams, RouteId>;