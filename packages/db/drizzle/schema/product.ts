import { createId } from "@paralleldrive/cuid2";
import { mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const productTable = mysqlTable("product", {
    id: varchar({length: 255}).primaryKey().$defaultFn(() => createId()),
    company_name: varchar({length: 255}).notNull(),
    product_type: varchar({length: 255}).notNull(),
    size: varchar({length: 255}),
    series: varchar({length: 255}),
    ram_rom: varchar({length: 255}),
    version: varchar({length: 255}),
    upgrade: varchar({length: 255}),
    product_name: varchar({length: 255}),
    model_number: varchar({length: 255}),
    processor: varchar({length: 255}),
    generation: varchar({length: 255}),
    ai_chip: varchar({length: 255}),
    vendor: varchar({length: 255}),
    camera: varchar({length: 255}),
    product_names: varchar({length: 255}),
    length: varchar({length: 255}),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().$onUpdate(() => new Date()).notNull(),
})