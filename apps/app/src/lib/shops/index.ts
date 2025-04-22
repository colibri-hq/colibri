export interface Shop<T extends Book, V> {
  search(
    query: string,
    options?: Partial<V>,
  ): Promise<{
    results: T[];
    total: number;
  }>;
}

export interface SupportsFeaturedBooks<T extends Book, V> extends Shop<T, V> {
  getFeaturedBooks(): Promise<T[]>;
}

interface Book {
  placeholder: true;
}
