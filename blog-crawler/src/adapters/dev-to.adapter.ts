import {
  CrawledArticle,
  IBlogAdapter,
} from "../interfaces/blog-adapter.interface";

export class DevToAdapter implements IBlogAdapter {
  getSourceName(): string {
    return "Dev.to";
  }

  async fetchArticles(): Promise<CrawledArticle[]> {
    const apiUrl = "https://dev.to/api/articles";
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch articles from DEV.to API: ${response.statusText}`,
      );
    }
    const articlesList = (await response.json()) as any[];

    // Fetch details for each article to get body_markdown
    const articles: (CrawledArticle | null)[] = await Promise.all(
      articlesList.slice(0, 10).map(async (item) => {
        try {
          const detailRes = await fetch(
            `https://dev.to/api/articles/${item.id}`,
          );
          if (!detailRes.ok) {
            return null;
          }
          const detail = (await detailRes.json()) as any;
          return {
            title: detail.title || "",
            link: detail.url || "",
            pubDate: detail.published_timestamp || new Date().toISOString(),
            content: detail.body_markdown || "",
            contentSnippet: detail.description || "",
            categories: detail.tags || [],
            thumbnail: detail.cover_image || undefined,
            creator: detail.user?.name || undefined,
          };
        } catch (err) {
          console.error(
            `Failed to fetch detail for DEV.to article ${item.id}:`,
            err,
          );
          return null;
        }
      }),
    );

    return articles.filter((a): a is CrawledArticle => a !== null);
  }
}
