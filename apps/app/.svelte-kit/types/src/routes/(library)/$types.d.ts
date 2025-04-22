import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// @ts-ignore
type MatcherParam<M> = M extends (param : string) => param is infer U ? U extends string ? U : string : string;
type RouteParams = {  };
type RouteId = '/(library)';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type PageParentData = Omit<EnsureDefined<import('../$types.js').LayoutData>, keyof LayoutData> & EnsureDefined<LayoutData>;
type LayoutRouteId = RouteId | "/(library)" | "/(library)/authors" | "/(library)/authors/[author]" | "/(library)/books" | "/(library)/books/[book=id]" | "/(library)/books/[book=id]/cover" | "/(library)/books/[book=id]/edit" | "/(library)/books/add" | "/(library)/collections" | "/(library)/collections/[collection]" | "/(library)/creators" | "/(library)/creators/[creator=id]" | "/(library)/discover" | "/(library)/discover/[catalog=id]" | "/(library)/discover/[catalog=id]/[vanity]/[...segments=encoded_path]" | "/(library)/discover/featured" | "/(library)/help" | "/(library)/instance/profile" | "/(library)/instance/settings" | "/(library)/publishers" | "/(library)/publishers/[publisher]"
type LayoutParams = RouteParams & { author?: string; book?: MatcherParam<typeof import('../../../../../src/params/id.js').match>; collection?: string; creator?: MatcherParam<typeof import('../../../../../src/params/id.js').match>; catalog?: MatcherParam<typeof import('../../../../../src/params/id.js').match>; vanity?: string; segments?: MatcherParam<typeof import('../../../../../src/params/encoded_path.js').match>; publisher?: string }
type LayoutParentData = EnsureDefined<import('../$types.js').LayoutData>;

export type PageServerData = null;
export type PageData = Expand<PageParentData>;
export type PageProps = { data: PageData }
export type LayoutServerData = null;
export type LayoutLoad<OutputData extends OutputDataShape<LayoutParentData> = OutputDataShape<LayoutParentData>> = Kit.Load<LayoutParams, LayoutServerData, LayoutParentData, OutputData, LayoutRouteId>;
export type LayoutLoadEvent = Parameters<LayoutLoad>[0];
export type LayoutData = Expand<Omit<LayoutParentData, keyof Kit.LoadProperties<Awaited<ReturnType<typeof import('./proxy+layout.js').load>>>> & OptionalUnion<EnsureDefined<Kit.LoadProperties<Awaited<ReturnType<typeof import('./proxy+layout.js').load>>>>>>;
export type LayoutProps = { data: LayoutData; children: import("svelte").Snippet }