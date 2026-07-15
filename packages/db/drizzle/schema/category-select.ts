import { createId } from "@paralleldrive/cuid2";
import { varchar } from "drizzle-orm/mysql-core";
import { mysqlTable, json } from "drizzle-orm/mysql-core";

export const categorySelect = mysqlTable("category_select", {
    id: varchar({length: 255}).primaryKey().$defaultFn(() => createId()),
    category_name: varchar({length: 255}).notNull(),
    field: json().$type<string[]>().default([]).notNull(),
});