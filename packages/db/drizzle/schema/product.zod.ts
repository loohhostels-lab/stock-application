import { createInsertSchema, createSelectSchema} from "drizzle-zod"
import { productTable } from "./product"
import { z } from "zod";

export const insertProductSchema = createInsertSchema(productTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
})

export const selectProductSchema = createSelectSchema(productTable);

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type SelectProduct = z.infer<typeof selectProductSchema>;
