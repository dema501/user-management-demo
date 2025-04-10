import {
  pgTable,
  serial,
  varchar,
  timestamp,
  check,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql, SQL } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    userId: serial('user_id').primaryKey(),
    userName: varchar('user_name', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    userStatus: varchar('user_status', { length: 1 }).notNull(),
    department: varchar('department', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Add table constraints here
    check('user_status_check', sql`${table.userStatus} in ('A', 'I', 'T')`), // Add the CHECK constraint
  ],
);

// custom lower function
export function lower(field: AnyPgColumn): SQL {
  return sql`lower(${field})`;
}

// Optional: Infer TypeScript types from schema
export type User = typeof users.$inferSelect; // return type when queried
export type NewUser = typeof users.$inferInsert; // insert type
