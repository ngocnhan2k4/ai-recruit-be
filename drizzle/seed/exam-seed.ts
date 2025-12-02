import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { inArray } from "drizzle-orm";
import {
  areas,
  skills,
  questions,
  levels,
} from "../../src/frameworks/data-services/postgres/models";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: "snake_case" });

async function seedExamData() {
  console.log("🌱 Starting exam system seed...");

  try {
    // 1. Create Areas
    console.log("Creating areas...");
    const [programmingArea] = await db
      .insert(areas)
      .values([
        {
          name: "Programming",
          description: "Software development and programming skills assessment",
        },
      ])
      .onConflictDoNothing({ target: [areas.name] })
      .returning();

    console.log(`✅ Created area: ${programmingArea.name}`);

    // 2. Get or create skills
    console.log("Getting skills...");
    const skillNames = [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "Python",
    ];

    // Check if skills exist, if not create them
    const existingSkills = await db
      .select()
      .from(skills)
      .where(inArray(skills.name, skillNames));

    const existingSkillNames = existingSkills.map((s) => s.name);
    const skillsToCreate = skillNames.filter(
      (name) => !existingSkillNames.includes(name),
    );

    if (skillsToCreate.length > 0) {
      await db
        .insert(skills)
        .values(skillsToCreate.map((name) => ({ name, description: `${name} skill` })))
        .onConflictDoNothing();
    }

    // Get all skills
    const allSkills = await db
      .select()
      .from(skills)
      .where(inArray(skills.name, skillNames));

    const skillMap = new Map(allSkills.map((s) => [s.name, s.id]));

    console.log(`✅ Skills ready: ${skillNames.join(", ")}`);

    // 3. Create Levels for Programming Area
    console.log("Creating levels...");
    await db
      .insert(levels)
      .values([
        {
          areaId: programmingArea.id,
          levelName: "Beginner",
          minScore: 0,
          maxScore: 50,
        },
        {
          areaId: programmingArea.id,
          levelName: "Intermediate",
          minScore: 51,
          maxScore: 120,
        },
        {
          areaId: programmingArea.id,
          levelName: "Advanced",
          minScore: 121,
          maxScore: 180,
        },
        {
          areaId: programmingArea.id,
          levelName: "Expert",
          minScore: 181,
          maxScore: 300,
        },
      ])
      .onConflictDoNothing();

    console.log("✅ Created 4 levels for Programming area");

    // 4. Create Questions
    console.log("Creating questions...");

    const questionsData = [
      // JavaScript Questions
      {
        skillId: skillMap.get("JavaScript"),
        areaId: programmingArea.id,
        questionText: "What is JavaScript?",
        options: [
          "A programming language",
          "A framework",
          "A database",
          "An operating system",
        ],
        correctAnswer: "A programming language",
        point: 5,
        difficulty: "easy" as const,
      },
      {
        skillId: skillMap.get("JavaScript"),
        areaId: programmingArea.id,
        questionText: "What does 'const' keyword do in JavaScript?",
        options: [
          "Declares a constant variable",
          "Declares a function",
          "Declares a class",
          "Declares an object",
        ],
        correctAnswer: "Declares a constant variable",
        point: 8,
        difficulty: "easy" as const,
      },
      {
        skillId: skillMap.get("JavaScript"),
        areaId: programmingArea.id,
        questionText:
          "What is the difference between '==' and '===' in JavaScript?",
        options: [
          "'===' checks both value and type, '==' only checks value",
          "They are the same",
          "'==' checks both value and type, '===' only checks value",
          "Neither checks type",
        ],
        correctAnswer:
          "'===' checks both value and type, '==' only checks value",
        point: 10,
        difficulty: "medium" as const,
      },
      {
        skillId: skillMap.get("JavaScript"),
        areaId: programmingArea.id,
        questionText: "What is a closure in JavaScript?",
        options: [
          "A function that has access to variables from an outer function",
          "A way to close a file",
          "A type of loop",
          "A method to end a program",
        ],
        correctAnswer:
          "A function that has access to variables from an outer function",
        point: 15,
        difficulty: "hard" as const,
      },
      {
        skillId: skillMap.get("JavaScript"),
        areaId: programmingArea.id,
        questionText: "What is event delegation in JavaScript?",
        options: [
          "A technique of handling events at a higher level in the DOM",
          "Assigning events to multiple elements",
          "Removing event listeners",
          "Creating custom events",
        ],
        correctAnswer:
          "A technique of handling events at a higher level in the DOM",
        point: 15,
        difficulty: "hard" as const,
      },

      // TypeScript Questions
      {
        skillId: skillMap.get("TypeScript"),
        areaId: programmingArea.id,
        questionText: "What is TypeScript?",
        options: [
          "A superset of JavaScript with static typing",
          "A database",
          "A framework",
          "An IDE",
        ],
        correctAnswer: "A superset of JavaScript with static typing",
        point: 5,
        difficulty: "easy" as const,
      },
      {
        skillId: skillMap.get("TypeScript"),
        areaId: programmingArea.id,
        questionText: "What is an interface in TypeScript?",
        options: [
          "A way to define the structure of an object",
          "A network connection",
          "A type of function",
          "A class method",
        ],
        correctAnswer: "A way to define the structure of an object",
        point: 10,
        difficulty: "medium" as const,
      },
      {
        skillId: skillMap.get("TypeScript"),
        areaId: programmingArea.id,
        questionText: "What are generics in TypeScript?",
        options: [
          "A way to create reusable components that work with multiple types",
          "A type of variable",
          "A built-in function",
          "A class decorator",
        ],
        correctAnswer:
          "A way to create reusable components that work with multiple types",
        point: 15,
        difficulty: "hard" as const,
      },
      {
        skillId: skillMap.get("TypeScript"),
        areaId: programmingArea.id,
        questionText: "What is the 'never' type in TypeScript?",
        options: [
          "A type for functions that never return",
          "A type that can hold any value",
          "A type for null values",
          "A deprecated type",
        ],
        correctAnswer: "A type for functions that never return",
        point: 15,
        difficulty: "hard" as const,
      },

      // React Questions
      {
        skillId: skillMap.get("React"),
        areaId: programmingArea.id,
        questionText: "What is React?",
        options: [
          "A JavaScript library for building user interfaces",
          "A database",
          "A programming language",
          "An operating system",
        ],
        correctAnswer: "A JavaScript library for building user interfaces",
        point: 5,
        difficulty: "easy" as const,
      },
      {
        skillId: skillMap.get("React"),
        areaId: programmingArea.id,
        questionText: "What is JSX?",
        options: [
          "A syntax extension for JavaScript",
          "A database query language",
          "A CSS framework",
          "A testing tool",
        ],
        correctAnswer: "A syntax extension for JavaScript",
        point: 8,
        difficulty: "easy" as const,
      },
      {
        skillId: skillMap.get("React"),
        areaId: programmingArea.id,
        questionText: "What are React hooks?",
        options: [
          "Functions that let you use state and lifecycle features in function components",
          "A way to style components",
          "A routing system",
          "A state management library",
        ],
        correctAnswer:
          "Functions that let you use state and lifecycle features in function components",
        point: 10,
        difficulty: "medium" as const,
      },
      {
        skillId: skillMap.get("React"),
        areaId: programmingArea.id,
        questionText: "What is the virtual DOM in React?",
        options: [
          "A lightweight copy of the actual DOM kept in memory",
          "A CSS technique",
          "A database concept",
          "A testing framework",
        ],
        correctAnswer: "A lightweight copy of the actual DOM kept in memory",
        point: 10,
        difficulty: "medium" as const,
      },
      {
        skillId: skillMap.get("React"),
        areaId: programmingArea.id,
        questionText: "What is React Context?",
        options: [
          "A way to pass data through the component tree without props drilling",
          "A styling system",
          "A router",
          "A form handler",
        ],
        correctAnswer:
          "A way to pass data through the component tree without props drilling",
        point: 15,
        difficulty: "hard" as const,
      },

      // Node.js Questions
      {
        skillId: skillMap.get("Node.js"),
        areaId: programmingArea.id,
        questionText: "What is Node.js?",
        options: [
          "A JavaScript runtime built on Chrome's V8 engine",
          "A framework",
          "A database",
          "A programming language",
        ],
        correctAnswer: "A JavaScript runtime built on Chrome's V8 engine",
        point: 5,
        difficulty: "easy" as const,
      },
      {
        skillId: skillMap.get("Node.js"),
        areaId: programmingArea.id,
        questionText: "What is npm?",
        options: [
          "A package manager for Node.js",
          "A programming language",
          "A database",
          "A web server",
        ],
        correctAnswer: "A package manager for Node.js",
        point: 5,
        difficulty: "easy" as const,
      },
      {
        skillId: skillMap.get("Node.js"),
        areaId: programmingArea.id,
        questionText: "What is Express.js?",
        options: [
          "A web application framework for Node.js",
          "A database ORM",
          "A testing framework",
          "A CSS framework",
        ],
        correctAnswer: "A web application framework for Node.js",
        point: 10,
        difficulty: "medium" as const,
      },
      {
        skillId: skillMap.get("Node.js"),
        areaId: programmingArea.id,
        questionText: "What is middleware in Express?",
        options: [
          "Functions that have access to request and response objects",
          "A database layer",
          "A frontend component",
          "A testing tool",
        ],
        correctAnswer: "Functions that have access to request and response objects",
        point: 10,
        difficulty: "medium" as const,
      },
      {
        skillId: skillMap.get("Node.js"),
        areaId: programmingArea.id,
        questionText: "What is the event loop in Node.js?",
        options: [
          "A mechanism that handles asynchronous callbacks",
          "A for loop variant",
          "A database query loop",
          "A frontend rendering loop",
        ],
        correctAnswer: "A mechanism that handles asynchronous callbacks",
        point: 15,
        difficulty: "hard" as const,
      },

      // Python Questions
      {
        skillId: skillMap.get("Python"),
        areaId: programmingArea.id,
        questionText: "What is Python?",
        options: [
          "A high-level programming language",
          "A snake",
          "A framework",
          "A database",
        ],
        correctAnswer: "A high-level programming language",
        point: 5,
        difficulty: "easy" as const,
      },
      {
        skillId: skillMap.get("Python"),
        areaId: programmingArea.id,
        questionText: "What is a list comprehension in Python?",
        options: [
          "A concise way to create lists",
          "A type of loop",
          "A function decorator",
          "A class method",
        ],
        correctAnswer: "A concise way to create lists",
        point: 10,
        difficulty: "medium" as const,
      },
      {
        skillId: skillMap.get("Python"),
        areaId: programmingArea.id,
        questionText: "What is a decorator in Python?",
        options: [
          "A function that modifies another function",
          "A way to style code",
          "A type of variable",
          "A loop construct",
        ],
        correctAnswer: "A function that modifies another function",
        point: 15,
        difficulty: "hard" as const,
      },
      {
        skillId: skillMap.get("Python"),
        areaId: programmingArea.id,
        questionText: "What is the difference between a list and a tuple in Python?",
        options: [
          "Lists are mutable, tuples are immutable",
          "They are the same",
          "Tuples are mutable, lists are immutable",
          "Lists are faster",
        ],
        correctAnswer: "Lists are mutable, tuples are immutable",
        point: 10,
        difficulty: "medium" as const,
      },
      {
        skillId: skillMap.get("Python"),
        areaId: programmingArea.id,
        questionText: "What is a generator in Python?",
        options: [
          "A function that yields values one at a time",
          "A random number generator",
          "A class constructor",
          "A loop type",
        ],
        correctAnswer: "A function that yields values one at a time",
        point: 15,
        difficulty: "hard" as const,
      },
    ];

    // Filter out questions with undefined skillId
    const validQuestionsData = questionsData.filter((q) => q.skillId !== undefined);

    if (validQuestionsData.length > 0) {
      await db.insert(questions).values(validQuestionsData as any).onConflictDoNothing();
    }

    console.log(`✅ Created ${validQuestionsData.length} questions`);

    console.log("\n🎉 Exam system seed completed successfully!");
    console.log("\n📊 Summary:");
    console.log("  - 1 Area (Programming)");
    console.log("  - 5 Skills (JavaScript, TypeScript, React, Node.js, Python)");
    console.log("  - 4 Levels (Beginner, Intermediate, Advanced, Expert)");
    console.log(`  - ${questionsData.length} Questions`);
    console.log("\n💡 You can now:");
    console.log("  1. Start an exam by selecting the Programming area and up to 5 skills");
    console.log("  2. System will generate 20 randomized questions");
    console.log("  3. Submit answers to get score and level assessment");
  } catch (error) {
    console.error("❌ Error seeding exam data:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedExamData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedExamData };
