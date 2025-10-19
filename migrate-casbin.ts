import postgres from "postgres";

// Database connection
const connectionString = process.env.DATABASE_URL as string;
if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
}

console.log("🔗 Connecting to database:", connectionString.replace(/\/\/.*@/, "//***@"));
const client = postgres(connectionString);

async function migrateCasbinData() {
    try {
        console.log("🚀 Starting Casbin data migration...");

        // Step 1: Create the casbin table if it doesn't exist
        console.log("📋 Creating casbin table...");
        await client`
      CREATE TABLE IF NOT EXISTS casbin (
        id SERIAL PRIMARY KEY,
        ptype VARCHAR(100),
        rule JSONB
      )
    `;

        // Step 2: Clear existing casbin data
        console.log("🧹 Clearing existing casbin data...");
        await client`DELETE FROM casbin`;

        // Step 3: Migrate data from casbin_rule to casbin
        console.log("📦 Migrating data from casbin_rule to casbin...");
        const rules = await client`
      SELECT ptype, v0, v1, v2, v3, v4, v5 
      FROM casbin_rule 
      ORDER BY id
    `;

        console.log(`📊 Found ${rules.length} rules to migrate`);

        for (const rule of rules) {
            // Build rule array from v0-v5 columns
            const ruleArray: string[] = [];

            if (rule.v0 && rule.v0 !== null && rule.v0 !== '') ruleArray.push(rule.v0);
            if (rule.v1 && rule.v1 !== null && rule.v1 !== '') ruleArray.push(rule.v1);
            if (rule.v2 && rule.v2 !== null && rule.v2 !== '') ruleArray.push(rule.v2);
            if (rule.v3 && rule.v3 !== null && rule.v3 !== '') ruleArray.push(rule.v3);
            if (rule.v4 && rule.v4 !== null && rule.v4 !== '') ruleArray.push(rule.v4);
            if (rule.v5 && rule.v5 !== null && rule.v5 !== '') ruleArray.push(rule.v5);

            if (ruleArray.length > 0) {
                await client`
          INSERT INTO casbin (ptype, rule) 
          VALUES (${rule.ptype}, ${JSON.stringify(ruleArray)})
        `;
            }
        }

        console.log("✅ Migration completed successfully!");
        console.log(`📊 Migrated ${rules.length} rules to casbin table`);

        // Step 4: Verify migration
        const casbinCount = await client`SELECT COUNT(*) as count FROM casbin`;
        const originalCount = await client`SELECT COUNT(*) as count FROM casbin_rule`;

        console.log(`🔍 Verification:`);
        console.log(`   Original casbin_rule records: ${originalCount[0].count}`);
        console.log(`   Migrated casbin records: ${casbinCount[0].count}`);

        if (casbinCount[0].count === originalCount[0].count) {
            console.log("✅ Migration verification successful!");
        } else {
            console.log("⚠️  Migration verification failed - counts don't match");
        }

    } catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    } finally {
        await client.end();
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateCasbinData();
}
