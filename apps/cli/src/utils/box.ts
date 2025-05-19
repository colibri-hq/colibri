import ansis, {inverse} from "ansis";

/**
 * Plain Theme
 *
 * Renders a box like this:
 *
 * ```
 * ┌─┤ Title ├────────┐
 * │ Hello World!     │
 * │ This is a test.  │
 * └─┤ Footer ├───────┘
 * ```
 */
export const plainTheme = {
  crossingBottomEnd: "┘",
  crossingBottomStart: "└",
  crossingTopEnd: "┐",
  crossingTopStart: "┌",
  horizontalBorder: "─",
  terminusEnd: "├",
  terminusStart: "┤",
  verticalBorder: "│",
} satisfies BoxTheme;

/**
 * Rounded Theme
 *
 * Renders a box like this:
 *
 * ```
 * ╭─┤ Title ├────────╮
 * │ Hello World!     │
 * │ This is a test.  │
 * ╰─┤ Footer ├───────╯
 * ```
 */
export const roundedTheme = {
  ...plainTheme,
  crossingBottomEnd: "╯",
  crossingBottomStart: "╰",
  crossingTopEnd: "╮",
  crossingTopStart: "╭",
} satisfies BoxTheme;

/**
 * Bold Theme
 *
 * Renders a box like this:
 *
 * ```
 * ┏━┥ Title ┝━━━━━━━━┓
 * ┃ Hello World!     ┃
 * ┃ This is a test.  ┃
 * ┗━┥ Footer ┝━━━━━━━┛
 * ```
 */
export const boldTheme = {
  crossingBottomEnd: "┛",
  crossingBottomStart: "┗",
  crossingTopEnd: "┓",
  crossingTopStart: "┏",
  horizontalBorder: "━",
  terminusEnd: "┝",
  terminusStart: "┥",
  verticalBorder: "┃",
} satisfies BoxTheme;

/**
 * Double Theme
 *
 * Renders a box like this:
 *
 * ```
 * ╔═╡ Title ╞════════╗
 * ║ Hello World!     ║
 * ║ This is a test.  ║
 * ╚═╡ Footer ╞═══════╝
 * ```
 */
export const doubleTheme = {
  crossingBottomEnd: "╝",
  crossingBottomStart: "╚",
  crossingTopEnd: "╗",
  crossingTopStart: "╔",
  horizontalBorder: "═",
  terminusEnd: "╞",
  terminusStart: "╡",
  verticalBorder: "║",
} satisfies BoxTheme;

/**
 * ANSI Theme
 *
 * Renders a box like this:
 *
 * ```
 * +-[ Title ]-------+
 * | Hello World!    |
 * | This is a test. |
 * +-[ Footer ]------+
 * ```
 */
export const ansiTheme = {
  crossingBottomEnd: "+",
  crossingBottomStart: "+",
  crossingTopEnd: "+",
  crossingTopStart: "+",
  horizontalBorder: "-",
  terminusEnd: "]",
  terminusStart: "[",
  verticalBorder: "|",
} satisfies BoxTheme;

type BoxOptions = {

  /**
   * Footer label text to display at the bottom of the box.
   *
   * If omitted, the footer will not be displayed.
   */
  footer: string | undefined;

  /**
   * Whether to invert the labels.
   *
   * If true, the labels will be rendered with inverse colors instead of displaying the theme's
   * configured terminus characters.
   */
  invertLabels: boolean;

  /**
   * Justification of the content inside the box.
   */
  justify: "center" | "end" | "start";

  /**
   * Justification of the footer label.
   *
   * If omitted, the footer will be justified according to the `justifyLabels` option.
   */
  justifyFooter: "center" | "end" | "start" | undefined;

  /**
   * Justification of the label text.
   */
  justifyLabels: "center" | "end" | "start";

  /**
   * Justification of the title label.
   *
   * If omitted, the title will be justified according to the `justifyLabels` option.
   */
  justifyTitle: "center" | "end" | "start" | undefined;

  /**
   * Margin to add to the left and right of the box.
   */
  margin: number;

  /**
   * Theme to use for the box.
   *
   * The theme defines the characters used to render the box. You can use one of the
   * predefined themes or create your own by providing an object with the following properties:
   *
   * - `crossingBottomEnd`: The character used for the bottom right corner of the box.
   * - `crossingBottomStart`: The character used for the bottom left corner of the box.
   * - `crossingTopEnd`: The character used for the top right corner of the box.
   * - `crossingTopStart`: The character used for the top left corner of the box.
   * - `horizontalBorder`: The character used for the horizontal borders of the box.
   * - `terminusEnd`: The character used for the end of the label.
   * - `terminusStart`: The character used for the start of the label.
   * - `verticalBorder`: The character used for the vertical borders of the box.
   */
  theme: BoxTheme;

  /**
   * Title label text to display at the top of the box.
   *
   * If omitted, the title will not be displayed.
   */
  title: string | undefined;

  /**
   * Width of the box.
   *
   * Can be one of the following:
   * - `"auto"`: The width will be determined based on the content and the terminal size.
   * - `"max"`: The width will be set to the maximum terminal size.
   * - `"min"`: The width will be set to the minimum content size.
   * - A number: The width will be set to the specified number of characters. If the content width
   *   exceeds this value, it will be wrapped to fit within the specified width.
   */
  width: "auto" | "max" | "min" | number;
};

export function box(content: string, options?: Partial<BoxOptions>) {
  const mergedOptions = {
    footer: undefined,
    invertLabels: true,
    justify: "start",
    justifyFooter: undefined,
    justifyLabels: "center",
    justifyTitle: undefined,
    margin: 0,
    theme: roundedTheme,
    title: undefined,
    width: "auto",
    ...options,
  } satisfies BoxOptions;
  const boxWidth = determineWidth(content, mergedOptions);

  return [
    renderTopBorder(boxWidth, mergedOptions),
    ...renderContent(content, boxWidth, mergedOptions),
    renderBottomBorder(boxWidth, mergedOptions),
  ]
  .map((line) =>
    line
    .padStart(line.length + Math.ceil(mergedOptions.margin / 2))
    .padEnd(line.length + Math.floor(mergedOptions.margin / 2)),
  )
  .join("\n");
}

function renderContent(content: string, width: number, options: BoxOptions) {
  function exceedsLength(line: string) {
    return ansis.strip(line).length > width - 4;
  }

  return content
  .split("\n")
  .flatMap((line) => {
    if (!exceedsLength(line)) {
      return [line];
    }

    const words = line.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    while (words.length > 0) {
      const word = words.shift()!;

      if (exceedsLength(`${currentLine} ${word}`)) {
        lines.push(currentLine);
        currentLine = "";
      }

      // If the word is too long, we need to split it
      if (exceedsLength(word)) {
        if (currentLine) {
          lines.push(currentLine);
        }

        currentLine = word.slice(0, width - 4);
        words.unshift(word.slice(width - 4));
      } else {
        currentLine += (currentLine ? " " : "") + word;
      }
    }

    lines.push(currentLine);

    return lines;
  })
  .map((line) => renderLine(line, width, options));
}

function renderLine(
  line: string,
  width: number,
  { justify, theme: { verticalBorder } }: BoxOptions,
) {
  const lineLength = ansis.strip(line).length;
  const padding = width - lineLength - 4;

  if (justify === "end") {
    line = " ".repeat(padding) + line;
  } else if (justify === "start") {
    line += " ".repeat(padding);
  } else {
    line =
      " ".repeat(Math.floor(padding / 2)) +
      line +
      " ".repeat(Math.floor(padding / 2) + (padding % 2));
  }

  return `${verticalBorder} ${line} ${verticalBorder}`;
}

function renderTopBorder(
  width: number,
  {
    invertLabels,
    justifyLabels,
    justifyTitle,
    theme: {
      crossingTopEnd,
      crossingTopStart,
      horizontalBorder,
      terminusEnd,
      terminusStart,
    },
    title,
  }: BoxOptions,
) {
  return renderBorder({
    border: horizontalBorder,
    end: crossingTopEnd,
    invert: invertLabels,
    justify: justifyTitle ?? justifyLabels,
    label: title,
    start: crossingTopStart,
    terminusEnd,
    terminusStart,
    width,
  });
}

function renderBottomBorder(
  width: number,
  {
    footer,
    invertLabels,
    justifyFooter,
    justifyLabels,
    theme: {
      crossingBottomEnd,
      crossingBottomStart,
      horizontalBorder,
      terminusEnd,
      terminusStart,
    },
  }: BoxOptions,
) {
  return renderBorder({
    border: horizontalBorder,
    end: crossingBottomEnd,
    invert: invertLabels,
    justify: justifyFooter ?? justifyLabels,
    label: footer,
    start: crossingBottomStart,
    terminusEnd,
    terminusStart,
    width,
  });
}

function renderBorder({
  border,
  end,
  invert,
  justify,
  label,
  start,
  terminusEnd,
  terminusStart,
  width,
}: {
  border: string;
  end: string;
  invert: boolean;
  justify: "center" | "end" | "start";
  label: string | undefined;
  start: string;
  terminusEnd: string;
  terminusStart: string;
  width: number;
}) {
  if (!label) {
    return start + border.repeat(width - 2) + end;
  }

  label = invert
    ? inverse(` ${label} `)
    : `${terminusStart} ${label} ${terminusEnd}`;

  const padding = width - ansis.strip(label).length - 2;

  if (justify === "end") {
    label = border.repeat(padding - 1) + label + border;
  } else if (justify === "start") {
    label = border + label + border.repeat(padding - 1);
  } else {
    label =
      border.repeat(Math.floor(padding / 2)) +
      label +
      border.repeat(Math.floor(padding / 2) + (padding % 2));
  }

  return start + label + end;
}

function determineWidth(content: string, { margin, title, width }: BoxOptions) {
  const titleLength = title ? ansis.strip(title).length : 0;

  if (typeof width === "number") {
    return (
      Math.min(Math.max(width, titleLength + 6), process.stdout.columns) -
      2 * margin
    );
  }

  const contentWidth = Math.min(
    Math.max(
      ...content.split("\n").map((line) => ansis.strip(line).length + 4),
      titleLength,
    ),
    process.stdout.columns,
  );

  if (width === "min") {
    return contentWidth - 2 * margin;
  }

  if (width === "max") {
    return process.stdout.columns - 2 * margin;
  }

  return (
    Math.min(Math.max(60, contentWidth), process.stdout.columns) + 2 * margin
  );
}

type BoxTheme = {
  crossingBottomEnd: string;
  crossingBottomStart: string;
  crossingTopEnd: string;
  crossingTopStart: string;
  horizontalBorder: string;
  terminusEnd: string;
  terminusStart: string;
  verticalBorder: string;
};
