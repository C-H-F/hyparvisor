import { trpc } from '../trpc.js';
import { users, sessions, keyValues, ziUser } from '../database/schema.js';
import { nanoid } from 'nanoid';
import z from 'zod';

import { db } from '../database/drizzle.js';
import { fetchUserFromSession } from '../trpcUtils.js';
import { TRPCError } from '@trpc/server';
import { desc, eq } from 'drizzle-orm';

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
  //#region login
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
        changePassword(
          user.id,
          input.password,
          input.newPassword,
          input.passwordExpiration
        );
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
  //#endregion login

  //#region logout
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
      db.update(sessions)
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
      db.update(sessions)
        .set({ end })
        .where(eq(sessions.id, ctx.session))
        .run();
      return end;
    }),
  //#endregion logout

  //#region getName
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
  //#endregion getName

  //#region getAccountDetails
  getAccountDetails: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/user/getAccountDetails',
        summary: 'Fetches the account details of the current user.',
        tags: ['user'],
        protect: true,
      },
    })
    .input(
      z.object({
        email: z.string().optional(),
        sessionLimit: z.number().optional(),
      })
    )
    .output(
      z.object({
        email: z.string(),
        passwordExpiration: z.number().nullable(),
        home: z.string(),
        sessions: z
          .object({
            begin: z.number(),
            end: z.number(),
            agent: z.string(),
          })
          .array(),
        role: ziUser.shape.role,
        permissions: z.string().array(),
      })
    )
    .query(async function ({ ctx, input }) {
      const user = await fetchUserFromSession(ctx.session);
      if (!input.email) {
        const userEntry = db
          .select()
          .from(users)
          .where(eq(users.id, user))
          .all()[0];
        const email = userEntry.email;
        const passwordExpiration =
          userEntry.passwordExpiration?.getTime() ?? null;
        const sessionSelector = {
          begin: sessions.begin,
          end: sessions.end,
          agent: sessions.agent,
        };

        const sessionEntries = db
          .select(sessionSelector)
          .from(sessions)
          .where(eq(sessions.user, user))
          .orderBy(desc(sessions.end))
          .limit(input.sessionLimit ?? 10)
          .all();

        return {
          email,
          passwordExpiration,
          role: userEntry.role,
          home: userEntry.home,
          permissions: [],
          sessions: sessionEntries.map((x) => ({
            begin: x.begin.getTime(),
            end: x.end.getTime(),
            agent: x.agent,
          })),
        };
        //TODO
      } else {
        //TODO Fetch data about different user if allowed.
      }
      return {
        email: '',
        passwordExpiration: null,
        home: '',
        sessions: [],
        role: 'User',
        permissions: [],
      };
    }),
  //#endregion
});

async function changePassword(
  userId: number,
  _oldPassword: string,
  newPassword: string,
  optPasswordExpiration?: Date
) {
  const newLoginPasswordHash = await Bun.password.hash('login:' + newPassword, {
    algorithm: 'argon2id',
  });
  const passwordExpiration = optPasswordExpiration
    ? new Date(optPasswordExpiration)
    : null;
  db.transaction((tx) => {
    tx.update(users)
      .set({
        password: newLoginPasswordHash,
        passwordExpiration,
      })
      .where(eq(users.id, userId))
      .run();
  });
}
