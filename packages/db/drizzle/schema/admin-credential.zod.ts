// packages/db/drizzle/schema/admin-credential.zod.ts
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { adminCredentialsTable } from './admin-credential';
import {z} from "zod";

export const selectAdminSchema = createSelectSchema(adminCredentialsTable);
export const insertAdminSchema = createInsertSchema(adminCredentialsTable).omit({
    id: true,
    create_at: true,
    updatedAt: true,
})

export type SelectAdmin = z.infer<typeof selectAdminSchema>
export type InsertAdmin = z.infer<typeof insertAdminSchema>
