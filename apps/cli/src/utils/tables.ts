import ansis, { bold, gray, green, red } from "ansis";
import wrapAnsi from "wrap-ansi";

/**
 * Divider
 *
 * A special value that can be used to render a divider line in the table.
 */
export const divider = Symbol.for("divider");

/**
 * Renders a table with the given rows and columns.
 *
 * @param data Data to be displayed in the table, as an array of objects.
 * @param columns Array of objects describing the columns to be displayed.
 * @param options Optional configuration object for table formatting.
 */
export function table<T extends Row>(
  data: (T | typeof divider)[],
  columns: Column<T>[],
  options?: TableOptions<T>,
): string {
  const { displayHeader, format, interiorBorders, theme, width } = mergeOptions(options);

  // Format all header cells first, so we can determine the column widths
  const headerRow = columns.map(({ name }) => bold(name));

  // Format all rows and their cells; again so we can determine the column widths
  const rows = data.map((row) =>
    row === divider ? divider : columns.map((column) => formatValue(row, column, format)),
  );

  // Create a memoized text wrapping function to avoid recalculating it for each cell
  const wrapText = textWrapping();

  const layout = generateLayout(columns, headerRow, rows, { theme, width }, wrapText);

  const header = renderHeader(headerRow, columns, layout, { displayHeader, theme });
  const body = renderBody(rows, columns, layout, { interiorBorders, theme }, wrapText);

  return [
    renderSeparator(layout, theme, "top"),
    ...header,
    ...body,
    renderSeparator(layout, theme, "bottom"),
  ].join("\n");
}

// region Themes

/**
 * Plain Theme
 *
 * A basic theme that uses simple box-drawing characters to render the table.
 * This is the default theme used by the `table` function if no theme is
 * specified explicitly.
 * Note that this theme requires a terminal that supports Unicode box-drawing
 * characters to render correctly. If that is not the case, consider using
 * the {@link asciiTheme `asciiTheme`} instead.
 *
 * @example Renders a table like this:
 * ```
 * ┌─────────────┬─────────────┬─────────────┐
 * │ Column 1    │ Column 2    │ Column 3    │
 * ├─────────────┼─────────────┼─────────────┤
 * │ Row 1       │ Row 1       │ Row 1       │
 * ├─────────────┼─────────────┼─────────────┤
 * │ Row 2       │ Row 2       │ Row 2       │
 * │ Row 3       │ Row 3       │ Row 3       │
 * └─────────────┴─────────────┴─────────────┘
 * ```
 */
export const plainTheme = {
  crossing: "┼",
  crossingBottomEnd: "┘",
  crossingBottomMid: "┴",
  crossingBottomStart: "└",
  crossingHeadEndBottom: "┤",
  crossingHeadMidBottom: "┼",
  crossingHeadStartBottom: "├",
  crossingMidEnd: "┤",
  crossingMidStart: "├",
  crossingTopEnd: "┐",
  crossingTopMid: "┬",
  crossingTopStart: "┌",
  horizontalInsideBorder: "─",
  horizontalOutsideBorder: "─",
  padding: " ",
  verticalInsideBorder: "│",
  verticalOutsideBorder: "│",
} satisfies TableTheme;

/**
 * Rounded Theme
 *
 * A theme based on the default plain theme that uses rounded corners for the
 * table, providing for a more visually appealing appearance.
 *
 * @example Renders a table like this:
 * ```
 * ╭─────────────┬─────────────┬─────────────╮
 * │ Column 1    │ Column 2    │ Column 3    │
 * ├─────────────┼─────────────┼─────────────┤
 * │ Row 1       │ Row 1       │ Row 1       │
 * ├─────────────┼─────────────┼─────────────┤
 * │ Row 2       │ Row 2       │ Row 2       │
 * │ Row 3       │ Row 3       │ Row 3       │
 * ╰─────────────┴─────────────┴─────────────╯
 * ```
 */
export const roundedTheme = {
  ...plainTheme,
  crossingBottomEnd: "╯",
  crossingBottomStart: "╰",
  crossingTopEnd: "╮",
  crossingTopStart: "╭",
} satisfies TableTheme;

/**
 * Bold Theme
 *
 * A theme that uses bold characters to render the outer borders and crossings
 * of the table, providing a more pronounced appearance.
 *
 * @example Renders a table like this:
 * ```
 * ┏━━━━━━━━━━━━━┯━━━━━━━━━━━━━┯━━━━━━━━━━━━━┓
 * ┃ Column 1    │ Column 2    │ Column 3    ┃
 * ┣━━━━━━━━━━━━━┿━━━━━━━━━━━━━┿━━━━━━━━━━━━━┫
 * ┃ Row 1       │ Row 1       │ Row 1       ┃
 * ┠─────────────┼─────────────┼─────────────┨
 * ┃ Row 2       │ Row 2       │ Row 2       ┃
 * ┃ Row 3       │ Row 3       │ Row 3       ┃
 * ┗━━━━━━━━━━━━━┷━━━━━━━━━━━━━┷━━━━━━━━━━━━━┛
 * ```
 */
export const boldTheme = {
  crossing: "┼",
  crossingBottomEnd: "┛",
  crossingBottomMid: "┷",
  crossingBottomStart: "┗",
  crossingHeadEndBottom: "┫",
  crossingHeadMidBottom: "┿",
  crossingHeadStartBottom: "┣",
  crossingMidEnd: "┨",
  crossingMidStart: "┠",
  crossingTopEnd: "┓",
  crossingTopMid: "┯",
  crossingTopStart: "┏",
  horizontalInsideBorder: "─",
  horizontalOutsideBorder: "━",
  padding: " ",
  verticalInsideBorder: "│",
  verticalOutsideBorder: "┃",
} satisfies TableTheme;

/**
 * Double Box Drawing Theme
 *
 * A theme that uses double box-drawing characters to render the outer borders
 * of the table, providing a more pronounced and visually appealing appearance.
 *
 * @example Renders a table like this:
 * ```
 * ╔═════════════╤═════════════╤═════════════╗
 * ║ Column 1    │ Column 2    │ Column 3    ║
 * ╠═════════════╪═════════════╪═════════════╣
 * ║ Row 1       │ Row 1       │ Row 1       ║
 * ╟─────────────┼─────────────┼─────────────╢
 * ║ Row 2       │ Row 2       │ Row 2       ║
 * ║ Row 3       │ Row 3       │ Row 3       ║
 * ╚═════════════╧═════════════╧═════════════╝
 * ```
 */
export const doubleBoxTheme = {
  crossing: "┼",
  crossingBottomEnd: "╝",
  crossingBottomMid: "╧",
  crossingBottomStart: "╚",
  crossingHeadEndBottom: "╣",
  crossingHeadMidBottom: "╪",
  crossingHeadStartBottom: "╠",
  crossingMidEnd: "╢",
  crossingMidStart: "╟",
  crossingTopEnd: "╗",
  crossingTopMid: "╤",
  crossingTopStart: "╔",
  horizontalInsideBorder: "─",
  horizontalOutsideBorder: "═",
  padding: " ",
  verticalInsideBorder: "│",
  verticalOutsideBorder: "║",
} satisfies TableTheme;

/**
 * ASCII Theme
 *
 * A theme that uses only ASCII characters to render the table, making it suitable
 * for environments that do not support Unicode characters.
 *
 * @example Renders a table like this:
 * ```
 * +-------------+-------------+-------------+
 * | Column 1    | Column 2    | Column 3    |
 * |-------------+-------------+-------------+
 * | Row 1       | Row 1       | Row 1       |
 * |-------------+-------------+-------------+
 * | Row 2       | Row 2       | Row 2       |
 * | Row 3       | Row 3       | Row 3       |
 * +-------------+-------------+-------------+
 * ```
 */
export const asciiTheme = {
  crossing: "+",
  crossingBottomEnd: "+",
  crossingBottomMid: "+",
  crossingBottomStart: "+",
  crossingHeadEndBottom: "+",
  crossingHeadMidBottom: "+",
  crossingHeadStartBottom: "+",
  crossingMidEnd: "+",
  crossingMidStart: "+",
  crossingTopEnd: "+",
  crossingTopMid: "+",
  crossingTopStart: "+",
  horizontalInsideBorder: "-",
  horizontalOutsideBorder: "-",
  padding: " ",
  verticalInsideBorder: "|",
  verticalOutsideBorder: "|",
} satisfies TableTheme;

/**
 * Invisible Theme
 *
 * A theme that renders a table without any visible borders or separators.
 * This can be useful for displaying data in a compact format. Note that
 * horizontal borders are still present and will render as empty lines, so any
 * sections in the table will still be visually separated.
 *
 * @example Renders a table like this:
 * ```
 *
 *  Column 1     Column 2     Column 3
 *
 *  Row 1        Row 1        Row 1
 *
 *  Row 2        Row 2        Row 2
 *  Row 3        Row 3        Row 3
 *
 * ```
 */
export const invisibleTheme = {
  crossing: "",
  crossingBottomEnd: "",
  crossingBottomMid: "",
  crossingBottomStart: "",
  crossingHeadEndBottom: "",
  crossingHeadMidBottom: "",
  crossingHeadStartBottom: "",
  crossingMidEnd: "",
  crossingMidStart: "",
  crossingTopEnd: "",
  crossingTopMid: "",
  crossingTopStart: "",
  horizontalInsideBorder: "",
  horizontalOutsideBorder: "",
  padding: " ",
  verticalInsideBorder: "",
  verticalOutsideBorder: "",
} satisfies TableTheme;

// endregion

// region Rendering Utilities

function mergeOptions<T extends Row>(options: TableOptions<T> | undefined) {
  const defaultOptions = {
    displayHeader: true,
    format: {
      format: String,
      formatBoolean: (value: boolean) => (value ? green("✓") : red("✗")),
      formatDate: (value: Date) => value.toLocaleDateString(),
      formatNull: () => gray("—"),
      formatNumber: (value: number) => value.toLocaleString(),
      formatString: (value: string) => value.toLocaleString(),
    } satisfies TableFormatOptions<T>,
    interiorBorders: false,
    theme: plainTheme,
    width: "auto" as const,
  };

  return {
    ...defaultOptions,
    ...options,
    format: {
      ...defaultOptions.format,
      ...(typeof options?.format === "function" ? { format: options.format } : {}),
    },
    theme: { ...defaultOptions.theme, ...options?.theme },
  } satisfies Required<TableOptions<T>>;
}

function generateLayout<T extends Row>(
  columns: Column<T>[],
  header: string[],
  rows: (string[] | typeof divider)[],
  {
    theme: { padding, verticalInsideBorder, verticalOutsideBorder },
    width: widthOption,
  }: Required<Pick<TableOptions<T>, "theme" | "width">> & { theme: TableTheme },
  wrapText: TextWrapper,
) {
  // Compute the natural width for each column based on the cell content
  const naturalWidths = columns.map((_column, index) =>
    Math.max(
      ansis.strip(header[index]).length,
      ...rows.filter((row) => row !== divider).map((row) => ansis.strip(row[index]).length),
    ),
  );

  // Determine max allowed width
  const maxWidth = Math.max(
    // Minimum width of 5 characters for the table to avoid strange rendering edge cases
    5,

    // Use an explicitly defined width if defined; otherwise, default to the terminal width if
    // available, or 80 characters as a fallback. This way, the table should not grow larger than
    // the terminal width.
    // Finally, subtract the decorations to avoid pushing content to the next line.
    (!widthOption || widthOption === "auto" ? (process.stdout.columns ?? 80) : widthOption) -
      padding.length * 2 -
      verticalOutsideBorder.length * 2,
  );

  // Calculate the spacing needed for the table, based on the theme
  const totalSpacing = (padding.length * 2 + verticalInsideBorder.length) * columns.length;

  const columnWidths = naturalWidths.map((width) => Math.min(width, maxWidth - totalSpacing));

  function tableWidth(widths: number[]) {
    return widths.reduce((a, b) => a + b, 0) + totalSpacing;
  }

  // If the table width exceeds the maximum allowed width, we need to reduce the column widths
  // to fit within the maximum width. We do this by reducing the column widths until the table fits
  // within the maximum width, while trying to keep the columns as wide as possible.
  if (tableWidth(naturalWidths) > maxWidth) {
    // Set a minimum column width to avoid making columns too narrow. Five is a sensible value here
    const minColumnWidth = 5;

    const candidates = columns
      .filter((column, index) => column.wrap !== false && columnWidths[index] > minColumnWidth)
      .map((column) => columns.indexOf(column));

    while (tableWidth(columnWidths) > maxWidth) {
      let minHeight = Infinity;

      let candidate: null | number = null;

      for (const index of candidates) {
        const width = columnWidths[index];
        const height = rows
          .filter((row) => row !== divider)
          .reduce((sum, row) => sum + wrapText(row[index], width - 2).length, 0);

        if (height < minHeight) {
          minHeight = height;
          candidate = index;
        }
      }

      if (candidate === null) {
        break;
      }

      columnWidths[candidate] = columnWidths[candidate] - 2;
    }
  }

  return columnWidths;
}

function renderHeader<T extends Row>(
  header: string[],
  columns: Column<T>[],
  widths: number[],
  {
    displayHeader,
    theme,
  }: Required<Pick<TableOptions<Row>, "displayHeader" | "theme"> & { theme: TableTheme }>,
) {
  if (!displayHeader) {
    return [];
  }

  return [
    renderRow(
      header.map((cell, index) => justify(cell, widths[index], columns[index], theme)),
      theme,
    ),
    renderSeparator(widths, theme, "head"),
  ];
}

function renderBody<T extends Row>(
  rows: (string[] | typeof divider)[],
  columns: Column<T>[],
  widths: number[],
  {
    interiorBorders,
    theme,
  }: Required<Pick<TableOptions<T>, "interiorBorders" | "theme">> & { theme: TableTheme },
  wrapText: TextWrapper,
) {
  return rows.flatMap((row, rowIndex) => {
    if (row === divider) {
      return [renderSeparator(widths, theme, "mid")];
    }

    const wrappedColumns = row.map((cell, index) => wrapText(cell, widths[index]));
    const maxLines = Math.max(...wrappedColumns.map(({ length }) => length));

    const aligned = wrappedColumns.map((lines, index) =>
      align(lines, maxLines, columns[index].align ?? "top").map((line) =>
        justify(line, widths[index], columns[index], theme),
      ),
    );

    const lines = Array.from({ length: maxLines }, (_, index) =>
      renderRow(
        aligned.map((column) => column[index]),
        theme,
      ),
    );

    return interiorBorders && rowIndex > 0
      ? [renderSeparator(widths, theme, "mid"), ...lines]
      : lines;
  });
}

/**
 * Renders a row of the table with the given cells.
 *
 * @param row Array of strings representing the cells in the row.
 * @param theme Theme object defining the table's appearance.
 *
 * @returns A string representing the rendered row.
 */
function renderRow(
  row: string[],
  { verticalInsideBorder: inside, verticalOutsideBorder: outside }: TableTheme,
) {
  return outside + row.join(inside) + outside;
}

/**
 * Renders a separator line for the table.
 *
 * @param columnWidths Array of numbers representing the widths of each column.
 * @param theme Theme object defining the table's appearance.
 * @param type Type of separator to render ('bottom', 'head', 'mid', or 'top').
 *
 * @returns A string representing the separator line.
 */
function renderSeparator(
  columnWidths: number[],
  {
    crossing: crossingMid,
    crossingBottomEnd: bottomEnd,
    crossingBottomMid: crossingBottom,
    crossingBottomStart: bottomStart,
    crossingHeadEndBottom: headEndBottom,
    crossingHeadMidBottom: headMidBottom,
    crossingHeadStartBottom: headStartBottom,
    crossingMidEnd: midEnd,
    crossingMidStart: midStart,
    crossingTopEnd: topEnd,
    crossingTopMid: crossingTop,
    crossingTopStart: topStart,
    horizontalInsideBorder: inside,
    horizontalOutsideBorder: outside,
    padding,
  }: TableTheme,
  type: "bottom" | "head" | "mid" | "top" = "mid",
) {
  const [start, crossing, end, horizontal] = {
    bottom: [bottomStart, crossingBottom, bottomEnd, outside],
    head: [
      headStartBottom ?? midStart,
      headMidBottom ?? crossingMid,
      headEndBottom ?? midEnd,
      outside,
    ],
    mid: [midStart, crossingMid, midEnd, inside],
    top: [topStart, crossingTop, topEnd, outside],
  }[type];
  const separator = columnWidths
    .map((width) => horizontal.repeat(width + padding.length * 2))
    .join(crossing);

  return start + separator + end;
}

/**
 * Formats a value for display in the table.
 *
 * @param row The row the value belongs to.
 * @param column The column the value belongs to.
 * @param options The formatting options to use.
 *
 * @returns The formatted value as a string.
 */
function formatValue<T extends Row>(
  row: T,
  column: Column<T>,
  {
    format,
    formatBoolean,
    formatDate,
    formatNull,
    formatNumber,
    formatString,
  }: TableFormatOptions<T>,
) {
  const value =
    typeof column.accessor === "function"
      ? (column.accessor as AccessorFn<T, T[keyof T]>)(row)
      : row[column.accessor ?? (column.name as keyof T)];

  if (column.format) {
    // @ts-expect-error -- The column format function can accept any value type
    return column.format(value, row, column);
  }

  if (value === null || value === undefined) {
    return formatNull(value as null | undefined, row, column);
  }

  if (typeof value === "number") {
    return formatNumber(value, row, column);
  }

  if (typeof value === "boolean") {
    return formatBoolean(value, row, column);
  }

  if (value instanceof Date) {
    return formatDate(value, row, column);
  }

  if (typeof value === "string") {
    return formatString(value, row, column);
  }

  return format(value, row, column);
}

/**
 * Aligns a string value to a specified width and alignment.
 *
 * @param value The string value to align.
 * @param width The width to align the value to.
 * @param justification The justification of the value (`start`, `center`, or
 *                      `end`).
 * @param fillString The string used for padding.
 *
 * @returns The justified string value.
 */
function justify<T extends Row>(
  value: string,
  width: number,
  { justify: justification }: Column<T>,
  { padding: fillString }: TableTheme,
) {
  const plainValue = ansis.strip(value);
  const pad = (amount: number = plainValue.length) =>
    fillString.repeat(Math.max(0, width - amount + fillString.length));

  if (justification === "start") {
    return fillString + value + pad();
  }

  if (justification === "end") {
    return pad() + value + fillString;
  }

  const padding = Math.max(0, Math.floor((width - plainValue.length) / 2));

  return pad(width - padding) + value + pad(plainValue.length + padding);
}

function align(lines: string[], maxLines: number, align: "bottom" | "center" | "top"): string[] {
  const padCount = maxLines - lines.length;

  if (padCount <= 0) {
    return lines;
  }

  // Content at top, blanks at bottom
  if (align === "top") {
    return [...lines, ...(Array.from({ length: padCount }).fill("") as string[])];
  }

  // Blanks at top, content at bottom
  if (align === "bottom") {
    return [...(Array.from({ length: padCount }).fill("") as string[]), ...lines];
  }

  const topPad = Math.floor(padCount / 2);
  const bottomPad = padCount - topPad;

  return [
    ...(Array.from({ length: topPad }).fill("") as string[]),
    ...lines,
    ...(Array.from({ length: bottomPad }).fill("") as string[]),
  ];
}

function textWrapping() {
  const wrapCache = new Map<string, string[]>();

  return function wrap(content: string, width: number) {
    const key = `${width}${content}`;
    let wrapped = wrapCache.get(key);

    if (!wrapped) {
      wrapped = wrapAnsi(content, width, { hard: true, trim: true, wordWrap: true }).split("\n");
      wrapCache.set(key, wrapped);
    }

    return wrapped;
  } satisfies TextWrapper;
}

type TextWrapper = (content: string, width: number) => string[];

// endregion

// region Types

type Row = object;
type AccessorFn<T extends Row, R = unknown> = (row: T) => R;

/**
 * Column
 *
 * A column definition for the table, providing control over the column's data
 * accessor and display rendering.
 */
type Column<
  T extends Row,
  K extends keyof T = keyof T,
  TAccessor extends AccessorFn<T, T[K]> | K = K,
  TFormatted extends TAccessor extends AccessorFn<T, infer R>
    ? R
    : TAccessor extends K
      ? T[K]
      : never = TAccessor extends AccessorFn<T, infer R> ? R : TAccessor extends K ? T[K] : never,
> = {
  /**
   * A function that returns the value to be displayed in the column. If not
   * provided, the column will use the value of the property with the same name
   * as the column.
   *
   * Note that the result of this function is passed to the format function.
   */
  accessor?: TAccessor;

  /**
   * The alignment of the column's header and content.
   */
  align?: "bottom" | "center" | "top";

  /**
   * A function that formats the value for display in the table. If no formatter
   * is provided, the default formatter for the data type returned by the
   * accessor, or of the property in the row, will be used.
   */
  format?: TableFormatter<T, TFormatted>;

  /**
   * The justification of the column's content. This can be 'start', 'center',
   * or 'end'. The default is 'center'.
   */
  justify?: "center" | "end" | "start";

  /**
   * The name of the column, which will be displayed in the header. If no
   * accessor is provided, this will be used as the default accessor.
   */
  name: string;

  /**
   * Whether to wrap the content of the column. If set to false, the content
   * will not be wrapped and will be truncated if it exceeds the column width.
   */
  wrap?: boolean;
};

/**
 * Table Theme
 *
 * A table theme defines the characters used to draw the table borders and separators.
 * It allows for customization of the table's appearance.
 *
 * ```
 * a═══════b═══════c══════════════════════════c══════════════════d
 * e ISBN          f Title                    │ Author           ║
 * g═══════b═══════h══════════════════════════h══════════════════i
 * ║ 99921-58-10-7 │ Divine Comedy            │ Dante Alighieri  ║
 * ║ 9971-5-0210-0 │ A Tale of Two Cities     │ Charles Dickens  ║
 * j───────k───────l──────────────────────────l──────────────────m
 * ║ 960-425-059-0 │ The Lord of the Rings    │ J. R. R. Tolkien ║
 * ║ 80-902734-1-6 │ And Then There Were None │ Agatha Christie  ║
 * n═══════════════o══════════════════════════o══════════════════p
 * ```
 *
 * - **a**: crossingTopStart (`╔`):
 *   The top left corner of the table.
 * - **b**: horizontalOutsideBorder (`═`):
 *   The horizontal outer border at the top of the table.
 * - **c**: crossingTopMid (`╤`):
 *   The middle crossing point on the outer top border of the table.
 * - **d**: crossingTopEnd (`╗`):
 *   The top right corner of the table.
 * - **e**: verticalOutsideBorder (`║`):
 *   The vertical outer border of the table.
 * - **f**: verticalInsideBorder (`│`):
 *   The vertical inner border of the table.
 * - **g**: crossingHeadStartBottom (`╠`):
 *   The left corner of the border between the header and the body.
 * - **h**: crossingHeadMidBottom (`╪`):
 *   The middle crossing point on the outer border between the header and the body.
 * - **i**: crossingHeadEndBottom (`╣`):
 *   The right corner of the border between the header and the body.
 * - **j**: crossingMidStart (`├`):
 *   The left corner of the border between two rows.
 * - **k**: horizontalInsideBorder (`─`):
 *   The horizontal inner border between two rows.
 * - **l**: crossing (`┼`):
 *   The middle crossing point on the inner border between two rows.
 * - **m**: crossingMidEnd (`┤`):
 *   The right corner of the border between two rows.
 * - **n**: crossingBottomStart (`╚`):
 *   The left corner of the outer border at the bottom of the table.
 * - **o**: crossingBottomMid (`╧`):
 *   The middle crossing point on the outer bottom border of the table.
 * - **p**: crossingBottomEnd (`╝`):
 *   The right corner of the outer border at the bottom of the table.
 */
type TableTheme = {
  crossing: string;
  crossingBottomEnd: string;
  crossingBottomMid: string;
  crossingBottomStart: string;
  crossingHeadEndBottom?: string;
  crossingHeadMidBottom?: string;
  crossingHeadStartBottom?: string;
  crossingMidEnd: string;
  crossingMidStart: string;
  crossingTopEnd: string;
  crossingTopMid: string;
  crossingTopStart: string;
  horizontalInsideBorder: string;
  horizontalOutsideBorder: string;
  padding: string;
  verticalInsideBorder: string;
  verticalOutsideBorder: string;
};

/**
 * Table Formatter
 *
 * A function that formats a value for display in the table. It takes the value,
 * the row it belongs to, and the column definition as arguments and returns
 * a formatted string.
 *
 * @example (value, row, column) => value.toString()
 */
type TableFormatter<T extends Row, V = T[keyof T]> = (
  value: V,
  row: T,
  column: Column<T>,
) => string;

/**
 * Table Format Options
 *
 * A set of functions that format different types of values for display in the table.
 * These functions are used to format boolean, date, null, number, and string values,
 * and will override the default format function if provided.
 */
type TableFormatOptions<T extends Row> = {
  /**
   * A function that formats an unknown value for display in the table.
   *
   * This function is used as a fallback for all types of values.
   */
  format: TableFormatter<T>;

  /**
   * A function that formats a boolean value for display in the table.
   */
  formatBoolean: TableFormatter<T, boolean>;

  /**
   * A function that formats a date value for display in the table.
   */
  formatDate: TableFormatter<T, Date>;

  /**
   * A function that formats a null or undefined value for display in the table.
   */
  formatNull: TableFormatter<T, null | undefined>;

  /**
   * A function that formats a number value for display in the table.
   */
  formatNumber: TableFormatter<T, number>;

  /**
   * A function that formats a string value for display in the table.
   */
  formatString: TableFormatter<T, string>;
};

/**
 * Table Options
 *
 * Options for customizing the appearance and behavior of the table.
 */
type TableOptions<T extends Row> = {
  /**
   * Whether to display the header row with column names.
   */
  displayHeader?: boolean;

  /**
   * Either a function that formats the value for display in the table,
   * or an object with functions for formatting different types of values.
   */
  format?: Partial<TableFormatOptions<T>> | TableFormatter<T>;

  /**
   * Whether to display interior borders between rows. This is useful for
   * tables with many columns, as it makes it easier to read the data.
   */
  interiorBorders?: boolean;

  /**
   * A theme object that defines the characters used to draw the table borders
   * and separators. This allows for customization of the table's appearance.
   *
   * If not provided, the default box-drawing character theme will be used.
   */
  theme?: Partial<TableTheme>;

  /**
   * The width of the table. This can be set to 'auto' to automatically
   * fit the table to the terminal width, or a specific number to set
   * a fixed width.
   */
  width?: "auto" | number;
};

// endregion
