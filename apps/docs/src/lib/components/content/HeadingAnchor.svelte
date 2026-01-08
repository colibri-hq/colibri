<script lang="ts">
  type Props = {
    target: string;
    title?: string;
    class?: string;
    [key: string]: unknown;
  };

  const { target, title = target, class: className, ...rest }: Props = $props();
</script>

<a
  {...rest}
  class="{className} absolute top-0 left-0 font-medium select-none opacity-0 no-underline transition
  group-hover/heading:opacity-100 before:content-['#'] before:text-gray-400 hover:before:text-blue-500
  focus-visible:opacity-100 focus-visible:before:text-blue-500 outline-hidden size-6 flex
  items-center justify-center in-[h1]:mt-4.5 in-[h2]:mt-1.5 in-[h3]:mt-1 in-[h4]:mt-0.5 in-[h1]:-ms-9 in-[h2]:-ms-8
  in-[h3]:-ms-7.5 in-[h4]:-ms-6.5 in-[h5]:-ms-6 in-[h6]:-ms-5.5"
  href="#{target}"
  aria-label="Permalink to {title}"
>
  ​
</a>
