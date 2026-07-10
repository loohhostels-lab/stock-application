import { mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";

export const branchTable = mysqlTable("branches", {
    id: varchar({ length: 255 }).primaryKey().$defaultFn(() => createId()),
    title: varchar({ length: 255 }).notNull().unique(), // e.g. "Branch 1", "Branch 2"
    address: varchar({ length: 500 }).notNull(),

    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().$onUpdate(() => new Date()).notNull(),
});
