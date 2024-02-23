import Database from '@farjs/better-sqlite3-wrapper';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import databaseSetup from '../../_drizzle/sql.txt';

const sqlite = new Database('hyparvisor.db');
export const db = drizzle(sqlite);

//Setup database
if (
  !sqlite
    .prepare(
      `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='user'`
    )
    .get().cnt
) {
  sqlite.prepare(databaseSetup).run();
}
