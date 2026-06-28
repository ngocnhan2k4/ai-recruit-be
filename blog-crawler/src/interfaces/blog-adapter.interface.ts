export interface CrawledArticle {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  categories: string[];
  thumbnail?: string;
  creator?: string;
}

export interface IBlogAdapter {
  getSourceName(): string;
  fetchArticles(): Promise<CrawledArticle[]>;
}
