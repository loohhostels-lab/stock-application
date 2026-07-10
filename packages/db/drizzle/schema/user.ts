import { boolean, mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";
import { branchTable } from "./branch";


// some of the column is allowed as null, because we are not taking these details when creating user
export const userTable = mysqlTable("users", {
    id: varchar({ length: 255 }).primaryKey().$defaultFn(() => createId()),
    name: varchar({ length: 255 }), 
    email: varchar({ length: 255 }).notNull().unique(),
    password: varchar({ length: 255 }).notNull(),
    phone: varchar({ length: 255 }).notNull().unique(),
    address: varchar({ length: 255 }),
    role: mysqlEnum("role", ["ADMIN", "USER"]).default("USER").notNull(),
    branch_id: varchar({ length: 255 }).notNull().references(() => branchTable.id),
    is_active: boolean().default(true).notNull(),

    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().$onUpdate(() => new Date()).notNull(),
})