import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { inArray } from "drizzle-orm";
import {
  skills,
  questions,
} from "../../src/frameworks/data-services/postgres/models";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: "snake_case" });

async function seedExamData() {
  console.log("🌱 Starting exam system seed...");

  try {
    // 1. Get or create skills
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

    // 2. Create Questions
    console.log("Creating questions...");

    const questionsData = [
      // JavaScript Questions
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What is JavaScript?",
        options: [
          "A programming language",
          "A framework",
          "A database",
          "An operating system",
        ],
        correctAnswer: "A programming language",
        point: 5,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What does 'const' keyword do in JavaScript?",
        options: [
          "Declares a constant variable",
          "Declares a function",
          "Declares a class",
          "Declares an object",
        ],
        correctAnswer: "Declares a constant variable",
        point: 8,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("JavaScript"),
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
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("JavaScript"),
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
        difficultyLevels: ["hard", "advanced"],
      },
      {
        skillId: skillMap.get("JavaScript"),
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
        difficultyLevels: ["hard"],
      },

      // TypeScript Questions
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What is TypeScript?",
        options: [
          "A superset of JavaScript with static typing",
          "A database",
          "A framework",
          "An IDE",
        ],
        correctAnswer: "A superset of JavaScript with static typing",
        point: 5,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What is an interface in TypeScript?",
        options: [
          "A way to define the structure of an object",
          "A network connection",
          "A type of function",
          "A class method",
        ],
        correctAnswer: "A way to define the structure of an object",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("TypeScript"),
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
        difficultyLevels: ["hard", "advanced"],
      },
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What is the 'never' type in TypeScript?",
        options: [
          "A type for functions that never return",
          "A type that can hold any value",
          "A type for null values",
          "A deprecated type",
        ],
        correctAnswer: "A type for functions that never return",
        point: 15,
        difficultyLevels: ["advanced", "expert"],
      },

      // React Questions
      {
        skillId: skillMap.get("React"),
        questionText: "What is React?",
        options: [
          "A JavaScript library for building user interfaces",
          "A database",
          "A programming language",
          "An operating system",
        ],
        correctAnswer: "A JavaScript library for building user interfaces",
        point: 5,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("React"),
        questionText: "What is JSX?",
        options: [
          "A syntax extension for JavaScript",
          "A database query language",
          "A CSS framework",
          "A testing tool",
        ],
        correctAnswer: "A syntax extension for JavaScript",
        point: 8,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("React"),
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
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("React"),
        questionText: "What is the virtual DOM in React?",
        options: [
          "A lightweight copy of the actual DOM kept in memory",
          "A CSS technique",
          "A database concept",
          "A testing framework",
        ],
        correctAnswer: "A lightweight copy of the actual DOM kept in memory",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("React"),
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
        difficultyLevels: ["hard"],
      },

      // Node.js Questions
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is Node.js?",
        options: [
          "A JavaScript runtime built on Chrome's V8 engine",
          "A framework",
          "A database",
          "A programming language",
        ],
        correctAnswer: "A JavaScript runtime built on Chrome's V8 engine",
        point: 5,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is npm?",
        options: [
          "A package manager for Node.js",
          "A programming language",
          "A database",
          "A web server",
        ],
        correctAnswer: "A package manager for Node.js",
        point: 5,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is Express.js?",
        options: [
          "A web application framework for Node.js",
          "A database ORM",
          "A testing framework",
          "A CSS framework",
        ],
        correctAnswer: "A web application framework for Node.js",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is middleware in Express?",
        options: [
          "Functions that have access to request and response objects",
          "A database layer",
          "A frontend component",
          "A testing tool",
        ],
        correctAnswer: "Functions that have access to request and response objects",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is the event loop in Node.js?",
        options: [
          "A mechanism that handles asynchronous callbacks",
          "A for loop variant",
          "A database query loop",
          "A frontend rendering loop",
        ],
        correctAnswer: "A mechanism that handles asynchronous callbacks",
        point: 15,
        difficultyLevels: ["hard", "advanced"],
      },

      // Python Questions
      {
        skillId: skillMap.get("Python"),
        questionText: "What is Python?",
        options: [
          "A high-level programming language",
          "A snake",
          "A framework",
          "A database",
        ],
        correctAnswer: "A high-level programming language",
        point: 5,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("Python"),
        questionText: "What is a list comprehension in Python?",
        options: [
          "A concise way to create lists",
          "A type of loop",
          "A function decorator",
          "A class method",
        ],
        correctAnswer: "A concise way to create lists",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("Python"),
        questionText: "What is a decorator in Python?",
        options: [
          "A function that modifies another function",
          "A way to style code",
          "A type of variable",
          "A loop construct",
        ],
        correctAnswer: "A function that modifies another function",
        point: 15,
        difficultyLevels: ["hard", "advanced"],
      },
      {
        skillId: skillMap.get("Python"),
        questionText: "What is the difference between a list and a tuple in Python?",
        options: [
          "Lists are mutable, tuples are immutable",
          "They are the same",
          "Tuples are mutable, lists are immutable",
          "Lists are faster",
        ],
        correctAnswer: "Lists are mutable, tuples are immutable",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("Python"),
        questionText: "What is a generator in Python?",
        options: [
          "A function that yields values one at a time",
          "A random number generator",
          "A class constructor",
          "A loop type",
        ],
        correctAnswer: "A function that yields values one at a time",
        point: 15,
        difficultyLevels: ["hard", "expert"],
      },

      // Additional JavaScript Questions
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What is the purpose of 'use strict'?",
        options: [
          "Enforces stricter parsing and error handling",
          "Makes code run faster",
          "Enables ES6 features",
          "Disables all warnings",
        ],
        correctAnswer: "Enforces stricter parsing and error handling",
        point: 8,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What is prototypal inheritance?",
        options: [
          "Objects can inherit properties from other objects",
          "Classes inherit from classes",
          "Functions inherit from functions",
          "Variables inherit from variables",
        ],
        correctAnswer: "Objects can inherit properties from other objects",
        point: 12,
        difficultyLevels: ["medium", "hard"],
      },
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What does Promise.all() do?",
        options: [
          "Waits for all promises to resolve or any to reject",
          "Runs promises sequentially",
          "Cancels all promises",
          "Returns the first resolved promise",
        ],
        correctAnswer: "Waits for all promises to resolve or any to reject",
        point: 10,
        difficultyLevels: ["medium", "hard"],
      },
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What is the event loop?",
        options: [
          "Mechanism for handling asynchronous operations",
          "A type of for loop",
          "A way to bind events",
          "A DOM manipulation method",
        ],
        correctAnswer: "Mechanism for handling asynchronous operations",
        point: 15,
        difficultyLevels: ["hard", "advanced"],
      },
      {
        skillId: skillMap.get("JavaScript"),
        questionText: "What is hoisting?",
        options: [
          "Variable and function declarations are moved to the top",
          "Raising exceptions",
          "Lifting objects to memory",
          "Optimizing code",
        ],
        correctAnswer: "Variable and function declarations are moved to the top",
        point: 10,
        difficultyLevels: ["medium"],
      },

      // Additional TypeScript Questions
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What is a type alias?",
        options: [
          "A way to give a type a new name",
          "A class method",
          "A function parameter",
          "A variable declaration",
        ],
        correctAnswer: "A way to give a type a new name",
        point: 8,
        difficultyLevels: ["easy", "medium"],
      },
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What is the difference between interface and type?",
        options: [
          "Interfaces can be extended and merged, types cannot be merged",
          "They are exactly the same",
          "Types are deprecated",
          "Interfaces are only for objects",
        ],
        correctAnswer: "Interfaces can be extended and merged, types cannot be merged",
        point: 12,
        difficultyLevels: ["medium", "hard"],
      },
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What is a union type?",
        options: [
          "A type that can be one of several types",
          "A type that combines all properties",
          "A database operation",
          "A class inheritance pattern",
        ],
        correctAnswer: "A type that can be one of several types",
        point: 8,
        difficultyLevels: ["easy", "medium"],
      },
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What does the 'readonly' modifier do?",
        options: [
          "Prevents property modification after initialization",
          "Makes properties private",
          "Optimizes memory usage",
          "Enables caching",
        ],
        correctAnswer: "Prevents property modification after initialization",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("TypeScript"),
        questionText: "What are conditional types?",
        options: [
          "Types that depend on a condition",
          "If-else statements for runtime",
          "Optional properties",
          "Nullable types",
        ],
        correctAnswer: "Types that depend on a condition",
        point: 15,
        difficultyLevels: ["advanced", "expert"],
      },

      // Additional React Questions
      {
        skillId: skillMap.get("React"),
        questionText: "What is useEffect used for?",
        options: [
          "Performing side effects in function components",
          "Creating state variables",
          "Styling components",
          "Routing between pages",
        ],
        correctAnswer: "Performing side effects in function components",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("React"),
        questionText: "What is the purpose of keys in lists?",
        options: [
          "Help React identify which items have changed",
          "Encrypt data",
          "Style list items",
          "Create unique IDs",
        ],
        correctAnswer: "Help React identify which items have changed",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("React"),
        questionText: "What is prop drilling?",
        options: [
          "Passing props through multiple component layers",
          "Validating props",
          "Creating default props",
          "Destructuring props",
        ],
        correctAnswer: "Passing props through multiple component layers",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("React"),
        questionText: "What is useMemo used for?",
        options: [
          "Memoizing expensive computations",
          "Managing state",
          "Creating side effects",
          "Handling events",
        ],
        correctAnswer: "Memoizing expensive computations",
        point: 12,
        difficultyLevels: ["hard"],
      },
      {
        skillId: skillMap.get("React"),
        questionText: "What is React.memo?",
        options: [
          "A higher-order component for memoization",
          "A state hook",
          "A routing component",
          "A styling utility",
        ],
        correctAnswer: "A higher-order component for memoization",
        point: 12,
        difficultyLevels: ["hard", "advanced"],
      },

      // Additional Node.js Questions
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is the purpose of package.json?",
        options: [
          "Store project metadata and dependencies",
          "Execute JavaScript code",
          "Configure the database",
          "Define routes",
        ],
        correctAnswer: "Store project metadata and dependencies",
        point: 5,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is the difference between require() and import?",
        options: [
          "require() is CommonJS, import is ES6 modules",
          "They are the same",
          "import is deprecated",
          "require() is faster",
        ],
        correctAnswer: "require() is CommonJS, import is ES6 modules",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is process.env used for?",
        options: [
          "Accessing environment variables",
          "Managing processes",
          "Debugging code",
          "Error handling",
        ],
        correctAnswer: "Accessing environment variables",
        point: 8,
        difficultyLevels: ["easy", "medium"],
      },
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is a stream in Node.js?",
        options: [
          "An abstract interface for working with streaming data",
          "A database connection",
          "A file path",
          "A network protocol",
        ],
        correctAnswer: "An abstract interface for working with streaming data",
        point: 12,
        difficultyLevels: ["hard"],
      },
      {
        skillId: skillMap.get("Node.js"),
        questionText: "What is cluster module used for?",
        options: [
          "Creating child processes to handle load",
          "Database clustering",
          "CSS bundling",
          "File compression",
        ],
        correctAnswer: "Creating child processes to handle load",
        point: 15,
        difficultyLevels: ["advanced", "expert"],
      },

      // Additional Python Questions
      {
        skillId: skillMap.get("Python"),
        questionText: "What is PEP 8?",
        options: [
          "Python style guide",
          "A Python library",
          "A version of Python",
          "A testing framework",
        ],
        correctAnswer: "Python style guide",
        point: 5,
        difficultyLevels: ["easy"],
      },
      {
        skillId: skillMap.get("Python"),
        questionText: "What is a lambda function?",
        options: [
          "An anonymous function defined with lambda keyword",
          "A named function",
          "A class method",
          "A module import",
        ],
        correctAnswer: "An anonymous function defined with lambda keyword",
        point: 8,
        difficultyLevels: ["easy", "medium"],
      },
      {
        skillId: skillMap.get("Python"),
        questionText: "What is *args used for?",
        options: [
          "Passing variable number of arguments to a function",
          "Multiplying arguments",
          "Pointer to arguments",
          "Required arguments",
        ],
        correctAnswer: "Passing variable number of arguments to a function",
        point: 10,
        difficultyLevels: ["medium"],
      },
      {
        skillId: skillMap.get("Python"),
        questionText: "What is the Global Interpreter Lock (GIL)?",
        options: [
          "A mutex that protects access to Python objects",
          "A global variable",
          "A security feature",
          "A compilation flag",
        ],
        correctAnswer: "A mutex that protects access to Python objects",
        point: 15,
        difficultyLevels: ["advanced", "expert"],
      },
      {
        skillId: skillMap.get("Python"),
        questionText: "What is the difference between @staticmethod and @classmethod?",
        options: [
          "@staticmethod doesn't receive implicit first argument, @classmethod receives cls",
          "They are the same",
          "@staticmethod is deprecated",
          "@classmethod is faster",
        ],
        correctAnswer: "@staticmethod doesn't receive implicit first argument, @classmethod receives cls",
        point: 12,
        difficultyLevels: ["hard", "advanced"],
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
    console.log("  - 5 Skills (JavaScript, TypeScript, React, Node.js, Python)");
    console.log(`  - ${validQuestionsData.length} Questions with multiple difficulty levels`);
    console.log("\n💡 You can now:");
    console.log("  1. Start an exam by selecting 1 skill");
    console.log("  2. Optionally select difficulty levels (easy, medium, hard, advanced, expert)");
    console.log("  3. System will generate 20 randomized questions from that skill");
    console.log("  4. Submit answers to get score and skill level assessment");
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
