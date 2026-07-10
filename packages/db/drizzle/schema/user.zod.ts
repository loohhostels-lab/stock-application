// packages/db/drizzle/schema/user.zod.ts
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { userTable } from './user';
import {z} from "zod";

export const selectUserSchema = createSelectSchema(userTable);
export const insertUserSchema = createInsertSchema(userTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export type SelectUser = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
