import * as dotenv from "dotenv";
import { DevToAdapter } from "./adapters/dev-to.adapter";
import { Database } from "./database/db";
import { BlogCrawlerService } from "./services/blog-crawler.service";
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
    console.log("Blog crawler synchronized successfully");
  } catch (error) {
    console.error("Execution failed:", error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

run().catch((error) => {
  console.error("Unhandled execution error:", error);
  process.exit(1);
});
