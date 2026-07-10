import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
export {DrizzleQueryError} from "drizzle-orm/errors"
import * as schema from "./drizzle/schema/index";
import { defineRelations } from "drizzle-orm";
import {z} from "zod";

const pool = mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle({ client: pool.pool, relations: defineRelations(schema) });
export * from "./drizzle/schema/index";
export {z}
