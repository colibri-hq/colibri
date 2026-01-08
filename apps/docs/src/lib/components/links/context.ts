import { getContext, setContext } from "svelte";

const CONTEXT_KEY = Symbol("link-preview");

export interface LinkPreviewContext {
  showPreview: (href: string, anchor: HTMLElement) => void;
  hidePreview: () => void;
}

export function getLinkPreviewContext(): LinkPreviewContext | undefined {
  return getContext(CONTEXT_KEY);
}

export function setLinkPreviewContext(context: LinkPreviewContext): void {
  setContext<LinkPreviewContext>(CONTEXT_KEY, context);
}
