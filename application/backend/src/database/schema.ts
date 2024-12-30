import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { InferSelectModel } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

export const users = sqliteTable(
  'user',
  {
    id: integer('id').primaryKey(),
    email: text('email').notNull(),
    password: text('password').notNull(),
    passwordExpiration: integer('password_expiration', { mode: 'timestamp' }),
    home: text('home').notNull().default('/root'),
    role: text('role', { enum: ['Administrator', 'User'] })
      .notNull()
      .default('User'),
  },
  (users) => ({ emailIdx: uniqueIndex('emailIdx').on(users.email) })
);
export type SUser = InferSelectModel<typeof users>;
export const ziUser = createInsertSchema(users);
// export const zsUser = createSelectSchema(users);

export const domainActions = sqliteTable(
  'domain_action',
  {
    domain: text('domain'),
    timestamp: integer('timestamp', { mode: 'timestamp_ms' }),
    action: text('action'),
    value: integer('value').notNull(),
  },
  (domainActions) => ({
    domainTimestampIdx: primaryKey({
      columns: [
        domainActions.domain,
        domainActions.timestamp,
        domainActions.action,
      ],
    }),
  })
);

export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  user: integer('user').notNull(),
  agent: text('agent').notNull(),
  begin: integer('begin', { mode: 'timestamp' }).notNull(),
  end: integer('end', { mode: 'timestamp' }).notNull(),
});
export type SSession = InferSelectModel<typeof sessions>;

export const keyValues = sqliteTable('key_value', {
  key: text('k', { enum: ['session_timeout'] }).primaryKey(),
  value: text('v').notNull(),
});
export type SKeyValue = InferSelectModel<typeof keyValues>;

export const temporaries = sqliteTable('temporary', {
  key: text('value').primaryKey(),
});
export type STemporary = InferSelectModel<typeof temporaries>;
