import { mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";

export const userTable = mysqlTable("users", {
    id: varchar({ length: 255 }).primaryKey().$defaultFn(() => createId()),
    name: varchar({ length: 255 }),
    email: varchar({ length: 255 }).notNull().unique(),
    password: varchar({ length: 255 }).notNull(),
    phone: varchar({ length: 255 }).notNull().unique(),
    address: varchar({ length: 255 }),
    role: mysqlEnum("role", ["ADMIN", "USER"]).default("USER").notNull(),
    branch_name: varchar({length: 255}).notNull(),

    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().$onUpdate(() => new Date()).notNull(),
})