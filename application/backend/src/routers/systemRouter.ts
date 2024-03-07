import { trpc } from '../trpc.js';
import { z } from 'zod';
import { exec, execSync } from 'child_process';
import { fetchUserFromSession } from '../trpcUtils.js';
import { promisify } from 'util';
import { TRPCError } from '@trpc/server';
import * as pty from '../botchUpPty.js';
import { getOsShell, mapObject, toNumber } from '../utils.js';
import bytes from 'bytes-iec';
const execAsync = promisify(exec);

let webSocketShellRequestToken: ((timeoutMs: number) => string) | null = null;
export function setWebSocketShellRequestTokenFunction(
  fnc: typeof webSocketShellRequestToken
) {
  webSocketShellRequestToken = fnc;
}

async function isUpdating() {
  try {
    const response = await execAsync('screen -ls | grep .hyparvisor_update');
    return response.stdout.trim() !== '';
  } catch {
    return false;
  }
}

export const systemRouter = trpc.router({
  //getCpuUsage
  //getMemoryUsage
  uptime: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/system/uptime',
        tags: ['system'],
        summary: 'Request the time period the system is running.',
      },
    })
    .input(z.void())
    .output(
      z.object({
        since: z.date(),
        uptime: z.string(),
        users: z.number(),
        load: z.number().array().length(3),
      })
    )
    .query(async function () {
      let { stdout: since } = await execAsync('uptime -s', {
        encoding: 'utf8',
      });
      since = since.substring(0, since.length - 1);
      const response = execSync('uptime', { encoding: 'utf8' });
      const regex = /.* up (.*),\s*(\d)+ user(?:s)?,\s*load average: (.*)/g;
      const res = regex.exec(response);
      if (!res) throw new Error('Invalid response: ' + response);
      const uptime = res[1];
      const users = +res[2];
      const load = res[3].split(', ').map((x) => +x);
      return { since: new Date(since), uptime, users, load };
    }),
  getUpdates: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/system/getUpdates',
        tags: ['system'],
        summary: 'Check for updates.',
        description:
          'Checks for updates without messing with pacman. Uses `checkupdates` and `paclist` to gather information.',
        protect: true,
      },
    })
    .input(z.void())
    .output(
      z.object({
        packages: z
          .object({
            name: z.string(),
            currentVersion: z.string(),
            latestVersion: z.string(),
            repository: z.union([
              z.literal('core'),
              z.literal('extra'),
              z.literal('other'),
            ]),
          })
          .array(),
      })
    )
    .query(async function ({ ctx }) {
      await fetchUserFromSession(ctx.session);
      type RepositoryName = 'core' | 'extra' | 'other';
      const packages: {
        name: string;
        currentVersion: string;
        latestVersion: string;
        repository: RepositoryName;
      }[] = [];
      const packageRepositories: Record<string, RepositoryName> = {};
      const repositories = ['core', 'extra'] as const;
      for (const repository of repositories)
        try {
          const { stdout: response } = await execAsync(
            'paclist ' + JSON.stringify(repository),
            {
              encoding: 'utf8',
            }
          );
          const regex = /(.*)\s([^\s\n]+)$/gm;
          while (true) {
            const match = regex.exec(response);
            if (!match) break;
            packageRepositories[match[1]] = repository;
          }
        } catch {}

      try {
        const { stdout: response } = await execAsync('checkupdates', {
          encoding: 'utf8',
        });
        const regex = /(.*)\s([^\s]+)\s->\s([^\s\n]+)$/gm;
        while (true) {
          const match = regex.exec(response);
          if (!match) break;
          const name = match[1];
          const currentVersion = match[2];
          const latestVersion = match[3];
          const repository = packageRepositories[name] ?? 'other';
          packages.push({
            name,
            currentVersion,
            latestVersion,
            repository,
          });
        }
      } catch {}
      return { packages };
    }),
  update: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/system/update',
        tags: ['system'],
        summary:
          'Update the system and all of its packages to the latest version.',
        protect: true,
      },
    })
    .input(z.void())
    .output(z.void())
    .mutation(async function ({ ctx }) {
      await fetchUserFromSession(ctx.session);
      if (await isUpdating())
        throw new TRPCError({
          message: 'Running updates...',
          code: 'TOO_MANY_REQUESTS',
        });

      const ptyProcess = pty.spawn(getOsShell(), [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        encoding: 'utf-8',
      });
      ptyProcess.write('screen -D -R -S hyparvisor_update\n');
      ptyProcess.write(
        'pacman --noconfirm -Syu > /root/update.log && pacman --noconfirm -Sc && echo "Update finished." >> /root/update.log && exit\n'
      );
    }),
  isUpdating: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/system/isUpdating',
        tags: ['system'],
        summary: 'Returns true if the system is already performing an update.',
        protect: true,
      },
    })
    .input(z.void())
    .output(z.boolean())
    .query(async function ({ ctx }) {
      await fetchUserFromSession(ctx.session);
      return await isUpdating();
    }),
  getUpdateStatus: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/system/getUpdateStatus',
        tags: ['system'],
        summary: 'Gets the console output of the last or current update.',
        protect: true,
      },
    })
    .input(z.object({ start: z.number() }))
    .output(z.string())
    .query(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      const response = await execAsync(
        'tail -c +' + (+input.start + 1) + ' /root/update.log'
      );
      return response.stdout;
    }),
  shutdown: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/system/shutdown',
        tags: ['system'],
        summary: 'Shuts the system down.',
        protect: true,
      },
    })
    .input(z.void())
    .output(z.void())
    .mutation(async function ({ ctx }) {
      await fetchUserFromSession(ctx.session);
      execAsync('shutdown now', { encoding: 'utf8' });
    }),
  reboot: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/system/reboot',
        tags: ['system'],
        summary: 'Reboots the system.',
        protect: true,
      },
    })
    .input(z.void())
    .output(z.void())
    .mutation(async function ({ ctx }) {
      await fetchUserFromSession(ctx.session);
      execAsync('shutdown -r now', { encoding: 'utf8' });
    }),
  spawnShell: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/system/spawnShell',
        tags: ['system'],
        summary: 'Spawns a system shell accessible through a websocket.',
        protect: true,
      },
    })
    .input(z.void())
    .output(z.string())
    .mutation(async function ({ ctx }) {
      await fetchUserFromSession(ctx.session);
      if (!webSocketShellRequestToken)
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Function was not ready.',
        });
      const token = webSocketShellRequestToken(5 * 60 * 1000);
      return '/api/shell/' + encodeURIComponent(token);
    }),
  getCpuUsage: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/system/getCpuUsage',
        tags: ['system'],
        summary: 'Returns the CPU usage in percent.',
      },
    })
    .input(z.void())
    .output(
      z.object({
        usage: z.number().nullable(),
        user: z.number().nullable(),
        system: z.number().nullable(),
        idle: z.number().nullable(),
        iowait: z.number().nullable(),
      })
    )
    .query(async function () {
      const { stdout } = await execAsync('virsh nodecpustats --percent', {
        encoding: 'utf8',
      });
      return {
        usage: toNumber(/usage\s*:\s*(\d+(?:\.\d*))%/g.exec(stdout)?.[1], null),
        user: toNumber(/user\s*:\s*(\d+(?:\.\d*))%/g.exec(stdout)?.[1], null),
        system: toNumber(
          /system\s*:\s*(\d+(?:\.\d*))%/g.exec(stdout)?.[1],
          null
        ),
        idle: toNumber(/idle\s*:\s*(\d+(?:\.\d*))%/g.exec(stdout)?.[1], null),
        iowait: toNumber(
          /iowait\s*:\s*(\d+(?:\.\d*))%/g.exec(stdout)?.[1],
          null
        ),
      };
    }),
  getMemoryUsage: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/system/getMemoryUsage',
        tags: ['system'],
        summary: 'Returns the memory usage',
      },
    })
    .input(z.void())
    .output(
      z.object({
        total: z.number().nullable(),
        free: z.number().nullable(),
        buffers: z.number().nullable(),
        cached: z.number().nullable(),
      })
    )
    .query(async function () {
      const { stdout } = await execAsync('virsh nodememstats', {
        encoding: 'utf8',
      });
      const matches = {
        total: /total\s*:\s*(\d+(?:\.\d*))\s*(\w*)/g.exec(stdout),
        free: /free\s*:\s*(\d+(?:\.\d*))\s*(\w*)/g.exec(stdout),
        buffers: /buffers\s*:\s*(\d+(?:\.\d*))\s*(\w*)/g.exec(stdout),
        cached: /cached\s*:\s*(\d+(?:\.\d*))\s*(\w*)/g.exec(stdout),
      };

      return mapObject(matches, (key, value) => {
        const amount = toNumber(value?.[1], null);
        if (amount === null) return [key, null];
        return [key, bytes.parse(amount + (value?.[2] ?? 'b'))];
      });
    }),
});
