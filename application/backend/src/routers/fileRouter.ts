import { z } from 'zod';
import { trpc } from '../trpc.js';
import {
  readdir,
  stat,
  readFile,
  rm,
  mkdir,
  rename,
  open,
} from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { fetchUserFromSession } from '../trpcUtils.js';
import { execSync } from 'node:child_process';
import { O_APPEND, O_CREAT } from 'node:constants';
import { db } from '../database/drizzle.js';
import { temporaries } from '../database/schema.js';
import { eq } from 'drizzle-orm';

async function getFsEntry(dir: string, name: string) {
  const fullPath = path.join(dir, name);
  const stats = await stat(fullPath);

  const type = //stats.isSymbolicLink() ? 'symlink' :
    stats.isDirectory() ? 'dir' : 'file';

  return {
    name,
    dir,
    size: stats.size,
    type,
    user: stats.uid,
    group: stats.gid,
    dateAccess: stats.atime,
    dateModify: stats.mtime,
    dateChange: stats.ctime,
    dateBirth: stats.birthtime,
    permissions: stats.mode,
  };
}

export const zFsEntry = z.object({
  name: z.string(),
  dir: z.string(),
  size: z.number(),
  type: z.string(),
  user: z.number(),
  group: z.number(),
  dateAccess: z.date(),
  dateModify: z.date(),
  dateChange: z.date(),
  dateBirth: z.date(),
  permissions: z.number(),
});

export const fileRouter = trpc.router({
  ls: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/file/ls',
        tags: ['file'],
        summary: 'List files in a directory.',
        protect: true,
      },
    })
    .input(z.object({ path: z.string() }))
    .output(z.array(zFsEntry))
    .query(async ({ input, ctx }) => {
      await fetchUserFromSession(ctx.session);
      const { path } = input;
      const files = await readdir(path);
      const result = files.map((file) => getFsEntry(path, file));
      return await Promise.all(result);
    }),
  download: trpc.procedure
    .meta({
      openapi: {
        method: 'PUT',
        path: '/file/download',
        tags: ['file'],
        summary:
          'Downloads a file from a web resource to a location on the server.',
        protect: true,
      },
    })
    .input(z.object({ source: z.string(), destination: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      const fetchResponse = await fetch(input.source);
      const length = +(fetchResponse.headers.get('content-length') ?? '0');
      const dst = input.destination + '.' + length + '.hyparvisor_download';
      const key = 'file://' + dst;
      db.insert(temporaries).values({ key }).run();
      const fileWriteStream = createWriteStream(dst, {
        encoding: 'binary',
      });
      const fileWritableStream = new WritableStream({
        write(chunk) {
          fileWriteStream.write(chunk);
        },
      });

      const body = await fetchResponse.body;
      await body.pipeTo(fileWritableStream);
      await rename(dst, input.destination);
      db.delete(temporaries).where(eq(temporaries.key, key)).run();
    }),
  get: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/file/get',
        tags: ['file'],
        summary: 'Fetches a file from the server.',
        protect: true,
      },
    })
    .input(z.object({ path: z.string() }))
    .output(z.string())
    .query(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      const result = await readFile(input.path, { encoding: 'binary' });
      return result;
    }),
  rm: trpc.procedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/file/rm',
        tags: ['file'],
        summary: 'Deletes a file from the server.',
        protect: true,
      },
    })
    .input(z.object({ path: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      await rm(input.path, { recursive: true });
    }),
  mkdir: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/file/mkdir',
        tags: ['file'],
        summary: 'Creates a directory.',
        protect: true,
      },
    })
    .input(z.object({ path: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      await mkdir(input.path);
    }),
  mv: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/file/mv',
        tags: ['file'],
        summary: 'Moves a file or directory.',
        protect: true,
      },
    })
    .input(z.object({ source: z.string(), destination: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      await rename(input.source, input.destination);
    }),
  touch: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/file/touch',
        tags: ['file'],
        summary:
          'Creates an empty file or updates the access and modification time of an existing file.',
        protect: true,
      },
    })
    .input(z.object({ path: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      const now = new Date();
      const fileHandle = await open(input.path, O_APPEND | O_CREAT);
      await fileHandle.utimes(now, now);
      fileHandle.close();
    }),
  df: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/file/df',
        tags: ['file'],
        summary: 'df -h',
        protect: true,
      },
    })
    .input(z.object({}))
    .output(z.string())
    .query(async function ({ ctx }) {
      await fetchUserFromSession(ctx.session);
      return execSync('df -h', { encoding: 'utf8' });
    }),
});
