import { Flags } from "@oclif/core";

type FilterValue = boolean | Date | null | number | string;
type Operator =
  | "!="
  | "!~"
  | "$~"
  | "<"
  | "<="
  | "="
  | ">"
  | ">="
  | "^~"
  | "in"
  | "is"
  | "is not"
  | "not in"
  | "~";

type FilterObject<K extends string = string, O extends Operator = Operator, V = unknown> = {
  key: K;
  operator: O;
  value: V;
};

type ListFilter<K extends string, T extends FilterValue = FilterValue> = FilterObject<
  K,
  "in" | "not in",
  T[]
>;
type StringFilter<K extends string> = FilterObject<
  K,
  "!=" | "!~" | "$~" | "=" | "^~" | "~",
  string
>;
type NumberFilter<K extends string> = FilterObject<K, "!=" | "<" | "<=" | "=" | ">" | ">=", number>;
type DateFilter<K extends string> = FilterObject<K, "!=" | "<" | "<=" | "=" | ">" | ">=", Date>;
type NullFilter<K extends string> = FilterObject<K, "is" | "is not", null>;
type BooleanFilter<K extends string> = FilterObject<K, "is" | "is not", boolean>;
export type Filter<K extends string = string> =
  | BooleanFilter<K>
  | DateFilter<K>
  | ListFilter<K>
  | NullFilter<K>
  | NumberFilter<K>
  | StringFilter<K>;

export const filterFactory = <T extends string = string>() =>
  Flags.custom<Filter<T>>({
    char: "f",
    description: "Filter records by a specific attribute.",
    multiple: true,
    multipleNonGreedy: true,
    name: "filter",
    async parse(input) {
      // Symbol operators: !=, <=, >=, !~, ^~, $~, or single =, <, >, ~
      // Word operators with word boundaries to avoid matching within identifiers (e.g., "is" in "is_active")
      const parts = input
        .split(
          /(!=|<=|>=|!~|\^~|\$~|[=<>~]|\b(?:is(?: not)?|(?:not )?in|n?eq|ne|gte?|lte?|(?:not )?like)\b)/,
        )
        .map((v) => v.trim())
        .filter((v) => v !== "");

      // Handle cases like "status=in(active,pending)" where both "=" and "in" are matched
      // parts would be: ["status", "=", "in", "(active,pending)"]
      if (parts.length >= 4 && parts[1] === "=" && (parts[2] === "in" || parts[2] === "not in")) {
        const key = parts[0];
        const operator = parts[2];
        // Remove parentheses from value: "(active,pending)" -> "active,pending"
        const value = parts.slice(3).join("").replace(/^\(/, "").replace(/\)$/, "");
        return parseFilter(key as T, operator, value);
      }

      const [key, operator, ...rest] = parts;
      const value = rest.join("");

      // Handle alternative operator syntax in value (e.g., "age=eq25" -> operator="eq", value="25")
      const wordOperatorMatch = value?.match(
        /^(eq|neq?|gte?|lte?|like|not like|is(?: not)?|(?:not )?in)\s*\(?(.*)$/i,
      );
      if (wordOperatorMatch) {
        const [, wordOp, restValue] = wordOperatorMatch;
        // Remove trailing parenthesis if present (for "in(a,b)" -> "a,b")
        const cleanValue = restValue.replace(/\)$/, "");
        return parseFilter(key as T, wordOp.toLowerCase(), cleanValue);
      }

      return parseFilter(key as T, operator, value);
    },
    required: false,
  });

function parseFilter<K extends string>(
  key: K,
  operator: string | undefined,
  value: string | undefined,
) {
  const { negated, value: parsedValue } = parseValue(value);
  const parsedOperator = resolveOperator(operator);

  if (parsedOperator === "is" || parsedOperator === "is not" || parsedValue === null) {
    // Coerce = to "is" and != to "is not" for null values
    let nullOperator = parsedOperator;
    if (parsedValue === null) {
      if (parsedOperator === "=" || !parsedOperator) {
        nullOperator = "is";
      } else if (parsedOperator === "!=") {
        nullOperator = "is not";
      }
    }
    return buildNullFilter(key, nullOperator ?? "is");
  }

  if (parsedValue instanceof Date) {
    return buildDateFilter(key, parsedOperator, parsedValue);
  }

  if (typeof parsedValue === "boolean") {
    // If the value was negated (e.g., !true), adjust the operator
    // At this point, parsedOperator is "=" or "!=" (not "is"/"is not" which were handled above)
    const effectiveOperator = negated
      ? parsedOperator === "="
        ? "is not"
        : parsedOperator === "!="
          ? "is"
          : parsedOperator
      : parsedOperator;
    return buildBooleanFilter(key, effectiveOperator, parsedValue);
  }

  if (typeof parsedValue === "number") {
    return buildNumberFilter(key, parsedOperator, parsedValue);
  }

  if (parsedOperator === "in" || parsedOperator === "not in") {
    return buildListFilter(key, parsedOperator, parsedValue);
  }

  return buildStringFilter(key, parsedOperator, parsedValue);
}

function buildNullFilter<T extends string>(key: T, operator: string | undefined): NullFilter<T> {
  if (operator !== "is" && operator !== "is not") {
    throw new Error(
      `Invalid filter value "null" for operator "${operator}". ` +
        "Expected a null comparison operator (is, is not).",
    );
  }

  return { key, operator, value: null };
}

function buildDateFilter<T extends string>(
  key: T,
  operator: string | undefined,
  value: Date,
): DateFilter<T> {
  if (
    operator !== "=" &&
    operator !== "!=" &&
    operator !== "<" &&
    operator !== "<=" &&
    operator !== ">" &&
    operator !== ">="
  ) {
    throw new Error(
      `Invalid filter value "${value}" for operator "${operator}". ` +
        "Expected a date comparison operator (<, <=, >, >=, =, !=).",
    );
  }

  return { key, operator, value };
}

function buildBooleanFilter<T extends string>(
  key: T,
  operator: string | undefined,
  value: boolean,
): BooleanFilter<T> {
  if (operator === "=") {
    operator = "is";
  } else if (operator === "!=") {
    operator = "is not";
  }

  if (operator !== "is" && operator !== "is not") {
    throw new Error(
      `Invalid filter value "${value}" for operator "${operator}". ` +
        "Expected a boolean comparison operator (=, !=, is, is not).",
    );
  }

  return { key, operator, value };
}

function buildNumberFilter<T extends string>(
  key: T,
  operator: string | undefined,
  value: number,
): NumberFilter<T> {
  if (
    operator !== "=" &&
    operator !== "!=" &&
    operator !== "<" &&
    operator !== "<=" &&
    operator !== ">" &&
    operator !== ">="
  ) {
    throw new Error(
      `Invalid filter value "${value}" for operator "${operator}". ` +
        "Expected a number comparison operator (<, <=, >, >=, =, !=).",
    );
  }

  return { key, operator, value: Number(value) };
}

function buildListFilter<T extends string>(
  key: T,
  operator: string | undefined,
  value: string,
): ListFilter<T> {
  if (operator !== "in" && operator !== "not in") {
    throw new Error(
      `Invalid filter value "${value}" for operator "${operator}". ` +
        "Expected a list comparison operator (in, not in).",
    );
  }

  return { key, operator, value: value.split(",").map((v) => v.trim()) };
}

function buildStringFilter<T extends string>(
  key: T,
  operator: string | undefined,
  value: string,
): StringFilter<T> {
  if (
    operator !== "=" &&
    operator !== "!=" &&
    operator !== "!~" &&
    operator !== "~" &&
    operator !== "^~" &&
    operator !== "$~"
  ) {
    throw new Error(
      `Invalid filter value "${value}" for operator "${operator}". ` +
        "Expected a string comparison operator (=, !=, !~, ~, ^~, $~).",
    );
  }

  return { key, operator, value };
}

type ParsedValue = { negated: boolean; value: FilterValue };

function parseValue(value: string | undefined): ParsedValue {
  const lowerValue = value?.toLowerCase();

  if (!value || lowerValue === "null") {
    return { negated: false, value: null };
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return { negated: false, value: value.slice(1, -1) };
  }

  // Handle negated booleans like !true and !false
  if (lowerValue === "!true" || lowerValue === "!false") {
    return { negated: true, value: lowerValue === "!true" };
  }

  if (lowerValue === "true" || lowerValue === "false") {
    return { negated: false, value: lowerValue === "true" };
  }

  if (!Number.isNaN(Number(value))) {
    return { negated: false, value: Number(value) };
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return { negated: false, value: date };
  }

  return { negated: false, value };
}

function resolveOperator(operator: string | undefined) {
  switch (operator) {
    case "":
    case undefined: {
      return;
    }

    case "!=":
    case "!~":
    case "$~":
    case "<":
    case "<=":
    case "=":
    case ">":
    case ">=":
    case "^~":
    case "in":
    case "is":
    case "is not":
    case "not in":
    case "~": {
      return operator;
    }

    case "eq": {
      return "=";
    }

    case "gt": {
      return ">";
    }

    case "gte": {
      return ">=";
    }

    case "like": {
      return "~";
    }

    case "lt": {
      return "<";
    }

    case "lte": {
      return "<=";
    }

    case "ne":
    case "neq": {
      return "!=";
    }

    case "not like": {
      return "!~";
    }

    default: {
      throw new Error(`Unknown comparison operator: ${operator}`);
    }
  }
}
