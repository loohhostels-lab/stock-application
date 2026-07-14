import { json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";

export const productInformationTable = mysqlTable("product_information", {
    id: varchar({ length: 255 }).primaryKey().$defaultFn(() => createId()),
    company_name: json().$type<string[]>().default([]).notNull(),
    product_type: json().$type<string[]>().default([]).notNull(),
    size: json().$type<string[]>().default([]).notNull(),
    series: json().$type<string[]>().default([]).notNull(),
    ram_rom: json().$type<string[]>().default([]).notNull(),
    version: json().$type<string[]>().default([]).notNull(),
    model_number: json().$type<string[]>().default([]).notNull(),
    processor: json().$type<string[]>().default([]).notNull(),
    generation: json().$type<string[]>().default([]).notNull(),
    ai_chip: json().$type<string[]>().default([]).notNull(),
    vendor: json().$type<string[]>().default([]).notNull(),
    camera: json().$type<string[]>().default([]).notNull(),
    product_names: json().$type<string[]>().default([]).notNull(),
    power_consumption: json().$type<string[]>().default([]).notNull(),
    power_supply: json().$type<string[]>().default([]).notNull(),
    product_length: json().$type<string[]>().default([]).notNull(),

    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().$onUpdate(() => new Date()).notNull(),
});
