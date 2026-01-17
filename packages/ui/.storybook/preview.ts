import type { Preview } from "@storybook/sveltekit";
import "@fontsource-variable/material-symbols-outlined/full.css";
import "@fontsource/neuton/400-italic.css";
import "@fontsource/neuton/400.css";
import "@fontsource/neuton/700.css";
import "@fontsource/titillium-web";
import "../src/storybook.css";

const preview = {
  tags: ["autodocs"],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    docs: { toc: true },
  },
} satisfies Preview;

export default preview;
