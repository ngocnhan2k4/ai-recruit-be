import { Pool } from "pg";
import { getSimilarity, slugify } from "../utils/string.utils";

export class Database {
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is missing");
    }
    this.pool = new Pool({ connectionString });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }

  async findOrCreateCategory(name: string): Promise<string> {
    const trimmedName = name.trim();
    const selectRes = await this.pool.query(
      "SELECT id FROM blog_categories WHERE name = $1 LIMIT 1",
      [trimmedName],
    );
    if (selectRes.rows.length > 0) {
      return selectRes.rows[0].id;
    }

    const insertRes = await this.pool.query(
      "INSERT INTO blog_categories (id, name, created_at, updated_at) VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING id",
      [trimmedName],
    );
    return insertRes.rows[0].id;
  }

  async findOrCreateTag(name: string): Promise<string> {
    const trimmedName = name.trim();
    const slug = slugify(trimmedName);
    const selectRes = await this.pool.query(
      "SELECT id FROM tags WHERE name = $1 OR slug = $2 LIMIT 1",
      [trimmedName, slug],
    );
    if (selectRes.rows.length > 0) {
      return selectRes.rows[0].id;
    }

    const insertRes = await this.pool.query(
      "INSERT INTO tags (id, name, slug, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id",
      [trimmedName, slug],
    );
    return insertRes.rows[0].id;
  }

  async getPostBySlug(slug: string): Promise<any> {
    const selectRes = await this.pool.query(
      "SELECT id FROM blog_posts WHERE slug = $1 LIMIT 1",
      [slug],
    );
    return selectRes.rows.length > 0 ? selectRes.rows[0] : null;
  }

  async getPostByTitle(title: string): Promise<any> {
    const selectRes = await this.pool.query(
      "SELECT id FROM blog_posts WHERE title = $1 LIMIT 1",
      [title.trim()],
    );
    return selectRes.rows.length > 0 ? selectRes.rows[0] : null;
  }

  async insertBlogPost(post: {
    title: string;
    slug: string;
    summary: string;
    thumbnail?: string;
    content: string;
    categoryId: string;
    authorId?: string | null;
    status: string;
    sourceType: string;
    source?: any;
  }): Promise<string> {
    const res = await this.pool.query(
      `INSERT INTO blog_posts (
        id, title, slug, summary, thumbnail, content, category_id, author_id, status, view_count, source_type, source, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, NOW(), NOW()
      ) RETURNING id`,
      [
        post.title.trim().slice(0, 240),
        post.slug.slice(0, 200),
        post.summary.trim().slice(0, 240),
        post.thumbnail ? post.thumbnail.slice(0, 250) : null,
        post.content,
        post.categoryId,
        post.authorId || null,
        post.status,
        post.sourceType,
        post.source ? JSON.stringify(post.source) : null,
      ],
    );
    return res.rows[0].id;
  }

  async linkPostTag(postId: string, tagId: string): Promise<void> {
    const checkRes = await this.pool.query(
      "SELECT 1 FROM blog_post_tags WHERE post_id = $1 AND tag_id = $2 LIMIT 1",
      [postId, tagId],
    );
    if (checkRes.rows.length === 0) {
      await this.pool.query(
        `INSERT INTO blog_post_tags (post_id, tag_id, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [postId, tagId],
      );
    }
  }

  async findSkillByNameOrSlug(name: string): Promise<string | null> {
    const trimmedName = name.trim();
    const slug = slugify(trimmedName);
    const selectRes = await this.pool.query(
      `SELECT id, name, slug FROM skills 
       WHERE LOWER(name) = LOWER($1) OR LOWER(slug) = LOWER($2)
          OR (LENGTH(name) > 2 AND (LOWER(name) LIKE LOWER($3) OR LOWER($1) LIKE '%' || LOWER(name) || '%'))`,
      [trimmedName, slug, `%${trimmedName}%`],
    );
    if (selectRes.rows.length === 0) return null;
    const candidates = selectRes.rows.map((row) => {
      const dbName = row.name.toLowerCase();
      const dbSlug = row.slug.toLowerCase();
      const inputName = trimmedName.toLowerCase();
      const inputSlug = slug.toLowerCase();
      if (dbName === inputName || dbSlug === inputSlug) {
        return { id: row.id, similarity: 1.0 };
      }
      const simName = getSimilarity(inputName, dbName);
      const simSlug = getSimilarity(inputSlug, dbSlug);
      return { id: row.id, similarity: Math.max(simName, simSlug) };
    });
    const validCandidates = candidates.filter((c) => c.similarity >= 0.8);
    if (validCandidates.length === 0) return null;
    validCandidates.sort((a, b) => b.similarity - a.similarity);
    return validCandidates[0].id;
  }

  async findTagByNameOrSlug(name: string): Promise<string | null> {
    const trimmedName = name.trim();
    const slug = slugify(trimmedName);
    const selectRes = await this.pool.query(
      `SELECT id, name, slug FROM tags 
       WHERE LOWER(name) = LOWER($1) OR LOWER(slug) = LOWER($2)
          OR (LENGTH(name) > 2 AND (LOWER(name) LIKE LOWER($3) OR LOWER($1) LIKE '%' || LOWER(name) || '%'))`,
      [trimmedName, slug, `%${trimmedName}%`],
    );
    if (selectRes.rows.length === 0) return null;
    const candidates = selectRes.rows.map((row) => {
      const dbName = row.name.toLowerCase();
      const dbSlug = row.slug.toLowerCase();
      const inputName = trimmedName.toLowerCase();
      const inputSlug = slug.toLowerCase();
      if (dbName === inputName || dbSlug === inputSlug) {
        return { id: row.id, similarity: 1.0 };
      }
      const simName = getSimilarity(inputName, dbName);
      const simSlug = getSimilarity(inputSlug, dbSlug);
      return { id: row.id, similarity: Math.max(simName, simSlug) };
    });
    const validCandidates = candidates.filter((c) => c.similarity >= 0.8);
    if (validCandidates.length === 0) return null;
    validCandidates.sort((a, b) => b.similarity - a.similarity);
    return validCandidates[0].id;
  }

  async linkPostSkill(postId: string, skillId: string): Promise<void> {
    const checkRes = await this.pool.query(
      "SELECT 1 FROM blog_post_tags WHERE post_id = $1 AND skill_id = $2 LIMIT 1",
      [postId, skillId],
    );
    if (checkRes.rows.length === 0) {
      await this.pool.query(
        `INSERT INTO blog_post_tags (post_id, skill_id, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [postId, skillId],
      );
    }
  }

  async seedTags(tagNames: string[]): Promise<void> {
    for (const name of tagNames) {
      const trimmed = name.trim();
      const slug = slugify(trimmed);
      const checkRes = await this.pool.query(
        "SELECT 1 FROM tags WHERE name = $1 OR slug = $2 LIMIT 1",
        [trimmed, slug],
      );
      if (checkRes.rows.length === 0) {
        await this.pool.query(
          "INSERT INTO tags (id, name, slug, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())",
          [trimmed, slug],
        );
      }
    }
  }

  async clearAllBlogs(): Promise<void> {
    await this.pool.query("TRUNCATE blog_posts, blog_categories CASCADE");
  }
}
