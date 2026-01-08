<script lang="ts">
  import { Directory, Page } from '$lib/content/content';
  import { ArrowUpRightIcon, HistoryIcon, MapIcon, RssIcon } from '@lucide/svelte';
  import { Github } from '$lib/components/icons';
  import { NavigationHeading } from '$lib/components/blog';
  import { resolve } from '$app/paths';

  type Props = {
    contentTree: (Page | Directory)[];
  }

  const { contentTree }: Props = $props();

  // Filter out blog posts from the content tree
  const filteredContentTree = $derived(
    contentTree.filter((item) => !item.slug.startsWith('/blog')),
  );

  function getTitle(item: Page | Directory) {
    return item instanceof Page ? item.metadata.title : item.title;
  }

  function isDirectory(item: Page | Directory): item is Directory {
    return item instanceof Directory;
  }
</script>

<footer class="bg-gray-900 text-white border-t border-gray-800 mt-auto select-none">
  <div class="container mx-auto px-4 py-12">
    <!-- region Topic Overview -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
      {#each filteredContentTree as topic (topic.slug)}
        <div>
          <NavigationHeading label={getTitle(topic)} href={topic.slug} />

          {#if isDirectory(topic) && topic.children.length > 0}
            <ul class="flex flex-col gap-2">
              {#each topic.children as child (child.slug)}
                <li>
                  <a
                    href={child.slug}
                    class="group flex items-center gap-1 text-gray-400 hover:text-white text-sm outline-hidden
                    focus-visible:text-blue-500 dark:focus-visible:text-blue-400 transition-colors duration-200"
                  >
                    <span>{getTitle(child)}</span>

                    <ArrowUpRightIcon
                      class="translate-x-0 group-hover:translate-x-1 group-focus:translate-x-1 opacity-0
                      group-hover:opacity-100 group-focus:opacity-100 transition duration-200 inline size-3"
                    />
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </div>
    <!-- endregion -->

    <!-- region Bottom Bar -->
    <div class="border-t border-gray-800 pt-8 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
      <div class="flex items-center gap-2">
        <div class="text-blue-400 size-6">
          <svg viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path
              d="m 218.77149,127.28553 c -0.41211,0.7146 -0.58364,1.07176 -0.80305,1.39645 -9.17194,13.57427 -11.72102,25.5999 0.94035,40.09314 18.53578,21.21751 13.16402,45.36116 2.43849,68.61328 -9.58044,20.76983 -26.24322,34.98916 -44.84829,47.25756 -5.08095,3.35038 -10.26139,6.57501 -16.00231,8.75426 -2.81766,1.06964 -5.72361,2.10054 -8.35468,-0.0955 -2.65823,-2.21872 -1.00231,-4.98718 -0.66642,-7.66329 0.28374,-2.26058 2.79585,-4.7069 -0.0106,-6.96923 -2.35469,-0.002 -2.84815,1.98666 -3.78751,3.36485 -21.47111,31.49988 -22.0409,64.77915 -5.06028,97.60394 18.18989,35.16236 49.45991,54.87713 87.19747,63.67957 52.23111,12.18323 97.87599,-1.33851 136.54889,-38.42611 7.38602,-7.08324 14.1875,-14.70933 20.44777,-22.81545 2.64728,-3.42777 5.2035,-7.65069 10.46127,-4.16571 4.95819,3.28641 3.62601,7.79667 1.55334,12.04392 -11.13818,22.82384 -26.71912,42.13084 -46.91627,57.49205 -26.96205,20.50653 -57.69441,31.40301 -91.26822,34.76603 -50.03936,5.01247 -96.94837,-4.99498 -138.79951,-32.73721 -51.494173,-34.13445 -83.977188,-81.63956 -94.129619,-143.46646 -3.67905,-22.40488 -4.695225,-44.89765 -3.208905,-67.44642 1.413279,-21.44019 5.465593,-42.43745 15.192162,-61.89893 6.594692,-13.19501 9.929273,-14.57773 24.323299,-11.29481 3.810482,0.86909 7.683094,1.47423 11.54062,2.12051 0.71029,0.11901 1.612857,0.1351 2.155359,-1.49287 -5.002442,-2.62709 -10.171081,-5.22916 -15.234498,-8.02205 -14.125086,-7.79109 -26.574419,-17.50452 -35.323173,-31.35813 -2.741567,-4.3412 -5.115367,-8.90251 -6.167072,-13.95146 -1.355573,-6.50748 1.473463,-9.41812 8.030938,-8.34136 5.993021,0.9841 11.943917,2.22623 17.909818,3.37319 1.852224,0.35606 3.671383,1.28109 6.183929,0.0802 C 41.90077,100.20111 31.150724,92.651953 22.210047,82.897027 11.106532,70.782279 2.8375246,57.23316 0.33722327,40.656136 -1.260299,30.064536 2.7965214,26.175256 12.81082,29.9537 c 10.087601,3.806059 19.861424,8.506238 29.582873,13.207326 22.479628,10.870661 44.578701,22.467938 65.209247,36.623293 3.77659,2.591261 6.03923,0.86318 8.71185,-1.482109 21.49797,-18.865126 46.07862,-32.141978 73.79749,-39.056357 56.19563,-14.017765 108.60885,-4.870114 157.07503,26.844126 7.72831,5.057094 15.44602,10.130738 23.14761,15.228446 4.81363,3.186127 9.82279,4.062365 15.6641,3.051769 39.68376,-6.865578 79.52368,-8.836246 119.53509,-2.909991 2.47045,0.365891 5.15684,0.37081 6.46481,3.385516 -1.89216,3.283255 -5.19541,2.980143 -8.22465,3.289944 -28.71045,2.936179 -57.42132,6.317118 -85.16612,14.448767 -46.31273,13.57367 -78.36869,40.82487 -88.27471,90.85591 -7.1516,36.11958 -21.41477,69.86313 -43.70079,99.60357 -21.19071,28.27885 -49.92276,44.8997 -84.14271,52.514 -1.10741,0.24641 -2.25112,0.8996 -3.39531,-0.16045 -0.78992,-2.21663 1.12364,-2.54429 2.41657,-3.15401 59.39632,-28.00997 95.25887,-74.60791 109.37574,-138.39749 3.86067,-17.4449 7.92537,-34.80945 15.29353,-51.23007 5.75831,-12.83264 13.71333,-24.27804 21.87082,-35.59091 2.74454,-3.80615 2.686,-6.25802 -1.09229,-9.32055 C 330.84081,94.639702 313.04594,85.332426 291.96278,84.754039 264.15915,83.991268 242.50664,96.55218 225.35546,117.7063 c -2.34295,2.88974 -4.25473,6.12906 -6.5844,9.57912 z" />
            <circle cx="304" cy="121" r="15" />
          </svg>
        </div>
        <span class="font-bold text-blue-400">Colibri</span>
      </div>

      <div class="flex items-center gap-2 place-self-center">
        <a
          href={PACKAGE_REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-white transition
          duration-200 outline-hidden focus-visible:ring-3
          ring-blue-500"
          aria-label="GitHub repository"
          title="GitHub repository"
        >
          <Github />
        </a>
        <a
          href={resolve("/changelog")}
          class="flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-white transition
          duration-200 outline-hidden focus-visible:ring-3
          ring-blue-500"
          aria-label="Changelog"
          title="Changelog"
        >
          <HistoryIcon class="size-5" />
        </a>
        <a
          href={resolve("/feed.xml")}
          target="_blank"
          class="flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-white transition
          duration-200 outline-hidden focus-visible:ring-3
          ring-blue-500"
          aria-label="RSS Feed"
          title="RSS Feed"
        >
          <RssIcon class="size-5" />
        </a>
        <a
          href={resolve("/sitemap")}
          class="flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-white transition
          duration-200 outline-hidden focus-visible:ring-3
          ring-blue-500"
          aria-label="Sitemap"
          title="Sitemap"
        >
          <MapIcon class="size-5" />
        </a>
      </div>

      <p class="text-gray-500 text-sm text-end">
        &copy; {new Date().getFullYear()}, the Colibri maintainers.<br />
        Colibri is Open Source Software, licensed under AGPL v3.0.
      </p>
    </div>
    <!-- endregion -->
  </div>
</footer>
