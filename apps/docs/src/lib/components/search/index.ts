import { createContext } from "svelte";

export { default as SearchTrigger } from "./SearchTrigger.svelte";

export const [getSearchContext, setSearchContext] = createContext<{
  open: () => void;
}>();
