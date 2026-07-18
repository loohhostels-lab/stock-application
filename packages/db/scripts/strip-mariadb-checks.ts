/**
 * MariaDB stores JSON columns as `longtext` with auto-generated CHECK(json_valid()) constraints.
 * Drizzle-Kit generates MySQL-compatible `DROP CONSTRAINT` DDL that MariaDB can't execute.
 * This script strips those CHECK constraints before `drizzle-kit push` runs.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL not set");
        process.exit(1);
    }

    const connection = await mysql.createConnection(url);

    // Get the database name from the connection
    const [dbResult] = await connection.query("SELECT DATABASE() as db") as any;
    const dbName = dbResult[0].db;

    // Find all CHECK constraints with json_valid()
    const [constraints] = await connection.query(
        `SELECT CONSTRAINT_NAME, TABLE_NAME 
         FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
         WHERE CONSTRAINT_SCHEMA = ? AND CHECK_CLAUSE LIKE '%json_valid%'`,
        [dbName]
    ) as any;

    if (constraints.length === 0) {
        console.log("✓ No MariaDB json_valid CHECK constraints to strip");
        await connection.end();
        return;
    }

    console.log(`Found ${constraints.length} json_valid CHECK constraint(s) to strip...`);

    // Group constraints by table for efficient ALTER TABLE statements
    const byTable = new Map<string, string[]>();
    for (const c of constraints) {
        const cols = byTable.get(c.TABLE_NAME) || [];
        cols.push(c.CONSTRAINT_NAME);
        byTable.set(c.TABLE_NAME, cols);
    }

    for (const [table, cols] of byTable) {
        // Get column details so we can MODIFY them without the CHECK constraint
        const [columns] = await connection.query(
            `SELECT COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_TYPE
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN (${cols.map(() => '?').join(',')})`,
            [dbName, table, ...cols]
        ) as any;

        const modifyClauses = columns.map((col: any) => {
            const nullable = col.IS_NULLABLE === 'YES' ? '' : ' NOT NULL';
            const defaultVal = col.COLUMN_DEFAULT !== null ? ` DEFAULT '${col.COLUMN_DEFAULT}'` : '';
            return `MODIFY COLUMN \`${col.COLUMN_NAME}\` longtext${nullable}${defaultVal}`;
        });

        const sql = `ALTER TABLE \`${table}\` ${modifyClauses.join(', ')}`;
        await connection.query(sql);
        console.log(`  ✓ Stripped ${cols.length} constraint(s) from \`${table}\``);
    }

    console.log("✓ All json_valid CHECK constraints stripped successfully");
    await connection.end();
}

main().catch((err) => {
    console.error("Failed to strip constraints:", err.message);
    process.exit(1);
});
