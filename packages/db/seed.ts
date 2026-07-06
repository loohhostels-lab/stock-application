import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from packages/db/.env regardless of CWD
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { adminCredentialsTable } from "./drizzle/schema/admin-credential";
import { createId } from "@paralleldrive/cuid2";

async function seed() {
    const pool = mysql.createPool(process.env.DATABASE_URL!);
    const db = drizzle({ client: pool.pool });

    console.log("🌱 Seeding admin credentials...");

    await db.insert(adminCredentialsTable).values([
        {
            id: createId(),
            username: "admin",
            password: "admin123",
            role: "ADMIN",
        },
        {
            id: createId(),
            username: "user1",
            password: "user123",
            role: "USER",
        },
    ]);

    console.log("✅ Seeded 2 users:");
    console.log("   - admin / admin123 (ADMIN)");
    console.log("   - user1 / user123 (USER)");

    await pool.end();
    process.exit(0);
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
