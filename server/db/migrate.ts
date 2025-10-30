import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { databaseConfig } from "../config/index.js";

async function runMigrations() {
  console.log("🔄 Running database migrations...");
  
  const pool = new Pool({
    connectionString: databaseConfig.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    await migrate(db, { 
      migrationsFolder: "./migrations",
      migrationsSchema: "public"  // Fix: Drizzle defaults to 'drizzle' schema, we need 'public'
    });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
