import { IBlogAdapter } from "../interfaces/blog-adapter.interface";
import { Database } from "../database/db";
import { generateSlug } from "../utils/string.utils";
import { ITagNormalizer } from "../interfaces/tag-normalizer.interface";
import { CATEGORY_RULES } from "./categories.data";

function mapTagsToCategory(tags: string[], defaultCategory: string): string {
  if (!tags || tags.length === 0) return defaultCategory;

  const categoryScores: Record<string, number> = {};
  for (const category of Object.keys(CATEGORY_RULES)) {
    categoryScores[category] = 0;
  }

  for (const rawTag of tags) {
    const tag = rawTag.toLowerCase().trim();
    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
      for (const keyword of keywords) {
        if (tag === keyword) {
          categoryScores[category] += 5;
        } else if (tag.includes(keyword)) {
          categoryScores[category] += 2;
        }
      }
    }
  }

  let bestCategory = defaultCategory;
  let maxScore = 0;

  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

export class BlogCrawlerService {
  private adapters: IBlogAdapter[] = [];
  private db: Database;
  private tagNormalizer: ITagNormalizer;

  constructor(db: Database, tagNormalizer: ITagNormalizer) {
    this.db = db;
    this.tagNormalizer = tagNormalizer;
  }

  registerAdapter(adapter: IBlogAdapter): void {
    this.adapters.push(adapter);
  }

  async syncAll(): Promise<void> {
    const defaultCategoryName = "Technology";

    // Verify database connection first
    try {
      await this.db.getPool().query("SELECT 1");
      console.log("Database connection verified successfully");
    } catch (dbErr) {
      throw new Error(`Database connection failed: ${(dbErr as Error).message}`);
    }

    for (const adapter of this.adapters) {
      const articles = await adapter.fetchArticles();
      console.log(`Fetched ${articles.length} articles from ${adapter.getSourceName()}`);

      for (const article of articles) {
        try {
          const existingPost = await this.db.getPostByTitle(article.title);
          if (existingPost) {
            console.log(`Skipping duplicate: ${article.title}`);
            continue;
          }

          const baseSlug = generateSlug(article.title);

          const articleCategoryName = mapTagsToCategory(
            article.categories || [],
            defaultCategoryName,
          );
          const categoryId =
            await this.db.findOrCreateCategory(articleCategoryName);

          const postId = await this.db.insertBlogPost({
            title: article.title,
            slug: baseSlug,
            summary: article.title,
            thumbnail: article.thumbnail,
            content: "",
            categoryId,
            status: "PENDING",
            sourceType: "CRAWLED",
            source: {
              url: article.link,
              author: article.creator || null,
              platform: adapter.getSourceName(),
            },
          });

          console.log(`Imported: ${article.title}`);

          if (article.categories && article.categories.length > 0) {
            for (const tagOfArticle of article.categories) {
              try {
                const cleanTag =
                  await this.tagNormalizer.normalize(tagOfArticle);
                if (!cleanTag) continue;

                const skillId = await this.db.findSkillByNameOrSlug(cleanTag);
                if (skillId) {
                  await this.db.linkPostSkill(postId, skillId);
                  continue;
                }

                const tagId = await this.db.findTagByNameOrSlug(cleanTag);
                if (tagId) {
                  await this.db.linkPostTag(postId, tagId);
                }
              } catch (tagErr) {
                console.error(`Failed to link tag ${tagOfArticle}:`, tagErr);
              }
            }
          }
        } catch (postErr) {
          console.error(
            `Failed to import article ${article.title}:`,
            postErr,
          );
          // If we fail to insert because of connection issues, throw it
          if (postErr instanceof Error && (postErr.message.includes("connection") || postErr.message.includes("closed"))) {
            throw postErr;
          }
        }
      }
    }
  }
}
