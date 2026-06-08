import { eq, SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { blogPosts } from "@/frameworks/data-services/postgres/models";
import type { DBDrizzle } from "@/frameworks/data-services/postgres/types";

type BlogLocaleContent = Partial<{
  title: string;
  summary: string;
  content: string;
}>;

type BlogLocaleMap = Partial<Record<string, BlogLocaleContent>>;

type Options = {
  dryRun: boolean;
  limit?: number;
  postId?: string;
};

const loadEnvFiles = () => {
  for (const envFile of [".env", ".env.development", ".env.production"]) {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
};

const parseArgs = (): Options => {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.split("=");
    if (key.startsWith("--")) {
      args.set(key, value ?? "true");
    }
  }

  const limit = Number(args.get("--limit") ?? 0);

  return {
    dryRun: (args.get("--dry-run") ?? "false") === "true",
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    postId: args.get("--postId"),
  };
};

const normalizeLocaleMap = (value: unknown): BlogLocaleMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [languageCode, localeValue]) => {
      if (
        !localeValue ||
        typeof localeValue !== "object" ||
        Array.isArray(localeValue)
      ) {
        return acc;
      }

      const normalizedLocale = Object.entries(
        localeValue as Record<string, unknown>,
      ).reduce((localeAcc, [field, fieldValue]) => {
        if (
          (field === "title" || field === "summary" || field === "content") &&
          typeof fieldValue === "string"
        ) {
          localeAcc[field] = fieldValue;
        }

        return localeAcc;
      }, {} as BlogLocaleContent);

      if (Object.keys(normalizedLocale).length > 0) {
        acc[languageCode] = normalizedLocale;
      }

      return acc;
    },
    {} as BlogLocaleMap,
  );
};

const buildNextLocales = (post: {
  title: string;
  summary: string;
  content: string;
  locales: unknown;
}): BlogLocaleMap => {
  const nextLocales = normalizeLocaleMap(post.locales);

  nextLocales.vi = {
    ...(nextLocales.vi ?? {}),
    title: post.title,
    summary: post.summary,
    content: post.content,
  };

  return nextLocales;
};

async function main() {
  loadEnvFiles();
  const options = parseArgs();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  const db = drizzle(pool, { casing: "snake_case" }) as DBDrizzle;

  try {
    const whereClause: SQL | undefined = options.postId
      ? eq(blogPosts.id, options.postId)
      : undefined;

    const baseQuery = db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        summary: blogPosts.summary,
        content: blogPosts.content,
        locales: blogPosts.locales,
      })
      .from(blogPosts);

    const filteredQuery = whereClause
      ? baseQuery.where(whereClause)
      : baseQuery;
    const posts = options.limit
      ? await filteredQuery.limit(options.limit)
      : await filteredQuery;

    let updatedCount = 0;

    for (const post of posts) {
      const currentLocales = normalizeLocaleMap(post.locales);
      const nextLocales = buildNextLocales(post);

      if (JSON.stringify(currentLocales) === JSON.stringify(nextLocales)) {
        continue;
      }

      updatedCount += 1;

      if (options.dryRun) {
        console.log(`[dry-run] would update blog post ${post.id}`);
        continue;
      }

      await db
        .update(blogPosts)
        .set({
          locales: nextLocales,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, post.id));
    }

    console.log(
      `[blog-locales] scanned=${posts.length} updated=${updatedCount} dryRun=${options.dryRun}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[blog-locales] backfill failed", error);
  process.exit(1);
});
