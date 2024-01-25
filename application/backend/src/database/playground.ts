import { drizzle } from 'drizzle-orm/better-sqlite3';
import SQLite from 'better-sqlite3';
const sqlite = new SQLite('sqlite.db');
const db = drizzle(sqlite);
