import { and, eq, gt, lte } from 'drizzle-orm';
import { db } from './database/drizzle.js';
import { sessions } from './database/schema.js';
import { TRPCError } from '@trpc/server';
export async function fetchUserFromSession(sessionId: string | null) {
  if (!sessionId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  const session = db
    .select({ user: sessions.user })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        gt(sessions.end, new Date()),
        lte(sessions.begin, new Date())
      )
    )
    .all();
  if (session.length <= 0) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return session[0].user;
}
