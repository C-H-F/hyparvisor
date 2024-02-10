import { trpc } from '../trpc.js';

import { users, sessions, keyValues, systemUsers } from '../database/schema.js';

import { eq } from 'drizzle-orm/expressions.js';
import { nanoid } from 'nanoid';

import * as crypto from 'crypto';
import z from 'zod';

import { db } from '../database/drizzle.js';
import { fetchUserFromSession } from '../trpcUtils.js';
import { TRPCError } from '@trpc/server';

async function getSessionTimeout() {
  const sessionTimeout = +(
    db
      .select({ value: keyValues.value })
      .from(keyValues)
      .where(eq(keyValues.key, 'session_timeout'))
      .get()?.value ?? 24 * 60 * 60 * 1000
  );
  return sessionTimeout;
}

export const userRouter = trpc.router({
  login: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/user/login',
        summary: 'Start a new session and return the session id.',
        description:
          'Starts a new session and returns the session id for the session. The password provided has to be a base64 encoded sha512 hash of username:password. To change the password provide you can provide newPassword (again in the form `base64(sha512(username + ":" + password))` together with an optional expiration date.',
        tags: ['user'],
      },
    })
    .input(
      z.object({
        email: z
          .string()
          .describe('The E-Mail of the user to login or "root".'),
        password: z
          .string()
          .describe(
            'A base64 encoded sha512 hash of username:password. `base64(sha512(username+":"+password))`'
          ),
        agent: z.string(),
        newPassword: z.string().optional(),
        passwordExpiration: z
          .string()
          .transform((s) => new Date(s))
          .optional(),
      })
    )
    .output(z.string())
    .mutation(async function ({ input }) {
      const user = db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .all()[0];
      if (
        !user ||
        !(await Bun.password.verify(
          'login:' + input.password,
          user.password,
          'argon2id'
        ))
      )
        throw new TRPCError({
          message: 'Invalid username or password',
          code: 'UNAUTHORIZED',
        });
      if (input.newPassword === input.password)
        throw new TRPCError({
          message: 'New password must not match the previous one.',
          code: 'BAD_REQUEST',
        });
      if (
        input.newPassword == null &&
        user.passwordExpiration != null &&
        user.passwordExpiration < new Date()
      )
        throw new TRPCError({
          message:
            'Password expired. Provide additional parameter newPassword in order to log in.',
          code: 'CONFLICT',
        });
      const sessionTimeout = await getSessionTimeout();
      if (input.newPassword != null) {
        // TODO: changePassword(
        //   user.id,
        //   input.password,
        //   input.newPassword,
        //   input.passwordExpiration
        // );
      }
      const sessionStart = new Date();
      const sessionEnd = new Date(+sessionStart + sessionTimeout);
      const sessionId = nanoid(32);
      db.insert(sessions)
        .values({
          id: sessionId,
          user: user.id,
          agent: input.agent,
          begin: sessionStart,
          end: sessionEnd,
        })
        .run();
      return sessionId;
    }),
  logout: trpc.procedure
    .meta({
      openapi: {
        path: '/user/logout',
        method: 'POST',
        tags: ['user'],
        summary: 'Ends a session by invalidating the session id on the server.',
        protect: true,
      },
    })
    .input(z.void())
    .output(z.void())
    .mutation(async function ({ ctx }) {
      if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' });
      await fetchUserFromSession(ctx.session);
      const res = db
        .update(sessions)
        .set({ end: new Date() })
        .where(eq(sessions.id, ctx.session))
        .run();
    }),
  extend: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/user/extend',
        summary: 'Extend the duration of a valid session.',
        tags: ['user'],
        protect: true,
      },
    })
    .input(z.void())
    .output(z.date().nullable())
    .mutation(async function ({ ctx }) {
      if (!ctx.session) return null;
      await fetchUserFromSession(ctx.session);
      const sessionTimeout = await getSessionTimeout();
      const now = new Date();
      const end = new Date(+now + sessionTimeout);
      const res = db
        .update(sessions)
        .set({ end })
        .where(eq(sessions.id, ctx.session))
        .run();
      return end;
    }),
  getName: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/user/getName',
        summary: 'Fetches the display name of the current user.',
        tags: ['user'],
        protect: true,
      },
    })
    .input(z.void())
    .output(z.string().nullable())
    .query(async function ({ ctx }) {
      try {
        const user = await fetchUserFromSession(ctx.session);
        const result = db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, user))
          .limit(1)
          .all();
        if (result.length < 1) return null;
        return result[0].email;
      } catch {
        return null;
      }
    }),
});

function encryptSymmetric(
  plain: string,
  password: string,
  encoding: crypto.Encoding = 'utf8'
): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(8);
  const algorithm = 'aes-256-gcm';
  const cipher = crypto.createCipheriv(algorithm, key, iv, {
    authTagLength: 4,
  });

  let encryptedBuffer = Buffer.concat([
    cipher.update(plain, encoding),
    cipher.final(),
  ]);

  return (
    '$' +
    algorithm +
    '$s=' +
    salt.toString('base64') +
    ',i=' +
    iv.toString('base64') +
    ',a=' +
    cipher.getAuthTag().toString('base64') +
    '$' +
    encryptedBuffer.toString('base64')
  );
}
function decryptSymmetric(
  cipher: string,
  password: string,
  encoding: crypto.Encoding = 'utf8'
): string {
  const [_, algorithm, parameterString, data] = cipher.split('$');
  const params = parameterString.split(',');
  const salt = params.find((p) => p.startsWith('s='))?.substring(2) ?? '';
  const iv = params.find((p) => p.startsWith('i='))?.substring(2) ?? '';
  const auth = params.find((p) => p.startsWith('a='))?.substring(2) ?? '';
  const key = crypto.pbkdf2Sync(
    Buffer.from(password, encoding),
    Buffer.from(salt, 'base64'),
    100000,
    32,
    'sha256'
  );
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'base64')
  );
  (decipher as any).setAuthTag(Buffer.from(auth, 'base64'));
  return Buffer.concat([
    decipher.update(data, 'base64'),
    decipher.final(),
  ]).toString(encoding);
}
