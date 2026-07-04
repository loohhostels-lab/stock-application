import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const addUserSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    age: z.number().int(),
});

const getUserSchema = z.object({
    email: z.string().email(),
});

// Inferred TypeScript types
type AddUser = z.infer<typeof addUserSchema>;
type GetUser = z.infer<typeof getUserSchema>;

export { type AddUser, addUserSchema, getUserSchema, type GetUser };
