// @ts-nocheck
/**
 * Svelte preprocessor to transform :::type callout syntax into HTML.
 * This runs BEFORE mdsvex processes the markdown.
 *
 * Syntax:
 * ```markdown
 * :::note
 * This is a note.
 * :::
 *
 * :::warning[Custom Title]
 * This is a warning with a custom title.
 * :::
 * ```
 */

const CALLOUT_CONFIG = {
  note: { title: "Note", icon: "💡" },
  tip: { title: "Tip", icon: "✅" },
  warning: { title: "Warning", icon: "⚠️" },
  danger: { title: "Danger", icon: "🚨" },
};

/**
 * Transform callout syntax in markdown text
 * @param {string} markdown
 * @returns {string}
 */
function transformCallouts(markdown) {
  // Match :::type or :::type[Custom Title] followed by content and closing :::
  const calloutRegex = /^:::(\w+)(?:\[([^\]]+)])?\s*\n([\s\S]*?)\n:::\s*$/gm;

  return markdown.replace(calloutRegex, (match, type, customTitle, content) => {
    const config = CALLOUT_CONFIG[type];

    // Not a known callout type, leave unchanged
    if (!config) {
      return match;
    }

    const title = customTitle || config.title;
    const icon = config.icon;

    // Return HTML that mdsvex will pass through
    return `<aside class="callout" data-type="${type}" role="note">
      <div class="flex items-center gap-3 font-bold">
        <span class="text-lg">${icon}</span>
        <span class="uppercase tracking-wide callout__title">${title}</span>
      </div>
      <div class="*:first:mt-0 *:last:mb-0">

        ${content.trim()}

      </div>
    </aside>`;
  });
}

/**
 * Svelte preprocessor for callout syntax
 * @returns {import('svelte/compiler').PreprocessorGroup}
 */
export function calloutsPreprocessor() {
  return {
    name: "callouts",
    markup({ content, filename }) {
      // Only process .md files
      if (!filename?.endsWith(".md")) {
        return;
      }

      const code = transformCallouts(content);

      if (code !== content) {
        return { code };
      }
    },
  };
}
