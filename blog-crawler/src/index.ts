import * as dotenv from "dotenv";
import { Database } from "./database/db";
import { BlogCrawlerService } from "./services/blog-crawler.service";
import { DevToAdapter } from "./adapters/dev-to.adapter";
import { LocalTagNormalizer } from "./strategies/local-tag-normalizer.strategy";

dotenv.config();

async function run() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const db = new Database();
  const tagNormalizer = new LocalTagNormalizer();
  const crawlerService = new BlogCrawlerService(db, tagNormalizer);
  crawlerService.registerAdapter(new DevToAdapter());

  try {
    await crawlerService.syncAll();
    console.log("Synchronized successfully");
  } catch (error) {
    console.error("Execution failed:", error);
  } finally {
    await db.close();
  }
}

run();
