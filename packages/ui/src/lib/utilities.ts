import type { Action } from "svelte/action";

interface ClickOutsideAttributes {
  onclickoutside?: (event: CustomEvent<{ node: HTMLElement }>) => void;
}

/** Dispatch event on click outside of node */
export const clickOutside: Action<
  HTMLElement,
  undefined,
  ClickOutsideAttributes
> = function clickOutside(node: HTMLElement) {
  const handleClick = (event: Event) => {
    if (
      node &&
      !node.contains(event.target as HTMLElement) &&
      !event.defaultPrevented
    ) {
      node.dispatchEvent(
        new CustomEvent("clickoutside", {
          detail: { node },
        }),
      );
    }
  };

  document.addEventListener("click", handleClick, true);

  return {
    destroy() {
      document.removeEventListener("click", handleClick, true);
    },
  };
};
