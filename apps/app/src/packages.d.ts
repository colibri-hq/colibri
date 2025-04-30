declare module "svelte-file-dropzone" {
  import { SvelteComponent, type Snippet } from "svelte";

  export = SvelteComponent<{
    accept?: string;
    containerClasses?: string;
    disabled?: boolean;
    multiple?: boolean;
    children?: Snippet<[unknown]>;
  }>;
}

declare module "svelte-gravatar" {
  import { SvelteComponent } from "svelte";

  /**
   * Gravatar component
   *
   * Renders a Gravatar image based on the email address.
   *
   * @param {string} [alt] - Alt text
   * @param {string} email - Email address
   * @param {string} [md5] - MD5 hash of the email address
   * @param {string} [protocol] - Protocol (http or https)
   * @param {string} [domain] - Domain name
   * @param {number} [size] - Size of the image
   * @param {'404' | 'mp' | 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'blank'} [default] - Default image
   * @param {'g' | 'pg' | 'r' | 'x'} [rating=g] - Image rating
   * @param {string} [class] - Class name
   * @param {string} [style] - Style attribute
   */
  export default SvelteComponent<{
    alt?: string;
    email: string;
    md5?: string;
    protocol?: string;
    domain?: string;
    size?: number;
    default?:
      | "404"
      | "mp"
      | "identicon"
      | "monsterid"
      | "wavatar"
      | "retro"
      | "robohash"
      | "blank";
    rating?: "g" | "pg" | "r" | "x";
    class?: string;
    style?: string;
  }>;
}
