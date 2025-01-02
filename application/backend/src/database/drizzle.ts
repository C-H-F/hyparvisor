import Database from '@farjs/better-sqlite3-wrapper';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import databaseSetup0000 from '../../database/0000.sql.txt';
import databaseSetup0001 from '../../database/0001.sql.txt';

const sqlite = new Database('hyparvisor.db');
export const db = drizzle(sqlite as any);

//Setup database
if (
  !sqlite
    .prepare(
      `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='user'`
    )
    .get().cnt
) {
  for (const databaseSetup of [databaseSetup0000, databaseSetup0001])
    databaseSetup.split('--> statement-breakpoint').forEach((sql) => {
      if (sql.trim() === '') return;
      sqlite.prepare(sql).run();
    });
}
