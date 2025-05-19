import ansis, { bold, gray, green, red } from "ansis";

/**
 * Divider
 *
 * A special value that can be used to render a divider line in the table.
 */
export const divider = Symbol.for("divider");

/**
 * Renders a table with the given rows and columns.
 *
 * @param rows Data to be displayed in the table, as an array of objects.
 * @param columns Array of objects describing the columns to be displayed.
 * @param options Optional configuration object for table formatting.
 */
export function table<T extends Row>(
  rows: (T | typeof divider)[],
  columns: Column<T>[],
  options?: TableOptions<T>,
): string {
  const defaultOptions = {
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
  const { format, interiorBorders, theme } = {
    ...defaultOptions,
    ...options,
    format: {
      ...defaultOptions.format,
      ...(typeof options?.format === "function"
        ? { format: options.format }
        : {}),
    },
    theme: {
      ...defaultOptions.theme,
      ...options?.theme,
    },
  } satisfies Required<TableOptions<T>>;
  const header = columns.map(({ name }) => bold(name));
  const renderedRows = rows.map((row) =>
    row === divider
      ? divider
      : columns.map((column) => formatValue(row, column, format)),
  );
  const columnWidths = columns.map((_column, index) =>
    Math.max(
      ansis.strip(header[index]).length,
      ...renderedRows
        .filter((row) => row !== divider)
        .map((row) => ansis.strip(row[index]).length),
    ),
  );

  return [
    renderSeparator(columnWidths, theme, "top"),
    renderRow(
      header.map((cell, index) =>
        align(cell, columnWidths[index], columns[index], theme),
      ),
      theme,
    ),
    renderSeparator(columnWidths, theme, "head"),
    ...renderedRows
      .map((row) =>
        row === divider
          ? divider
          : row.map((cell, index) =>
              align(cell, columnWidths[index], columns[index], theme),
            ),
      )
      .flatMap((cells, index) =>
        [
          cells === divider || (index > 0 && interiorBorders)
            ? renderSeparator(columnWidths, theme, "mid")
            : undefined,
          cells === divider ? undefined : renderRow(cells, theme),
        ].filter((line): line is string => line !== undefined),
      ),
    renderSeparator(columnWidths, theme, "bottom"),
  ].join("\n");
}

/**
 * Plain Theme
 *
 * Renders a table like this:
 *
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
 * Renders a table like this:
 *
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
 * Renders a table like this:
 *
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
 * Renders a table like this:
 *
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
 * ANSI Theme
 *
 * Renders a table like this:
 *
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
export const ansiTheme = {
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
      ? column.accessor(row)
      : row[column.accessor ?? (column.name as keyof T)];

  if (column.format) {
    return column.format(value as T[keyof T], row, column);
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
 * @param alignment The alignment of the value ('start', 'center', or 'end').
 * @param fillString The string used for padding.
 *
 * @returns The aligned string value.
 */
function align<T extends Row>(
  value: string,
  width: number,
  { align: alignment }: Column<T>,
  { padding: fillString }: TableTheme,
) {
  const plainValue = ansis.strip(value);
  const pad = (amount: number = plainValue.length) =>
    fillString.repeat(width - amount + fillString.length);

  if (alignment === "start") {
    return fillString + value + pad();
  }

  if (alignment === "end") {
    return pad() + value + fillString;
  }

  const padding = Math.max(0, Math.floor((width - plainValue.length) / 2));

  return pad(width - padding) + value + pad(plainValue.length + padding);
}

type Row = object;

/**
 * Column
 *
 * A column definition for the table, providing control over the column's
 * data accessor and display rendering.
 */
type Column<T extends Row, K extends keyof T = keyof T> = {
  /**
   * A function that returns the value to be displayed in the column.
   * If not provided, the column will use the value of the property
   * with the same name as the column.
   *
   * Note that the result of this function is passed to the format function.
   */
  accessor?:
    | ((row: T) => boolean | Date | null | number | string | undefined)
    | K;

  /**
   * The alignment of the column's content. This can be 'start', 'center',
   * or 'end'. The default is 'center'.
   */
  align?: "center" | "end" | "start";

  /**
   * A function that formats the value for display in the table. If no formatter
   * is provided, the default formatter for the data type returned by the accessor,
   * or of the property in the row, will be used.
   */
  format?: TableFormatter<T, T[K]>;

  /**
   * The name of the column, which will be displayed in the header. If no accessor
   * is provided, this will be used as the default accessor.
   */
  name: string;
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
