import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./db/schema/index";
import { defineRelations } from "drizzle-orm";

const pool = mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle({ client: pool, relations: defineRelations(schema) });
export * from "./db/schema/index";