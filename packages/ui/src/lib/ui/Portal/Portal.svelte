<script lang="ts" module>
  import { tick } from 'svelte';
  import type { Action } from 'svelte/action';

  export const portal: Action<HTMLElement, HTMLElement | string> =
    function portal(element, target: HTMLElement | string = 'body') {
      let targetElement;

      async function update(newTarget: HTMLElement | string) {
        target = newTarget;

        if (typeof target === 'string') {
          targetElement = document.querySelector(target);

          if (targetElement === null) {
            await tick();
            targetElement = document.querySelector(target);
          }

          if (targetElement === null) {
            throw new Error(
              `No element found matching css selector: "${target}"`,
            );
          }
        } else if (target instanceof HTMLElement) {
          targetElement = target;
        } else {
          throw new TypeError(
            `Unknown portal target type: ${
              target === null ? 'null' : typeof target
            }. Allowed types: string (CSS selector) or HTMLElement.`,
          );
        }

        targetElement.appendChild(element);
        element.hidden = false;
      }

      function destroy() {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }

      update(target);

      return {
        update,
        destroy,
      };
    };
</script>

<script lang="ts">
  interface Props {
    target?: HTMLElement | string;
    children?: import('svelte').Snippet;
  }

  let { target = 'body', children }: Props = $props();
</script>

<div class="contents" hidden use:portal={target}>
  {@render children?.()}
</div>
