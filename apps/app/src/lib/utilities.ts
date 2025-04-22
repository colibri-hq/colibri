import type { Action } from 'svelte/action';

/** Dispatch event on click outside of node */
export const clickOutside: Action = function clickOutside(node: HTMLElement) {
  const handleClick = (event: Event) => {
    if (
      node &&
      !node.contains(event.target as HTMLElement) &&
      !event.defaultPrevented
    ) {
      node.dispatchEvent(
        new CustomEvent('clickOutside', {
          detail: { node },
        }),
      );
    }
  };

  document.addEventListener('click', handleClick, true);

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    },
  };
};

export const sticky: Action<
  HTMLElement,
  { stickToTop: boolean; top?: number }
> = function sticky(
  node,
  { stickToTop, top = 0 }: { stickToTop: boolean; top?: number },
) {
  node.style.position = 'sticky';
  node.style.top = `${top}px`;

  const stickySentinelTop = document.createElement('div');
  stickySentinelTop.classList.add('__stickySentinelTop__');
  stickySentinelTop.style.position = 'absolute';
  stickySentinelTop.style.height = '1px';
  node.parentNode?.prepend(stickySentinelTop);

  const stickySentinelBottom = document.createElement('div');
  stickySentinelBottom.classList.add('__stickySentinelBottom__');
  stickySentinelBottom.style.position = 'absolute';
  stickySentinelBottom.style.height = '1px';
  node.parentNode?.append(stickySentinelBottom);

  const mutationObserver = new MutationObserver((mutations) =>
    mutations.forEach(() => {
      const { parentNode: topParent } = stickySentinelTop;
      const { parentNode: bottomParent } = stickySentinelBottom;

      if (stickySentinelTop !== topParent?.firstChild) {
        topParent?.prepend(stickySentinelTop);
      }

      if (stickySentinelBottom !== bottomParent?.lastChild) {
        bottomParent?.append(stickySentinelBottom);
      }
    }),
  );

  mutationObserver.observe(node.parentNode as HTMLElement, { childList: true });

  const intersectionObserver = new IntersectionObserver(([entry]) =>
    node.dispatchEvent(
      new CustomEvent('stuck', {
        detail: {
          isStuck: !entry.isIntersecting && isValidYPosition(entry),
        },
      }),
    ),
  );

  const isValidYPosition = ({
    target,
    boundingClientRect,
  }: IntersectionObserverEntry) =>
    target === stickySentinelTop
      ? boundingClientRect.y < 0
      : boundingClientRect.y > 0;

  intersectionObserver.observe(
    stickToTop ? stickySentinelTop : stickySentinelBottom,
  );

  return {
    update() {
      if (stickToTop) {
        intersectionObserver.unobserve(stickySentinelBottom);
        intersectionObserver.observe(stickySentinelTop);
      } else {
        intersectionObserver.unobserve(stickySentinelTop);
        intersectionObserver.observe(stickySentinelBottom);
      }
    },

    destroy() {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    },
  };
};
