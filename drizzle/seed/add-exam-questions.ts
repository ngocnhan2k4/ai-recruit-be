/**
 * Script to add more test exam questions to the database.
 * Follows the same structure as exam-seed.ts: skills + questions.
 * Run: bun run drizzle/seed/add-exam-questions.ts
 * Ensure DATABASE_URL is set (e.g. in .env).
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { inArray, eq } from "drizzle-orm";
import {
  skills,
  questions,
} from "../../src/frameworks/data-services/postgres/models";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: "snake_case" });

type QuestionSeed = {
  skillId: string | undefined;
  questionText: string;
  options: string[];
  correctAnswer: string;
  point: number;
  difficultyLevels: string[];
};

async function addMoreExamQuestions() {
  console.log("🌱 Adding more exam questions...");

  try {
    // 1. Skills to use (must exist from main seed or exam-seed)
    const skillNames = [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "Python",
      "SQL",
      "Git",
    ];

    const existingSkills = await db
      .select()
      .from(skills)
      .where(inArray(skills.name, skillNames));

    const skillMap = new Map(existingSkills.map((s) => [s.name, s.id]));

    // Create missing skills (e.g. SQL, Git if not in main seed)
    const existingNames = existingSkills.map((s) => s.name);
    const toCreate = skillNames.filter((n) => !existingNames.includes(n));
    if (toCreate.length > 0) {
      await db
        .insert(skills)
        .values(
          toCreate.map((name) => ({ name, description: `${name} skill` })),
        )
        .onConflictDoNothing();
      const afterInsert = await db
        .select()
        .from(skills)
        .where(inArray(skills.name, skillNames));
      afterInsert.forEach((s) => skillMap.set(s.name, s.id));
    }

    console.log(`✅ Skills resolved: ${skillNames.join(", ")}`);

    // 2. New questions (same structure as exam-seed)
    const newQuestionsData: QuestionSeed[] = [
      // --- JavaScript ---
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What is the output of: typeof null?",
        options: ['"object"', '"null"', '"undefined"', '"number"'],
        correctAnswer: '"object"',
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What does Array.prototype.map() return?",
        options: [
          "A new array with transformed elements",
          "The same array modified",
          "A single value",
          "undefined",
        ],
        correctAnswer: "A new array with transformed elements",
        point: 8,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What is the 'this' keyword in an arrow function?",
        options: [
          "Lexically bound to the enclosing context",
          "Always refers to the global object",
          "Refers to the function itself",
          "Undefined",
        ],
        correctAnswer: "Lexically bound to the enclosing context",
        point: 12,
        difficultyLevels: ["medium", "hard"],
      },
      // --- TypeScript ---
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What does 'strictNullChecks' do in tsconfig?",
        options: [
          "Ensures null and undefined are checked explicitly",
          "Disables null values",
          "Makes all types nullable",
          "Removes undefined from types",
        ],
        correctAnswer: "Ensures null and undefined are checked explicitly",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What is 'keyof' in TypeScript?",
        options: [
          "Creates a union type of an object's keys",
          "Gets the key of a value",
          "A runtime function",
          "A deprecated keyword",
        ],
        correctAnswer: "Creates a union type of an object's keys",
        point: 12,
        difficultyLevels: ["hard", "advanced"],
      },
      // --- React ---
      {
        skillId: skillMap.get("React"),
        questionText: "What is useCallback used for?",
        options: [
          "Memoizing callback functions to prevent re-creation",
          "Creating async callbacks",
          "Calling APIs",
          "Binding events",
        ],
        correctAnswer: "Memoizing callback functions to prevent re-creation",
        point: 12,
        difficultyLevels: ["hard"],
      },
      {
        skillId: skillMap.get("React"),
        questionText: "What is the recommended way to update state based on previous state?",
        options: [
          "Pass a function to setState (e.g. setCount(c => c + 1))",
          "Always use the current state variable directly",
          "Use refs instead",
          "Mutate state in place",
        ],
        correctAnswer: "Pass a function to setState (e.g. setCount(c => c + 1))",
        point: 10,
        difficultyLevels: ["medium"],
      },
      // --- Node.js ---
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is the purpose of __dirname in Node.js?",
        options: [
          "Directory name of the current module",
          "Global directory path",
          "User home directory",
          "Project root path",
        ],
        correctAnswer: "Directory name of the current module",
        point: 8,
        difficultyLevels: ["easy", "medium"],
      },
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What does the 'buffer' module provide?",
        options: [
          "Handling binary data",
          "Caching HTTP responses",
          "File path utilities",
          "Environment variables",
        ],
        correctAnswer: "Handling binary data",
        point: 10,
        difficultyLevels: ["medium"],
      },
      // --- Python ---
      {
        skillId: skillMap.get("Python"),
        questionText: "What is the 'with' statement used for?",
        options: [
          "Context managers and resource cleanup",
          "Looping with index",
          "Conditional blocks",
          "Importing modules",
        ],
        correctAnswer: "Context managers and resource cleanup",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("Python"),
        questionText: "What does 'if __name__ == \"__main__\":' do?",
        options: [
          "Runs code only when the script is executed directly",
          "Defines the main class",
          "Checks for main function",
          "Imports main module",
        ],
        correctAnswer: "Runs code only when the script is executed directly",
        point: 8,
        difficultyLevels: ["easy", "medium"],
      },
      // --- SQL (if skill exists) ---
      {
        skillId: skillMap.get("SQL"),
        questionText: "What does the SQL JOIN clause do?",
        options: [
          "Combines rows from two or more tables based on a related column",
          "Inserts new rows",
          "Deletes duplicate rows",
          "Sorts the result set",
        ],
        correctAnswer: "Combines rows from two or more tables based on a related column",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("SQL"),
        questionText: "What is the difference between WHERE and HAVING?",
        options: [
          "WHERE filters rows before grouping, HAVING filters after GROUP BY",
          "They are the same",
          "HAVING is used only with INSERT",
          "WHERE is for aggregates only",
        ],
        correctAnswer: "WHERE filters rows before grouping, HAVING filters after GROUP BY",
        point: 12,
        difficultyLevels: ["medium", "hard"],
      },
      // --- Git ---
      {
        skillId: skillMap.get("Git"),
        questionText: "What does 'git rebase' do?",
        options: [
          "Reapplies commits on top of another base branch",
          "Creates a new branch",
          "Reverts the last commit",
          "Merges two branches",
        ],
        correctAnswer: "Reapplies commits on top of another base branch",
        point: 12,
        difficultyLevels: ["hard"],
      },
      {
        skillId: skillMap.get("Git"),
        questionText: "What is the purpose of 'git stash'?",
        options: [
          "Temporarily save uncommitted changes",
          "Delete all changes",
          "Create a backup branch",
          "Commit to a different branch",
        ],
        correctAnswer: "Temporarily save uncommitted changes",
        point: 8,
        difficultyLevels: ["easy", "medium"],
      },
    ];

    const validQuestions = newQuestionsData.filter(
      (q): q is QuestionSeed & { skillId: string } => q.skillId != null,
    );

    if (validQuestions.length === 0) {
      console.log("⚠️ No valid questions (skills not found). Run db:seed or exam-seed first.");
      return;
    }

    // 3. Idempotency: skip questions that already exist (same skill_id + question_text)
    const skillIds = [...new Set(validQuestions.map((q) => q.skillId))];
    const existingBySkill = new Map<string, Set<string>>();
    for (const sid of skillIds) {
      const rows = await db
        .select({ questionText: questions.questionText })
        .from(questions)
        .where(eq(questions.skillId, sid));
      existingBySkill.set(sid, new Set(rows.map((r) => r.questionText)));
    }

    const toInsert = validQuestions.filter((q) => {
      const texts = existingBySkill.get(q.skillId)!;
      if (texts.has(q.questionText)) return false;
      texts.add(q.questionText);
      return true;
    });

    if (toInsert.length > 0) {
      await db.insert(questions).values(
        toInsert.map((q) => ({
          skillId: q.skillId,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          point: q.point,
          difficultyLevels: q.difficultyLevels,
        })),
      );
      console.log(`✅ Inserted ${toInsert.length} new questions.`);
    } else {
      console.log("ℹ️ All questions already exist; nothing to insert.");
    }

    console.log("\n🎉 Add exam questions completed.");
  } catch (error) {
    console.error("❌ Error adding exam questions:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  addMoreExamQuestions()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { addMoreExamQuestions };
