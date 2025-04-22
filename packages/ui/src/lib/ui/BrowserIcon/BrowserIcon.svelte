<script lang="ts">
  import silkLogo from '@browser-logos/silk/silk.png';
  import safariMobileLogo from '@browser-logos/safari-ios/safari-ios.svg';
  import safariLogo from '@browser-logos/safari/safari.png';
  import chromeLogo from '@browser-logos/chrome/chrome.svg';
  import chromiumLogo from '@browser-logos/chromium/chromium.svg';
  import edgeLogo from '@browser-logos/edge/edge.svg';
  import yandexLogo from '@browser-logos/yandex/yandex.png';
  import braveLogo from '@browser-logos/brave/brave.svg';
  import firefoxLogo from '@browser-logos/firefox/firefox.svg';
  import webkitLogo from '@browser-logos/webkit/webkit.svg';
  import { twMerge } from 'tailwind-merge';

  type BrowserIdentifier =
    | 'kindle'
    | 'silk'
    | 'mobile safari'
    | 'safari'
    | 'chrome'
    | 'chromium'
    | 'edge'
    | 'yandex'
    | 'brave'
    | 'firefox'
    | 'webkit';

  interface Props {

    /**
     * The browser identifier. This is used to determine which icon to display.
     */
    browser?: BrowserIdentifier;

    /**
     * Additional classes to apply to the icon.
     */
    class?: string;

    [key: string]: unknown;
  }

  const { browser = 'webkit', class: className, ...rest }: Props = $props();
  const icon = $derived.by(() => ({
    kindle: silkLogo,
    silk: silkLogo,
    'mobile safari': safariMobileLogo,
    safari: safariLogo,
    chrome: chromeLogo,
    chromium: chromiumLogo,
    edge: edgeLogo,
    yandex: yandexLogo,
    brave: braveLogo,
    firefox: firefoxLogo,
    webkit: webkitLogo,
  }[browser] ?? webkitLogo));
</script>

<img
  alt="Browser Icon"
  {...rest}
  class={twMerge('w-8', className)}
  src={icon}
/>
