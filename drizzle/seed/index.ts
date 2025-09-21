import { categories } from "@/frameworks/data-services/postgres/model/category.model";
import { skills } from "@/frameworks/data-services/postgres/model/skill.model";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm/sql/sql";
import { Pool } from "pg";

const categoriesData = ["Frontend Developer", "Backend Developer"];
const skillsData = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Django",
  "React",
  "Node.js",
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Insert categories - skip if name already exists
  await db
    .insert(categories)
    .values(categoriesData.map((name) => ({ name })))
    .onConflictDoNothing({ target: categories.name });

  // Insert skills - skip if name already exists
  await db
    .insert(skills)
    .values(skillsData.map((name) => ({ name })))
    .onConflictDoNothing({ target: skills.name });

  console.log("✅ Seeded categories and skills!");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
