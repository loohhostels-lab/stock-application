import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { productInformationTable } from './product-information';
import { z } from "zod";

const stringArraySchema = z.array(z.string()).default([]);

export const selectProductInformationSchema = createSelectSchema(productInformationTable);
export const insertProductInformationSchema = createInsertSchema(productInformationTable, {
    company_name: stringArraySchema,
    product_type: stringArraySchema,
    size: stringArraySchema,
    series: stringArraySchema,
    ram_rom: stringArraySchema,
    version: stringArraySchema,
    model_number: stringArraySchema,
    processor: stringArraySchema,
    generation: stringArraySchema,
    ai_chip: stringArraySchema,
    vendor: stringArraySchema,
    camera: stringArraySchema,
    product_names: stringArraySchema,
    power_consumption: stringArraySchema,
    power_supply: stringArraySchema,
    product_length: stringArraySchema,
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type SelectProductInformation = z.infer<typeof selectProductInformationSchema>;
export type InsertProductInformation = z.infer<typeof insertProductInformationSchema>;
