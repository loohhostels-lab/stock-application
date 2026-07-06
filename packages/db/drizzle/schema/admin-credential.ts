import { timestamp, mysqlTable, varchar, mysqlEnum } from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

export const genderEnum = mysqlEnum("role", ["ADMIN", "USER"])

export const adminCredentialsTable = mysqlTable('admin_credentials_table', {
    id: varchar({ length: 255 }).primaryKey().$defaultFn(() => createId()),
    username: varchar({ length: 255 }).notNull().unique(),
    password: varchar({ length: 255 }).notNull(),
    role: genderEnum.default("USER").notNull(),

    create_at: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
});

export const passwordResetToken = mysqlTable("password_reset_token", {
  id: varchar({ length: 255 }).primaryKey().$defaultFn(() => createId()),
  partnerId: varchar({ length: 255 }).notNull(),
  token: varchar({ length: 255 }).notNull().notNull(),
  expiresAt: timestamp().notNull(),
  
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(), 
});