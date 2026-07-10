import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { branchTable } from './branch';
import { z } from "zod";

export const selectBranchSchema = createSelectSchema(branchTable);
export const insertBranchSchema = createInsertSchema(branchTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type SelectBranch = z.infer<typeof selectBranchSchema>;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
