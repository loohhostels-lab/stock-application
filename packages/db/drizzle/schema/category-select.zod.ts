import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { categorySelect } from "./category-select"
import { z } from "zod"

const stringArraySchema = z.array(z.string()).default([]);

export const insertCategorySelectSchema = createInsertSchema(categorySelect, {
    category_name: z.string().min(1, "Category name must be at least 1 character long"),
    field: stringArraySchema,
}).omit({
    id: true,
});

export const selectCategorySelectSchema = createSelectSchema(categorySelect);

export type InsertCategorySelect = z.infer<typeof insertCategorySelectSchema>;
export type SelectCategorySelect = z.infer<typeof selectCategorySelectSchema>;

