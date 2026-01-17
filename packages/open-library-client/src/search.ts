function formatValue(value: Exclude<SearchParameterValue, Array<unknown> | object>): string {
  value = String(value).trim();

  return /\s/.test(value) ? `"${value.replace(/"/g, '\\"').trim()}"` : value;
}

export function buildSearchQuery<T extends string>(parameters: SearchQuery<T>) {
  function group(values: (string | number)[], glue = " ") {
    const alternatives = values.map((item) => formatValue(item)).join(glue);

    return `(${alternatives})`;
  }

  return Object.entries(parameters)
    .flatMap(([key, value]) => {
      if (key.startsWith("!")) {
        key = `NOT ${key.slice(1)}`;
      }

      if (Array.isArray(value)) {
        const values = value.map((item) =>
          Array.isArray(item) ? group(item, " OR ") : formatValue(item),
        );

        return `${key}:${values.length > 1 ? `(${values.join(" ")})` : values.at(0)}`;
      }

      if (typeof value === "object" && value !== null) {
        const [from, to] = [
          "from" in value ? formatValue(value.from as string) : "*",
          "to" in value ? formatValue(value.to as string) : "*",
        ] as const;

        return `${key}:[${from} TO ${to}]`;
      }

      return `${key}:${formatValue(value as string)}`;
    })
    .join(" AND ");
}

type SearchParameterValue =
  | string
  | string[]
  | number
  | (string[] | number[])[]
  | { from: number; to: number }
  | { from: string; to: string }
  | { from: number }
  | { from: string }
  | { to: number }
  | { to: string };
export type SearchQuery<F extends string> = {
  [key in F | `!${F}`]?: SearchParameterValue;
};
export type BookSearchField =
  | "*"
  | "already_read_count"
  | "alternative_subtitle"
  | "alternative_title"
  | "author"
  | "author_alternative_name"
  | "author_facet"
  | "author_key"
  | "author_name"
  | "authors"
  | "availability"
  | "by_statement"
  | "contributor"
  | "cover_i"
  | "currently_reading_count"
  | "ddc"
  | "ddc_sort"
  | "description"
  | "ebook_access"
  | "edition_count"
  | "edition_key"
  | "first_publish_year"
  | "first_sentence"
  | "format"
  | "has_fulltext"
  | "ia"
  | "ia_count"
  | "isbn"
  | "key"
  | "language"
  | "lcc"
  | "lcc_sort"
  | "lccn"
  | "lexile"
  | "number_of_pages_median"
  | "oclc"
  | "osp_count"
  | "person"
  | "person_key"
  | "place"
  | "place_key"
  | "providers"
  | "publish_date"
  | "publish_place"
  | "publish_year"
  | "publisher"
  | "publisher_facet"
  | "ratings_count"
  | "readinglog_count"
  | "redirects"
  | "subject"
  | "subject_key"
  | "subtitle"
  | "time"
  | "time_key"
  | "title"
  | "title_suggest"
  | "trending_score_hourly_sum"
  | "trending_z_score"
  | "want_to_read_count";

export type BookSearchSortFacet =
  | "already_read"
  | "currently_reading"
  | "daily"
  | "ddc_sort asc"
  | "ddc_sort desc"
  | "ddc_sort"
  | "ebook_access asc"
  | "ebook_access desc"
  | "ebook_access"
  | "editions"
  | "key asc"
  | "key desc"
  | "key"
  | "lcc_sort asc"
  | "lcc_sort desc"
  | "lcc_sort"
  | "new"
  | "old"
  | "osp_count asc"
  | "osp_count desc"
  | "osp_count"
  | "random asc"
  | "random desc"
  | "random"
  | "random.daily"
  | "random.hourly"
  | "rating asc"
  | "rating desc"
  | "rating"
  | "readinglog"
  | "scans"
  | "title"
  | "trending"
  | "want_to_read";

export type AuthorSearchField =
  | "*"
  | "alternate_names"
  | "birth_date"
  | "date"
  | "death_date"
  | "key"
  | "name"
  | "top_subjects"
  | "work_count";

export type AuthorSearchSortFacet =
  | "random asc"
  | "random desc"
  | "random"
  | "random.daily"
  | "random.hourly"
  | "work_count desc";
