import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { InferModel, sql } from 'drizzle-orm';

export const users = sqliteTable(
  'user',
  {
    id: integer('id').primaryKey(),
    email: text('email').notNull(),
    password: text('password').notNull(),
    passwordExpiration: integer('password_expiration', { mode: 'timestamp' }),
  },
  (users) => ({ emailIdx: uniqueIndex('emailIdx').on(users.email) })
);
export type User = InferModel<typeof users>;

export const systemUsers = sqliteTable('system_user', {
  user: integer('user').primaryKey(),
  username: text('username').notNull(), //Maybe add to primary in the future.
  salt: text('salt').notNull(),
  password: text('password').notNull(),
});

export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  user: integer('user').notNull(),
  agent: text('agent').notNull(),
  begin: integer('begin', { mode: 'timestamp' }).notNull(),
  end: integer('end', { mode: 'timestamp' }).notNull(),
});
export type Session = InferModel<typeof sessions>;

export const keyValues = sqliteTable('key_value', {
  key: text('k', { enum: ['session_timeout'] }).primaryKey(),
  value: text('v').notNull(),
});
export type KeyValue = InferModel<typeof keyValues>;

export const temporaries = sqliteTable('temporary', {
  key: text('value').primaryKey(),
});
export type Temporary = InferModel<typeof temporaries>;
