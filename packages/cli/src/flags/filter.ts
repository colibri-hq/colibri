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

type FilterObject<
  K extends string = string,
  O extends Operator = Operator,
  V = unknown,
> = {
  key: K;
  operator: O;
  value: V;
};

type ListFilter<
  K extends string,
  T extends FilterValue = FilterValue,
> = FilterObject<K, "in" | "not in", T[]>;
type StringFilter<K extends string> = FilterObject<
  K,
  "!=" | "!~" | "$~" | "=" | "^~" | "~",
  string
>;
type NumberFilter<K extends string> = FilterObject<
  K,
  "!=" | "<" | "<=" | "=" | ">" | ">=",
  number
>;
type DateFilter<K extends string> = FilterObject<
  K,
  "!=" | "<" | "<=" | "=" | ">" | ">=",
  Date
>;
type NullFilter<K extends string> = FilterObject<K, "is" | "is not", null>;
type BooleanFilter<K extends string> = FilterObject<
  K,
  "is" | "is not",
  boolean
>;
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
      const [key, operator, value] = input
        .split(
          /([=<>!~^$]+|is(?: not)?|(?:not )?in|n?eq|ne|gte?|lte?|(?:not )?like)/,
        )
        .map((v) => v.trim());

      return parseFilter(key as T, operator, value);
    },
    required: false,
  });

function parseFilter<K extends string>(
  key: K,
  operator: string | undefined,
  value: string | undefined,
) {
  const parsedValue = parseValue(value);
  const parsedOperator = resolveOperator(operator);

  if (
    parsedOperator === "is" ||
    parsedOperator === "is not" ||
    parsedValue === null
  ) {
    return buildNullFilter(key, parsedOperator ?? "is not");
  }

  if (parsedValue instanceof Date) {
    return buildDateFilter(key, parsedOperator, parsedValue);
  }

  if (typeof parsedValue === "boolean") {
    return buildBooleanFilter(key, parsedOperator, parsedValue);
  }

  if (typeof parsedValue === "number") {
    return buildNumberFilter(key, parsedOperator, parsedValue);
  }

  if (parsedOperator === "in" || parsedOperator === "not in") {
    return buildListFilter(key, parsedOperator, parsedValue);
  }

  return buildStringFilter(key, parsedOperator, parsedValue);
}

function buildNullFilter<T extends string>(
  key: T,
  operator: string | undefined,
): NullFilter<T> {
  if (operator !== "is" && operator !== "is not") {
    throw new Error(
      `Invalid filter value "null" for operator "${operator}". ` +
        `Expected a null comparison operator (is, is not).`,
    );
  }

  return {
    key,
    operator,
    value: null,
  };
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
        `Expected a date comparison operator (<, <=, >, >=, =, !=).`,
    );
  }

  return {
    key,
    operator,
    value,
  };
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
        `Expected a boolean comparison operator (=, !=, is, is not).`,
    );
  }

  return {
    key,
    operator,
    value,
  };
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
        `Expected a number comparison operator (<, <=, >, >=, =, !=).`,
    );
  }

  return {
    key,
    operator,
    value: Number(value),
  };
}

function buildListFilter<T extends string>(
  key: T,
  operator: string | undefined,
  value: string,
): ListFilter<T> {
  if (operator !== "in" && operator !== "not in") {
    throw new Error(
      `Invalid filter value "${value}" for operator "${operator}". ` +
        `Expected a list comparison operator (in, not in).`,
    );
  }

  return {
    key,
    operator,
    value: value.split(",").map((v) => v.trim()),
  };
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
        `Expected a string comparison operator (=, !=, !~, ~, ^~, $~).`,
    );
  }

  return {
    key,
    operator,
    value,
  };
}

function parseValue(value: string | undefined): FilterValue {
  const lowerValue = value?.toLowerCase();

  if (!value || lowerValue === "null") {
    return null;
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  if (lowerValue === "true" || lowerValue === "false") {
    return lowerValue === "true";
  }

  if (!Number.isNaN(Number(value))) {
    return Number(value);
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  return value;
}

// eslint-disable-next-line complexity
function resolveOperator(operator: string | undefined) {
  switch (operator) {
    case "":
    case undefined: {
      return;
    }

    case "!=":
    case "!~":
    case "<":
    case "<=":
    case "=":
    case ">":
    case ">=":
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
