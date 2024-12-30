import { TRPCError } from '@trpc/server';
import { trpc } from '../trpc.js';
import { string, z } from 'zod';
import { fetchUserFromSession } from '../trpcUtils.js';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import bytes from 'bytes-iec';
import { withFile } from 'tmp-promise';
import { writeFile, readFile } from 'fs/promises';
import {
  vmDefinition,
  vmDefinitionFromXml,
  vmDefinitionToXml,
  vmState,
} from '../models/vm.js';
import { hrtime } from 'node:process';
import {
  execAsync,
  instance,
  listAllVirtualMachines,
  parseTable,
} from '../virshManager.js';
import { db } from '../database/drizzle.js';
import { domainActions } from '../database/schema.js';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { convert } from '../utils.js';

const vmInformation = z.object({
  id: z.number(),
  uuid: z.string(),
  osType: z.string(),
  state: vmState,
  cpus: z.number(),
  cpuTime: z.string(),
  maxMemory: z.number(),
  usedMemory: z.number(),
  persistent: z.boolean(),
  autostart: z.boolean(),
  managedSave: z.boolean(),
  securityModel: z.string(),
  securityDoi: z.string(),
});

const getMetricsResult = z.record(
  z.string(),
  z.object({
    state: vmState,
    stateSince: z.number(),
  })
);

export const vmRouter = trpc.router({
  //#region start
  start: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/vm/start',
        tags: ['vm'],
        summary: 'Starts an instance of a virtual machine.',
        protect: true,
      },
    })
    .input(z.object({ name: string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      await execAsync('virsh start ' + escapeShellArgument(input.name));
    }),
  //#endregion
  //#region stop
  stop: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/vm/stop',
        tags: ['vm'],
        summary:
          'Stops an instance of a virtual machine by shutting it down or destroying it.',
        protect: true,
      },
    })
    .input(z.object({ name: z.string(), force: z.boolean().default(false) }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      await execAsync(
        'virsh ' +
          (input.force ? 'destroy' : 'shutdown') +
          ' ' +
          escapeShellArgument(input.name)
      );
    }),
  //#endregion
  //#region pause
  pause: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/vm/pause',
        tags: ['vm'],
        summary: 'Pauses an instance of a virtual machine.',
        protect: true,
      },
    })
    .input(z.object({ name: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      await execAsync('virsh suspend ' + escapeShellArgument(input.name));
    }),
  //#endregion
  //#region resume
  resume: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/vm/resume',
        tags: ['vm'],
        summary: 'Resumes a paused instance of a virtual machine.',
        protect: true,
      },
    })
    .input(z.object({ name: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      await execAsync('virsh resume ' + escapeShellArgument(input.name));
    }),
  //#endregion
  //#region list
  list: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/vm/list',
        tags: ['vm'],
        summary: 'Lists all instances of virtual machines.',
        protect: true,
      },
    })
    .input(z.void())
    .output(instance.array())
    .query(async function ({ ctx }) {
      await fetchUserFromSession(ctx.session);
      return await listAllVirtualMachines();
    }),
  //#endregion
  //#region remove
  remove: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/vm/remove',
        tags: ['vm'],
        summary: 'Removes a stopped virtual machine definition.',
        protect: true,
      },
    })
    .input(z.object({ name: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      await execAsync(
        'virsh undefine --domain ' + escapeShellArgument(input.name)
      );
    }),
  //#endregion
  //#region rename
  rename: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/vm/rename',
        tags: ['vm'],
        summary: 'Renames a virtual machine.',
        protect: true,
      },
    })
    .input(z.object({ oldName: z.string(), newName: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      await execAsync(
        'virsh domrename ' +
          escapeShellArgument(input.oldName) +
          ' ' +
          escapeShellArgument(input.newName)
      );
    }),
  //#endregion
  //#region getInfo
  getInfo: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/vm/getInfo',
        tags: ['vm'],
        summary: 'Gets information about a virtual machine.',
        protect: true,
      },
    })
    .input(z.object({ name: z.string() }))
    .output(vmInformation.partial())
    .query(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      const { stdout: response } = await execAsync(
        'virsh dominfo ' + escapeShellArgument(input.name)
      );

      const id = z
        .number()
        .optional()
        .catch(undefined)
        .parse(/Id:\s+(.*)\n/i.exec(response)?.[1] ?? ''); //<-- TODO: incorrect
      const uuid = /UUID:\s+(.*)\n/i.exec(response)?.[1] ?? '';
      const osType = /OS Type:\s+(.*)\n/i.exec(response)?.[1] ?? '';
      const state = /State:\s+(.*)\n/i.exec(response)?.[1] ?? '';
      const cpus = +(/CPU\(s\):\s+(.*)\n/i.exec(response)?.[1] ?? '');
      const cpuTime = /CPU time:\s+(.*)\n/i.exec(response)?.[1] ?? '';
      const maxMemory = /Max memory:\s+(.*)\n/i.exec(response)?.[1] ?? '';
      const usedMemory = /Used memory:\s+(.*)\n/i.exec(response)?.[1] ?? '';
      const persistent =
        (/Persistent:\s+(.*)\n/i.exec(response)?.[1] ?? '') === 'yes';
      const autostart =
        (/Autostart:\s+(.*)\n/i.exec(response)?.[1] ?? '') === 'enable';
      const managedSave =
        (/Managed save:\s+(.*)\n/i.exec(response)?.[1] ?? '') === 'yes';
      const securityModel =
        /Security model:\s+(.*)\n/i.exec(response)?.[1] ?? '';
      const securityDoi = /Security DOI:\s+(.*)\n/i.exec(response)?.[1] ?? '';
      return {
        id,
        name: input.name,
        uuid,
        osType,
        state: vmState.catch('undefined').parse(state),
        cpus,
        cpuTime,
        maxMemory: bytes.parse(maxMemory) ?? 0,
        usedMemory: bytes.parse(usedMemory) ?? 0,
        persistent,
        autostart,
        managedSave,
        securityModel,
        securityDoi,
      };
    }),
  //#endregion
  //#region getXml
  getXml: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/vm/getXml',
        tags: ['vm'],
        summary: 'Get the raw domain xml of the virtual machine.',
        protect: true,
      },
    })
    .input(z.object({ name: z.string() }))
    .output(z.string())
    .query(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      return await getDomainXml(input.name);
    }),
  //#endregion
  //#region setXml
  setXml: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/vm/setXml',
        tags: ['vm'],
        summary: 'Sets the raw domain xml of the virtual machine.',
        protect: true,
      },
    })
    .input(z.object({ name: z.string(), xml: z.string() }))
    .output(z.void())
    .mutation(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);

      const parser = new XMLParser({
        ignoreAttributes: true,
      });
      const name = parser.parse(input.xml).domain.name;
      if (name !== input.name)
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: 'Renaming a VM this way is not allowed!',
        });

      await setDomainXml(input.xml);
    }),
  //#endregion
  //#region getDefinition
  getDefinition: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/vm/getDefinition',
        tags: ['vm'],
        summary:
          "Get the definition of the virtual machine. (As a JSON variant of libvirt's domain xml.)",
        protect: true,
      },
    })
    .input(z.object({ name: z.string() }))
    .output(vmDefinition.partial())
    .query(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      const xml = await getDomainXml(input.name);
      const parser = new XMLParser({
        attributeNamePrefix: '@',
        ignoreAttributes: false,
      });
      const parsedXml = parser.parse(xml).domain;
      return vmDefinitionFromXml(parsedXml);
    }),
  //#endregion
  //#region setDefinition
  setDefinition: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/vm/setDefinition',
        tags: ['vm'],
        summary: 'Sets the definition of the virtual machine.',
        protect: true,
      },
    })
    .input(vmDefinition.partial())
    .output(z.void())
    .mutation(async function ({ input: definition, ctx }) {
      await fetchUserFromSession(ctx.session);
      const result = vmDefinitionToXml(definition);
      const builder = new XMLBuilder({
        attributeNamePrefix: '@',
        ignoreAttributes: false,
      });
      console.log(builder.build({ domain: result })); //TODO: create vm instead.
      await setDomainXml(builder.build({ domain: result }));
      //throw new TRPCError({
      //  code: 'INTERNAL_SERVER_ERROR',
      //  message: 'Not implemented!',
      //});
    }),
  //#endregion
  //#region listOperatingSystems
  listOperatingSystems: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/vm/listOperatingSystems',
        tags: ['vm'],
        summary: 'Lists all operating systems known to libosinfo.',
        protect: true,
      },
    })
    .input(z.void())
    .output(
      z
        .object({
          name: z.string(),
          version: z.string(),
          family: z.string(),
          releaseDate: z.string(),
          eolDate: z.string(),
          id: z.string(),
        })
        .array()
    )
    .query(async function () {
      const { stdout } = await execAsync(
        'osinfo-query os --fields=name,version,family,release-date,eol-date,id'
      );
      const result = [] as {
        name: string;
        version: string;
        family: string;
        releaseDate: string;
        eolDate: string;
        id: string;
      }[];
      const table = parseTable(stdout, /\s+\|\s/g);
      for (const row of table)
        result.push({
          name: row['Name'],
          version: row['Version'],
          family: row['Family'],
          releaseDate: row['Release date'],
          eolDate: row['End of life'],
          id: row['ID'],
        });
      return result;
    }),
  //#endregion
  //#region screenshot
  screenshot: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/vm/screenshot',
        tags: ['vm'],
        summary: 'Gets a screenshot of the virtual machine.',
        protect: true,
      },
    })
    .input(z.object({ name: z.string() }))
    .output(z.string())
    .query(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      return await withFile(async function ({ path }) {
        await execAsync(
          'virsh screenshot ' + escapeShellArgument(input.name) + ' ' + path
        );
        const content = await readFile(path);
        return 'data:image/png;base64,' + content.toString('base64');
      });
    }),
  //#endregion
  //#region getNetworks
  getNetworks: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/vm/getNetworks',
        tags: ['vm'],
        summary: 'Lists all networks known to libvirt.',
        protect: true,
      },
    })
    .input(z.void())
    .output(
      z
        .object({
          name: z.string(),
          uuid: z.string(),
          active: z.boolean(),
          autostart: z.boolean(),
          persistent: z.boolean(),
          bridge: z.string(),
        })
        .array()
    )
    .query(async function () {
      const { stdout } = await execAsync('virsh net-list --all --uuid');
      const uuids = stdout.split('\n').filter((x) => x.trim().length > 0);
      const result = uuids.map(async (uuid) => {
        const result = {
          uuid,
          name: '',
          active: false,
          autostart: false,
          persistent: false,
          bridge: '',
        };
        const { stdout } = await execAsync(
          'virsh net-info ' + escapeShellArgument(uuid)
        );
        result.name = /^Name:\s+(.*)\n/im.exec(stdout)?.[1] ?? '';
        result.uuid = /^UUID:\s+(.*)\n/im.exec(stdout)?.[1] ?? '';
        result.active =
          (/^Active:\s+(.*)\n/im.exec(stdout)?.[1] ?? '') === 'yes';
        result.persistent =
          (/^Persistent:\s+(.*)\n/im.exec(stdout)?.[1] ?? '') === 'yes';
        result.autostart =
          (/^Autostart:\s+(.*)\n/im.exec(stdout)?.[1] ?? '') === 'yes';
        result.bridge = /^Bridge:\s+(.*)\n/im.exec(stdout)?.[1] ?? '';
        return result;
      });
      return await Promise.all(result);
    }),
  //#endregion
  //#region getStats
  getStats: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/vm/getStats',
        tags: ['vm'],
        summary: 'Gets statistics about the virtual machine.',
        protect: true,
      },
    })
    .input(z.object({ name: z.string() }))
    .output(
      z.object({
        cpu: z.object({
          cpu: z.number(),
          user: z.number(),
          system: z.number(),
        }),
        memory: z.object({
          actual: z.number().nullable(),
          swapIn: z.number().nullable(),
          swapOut: z.number().nullable(),
          majorFault: z.number().nullable(),
          minorFault: z.number().nullable(),
          unused: z.number().nullable(),
          available: z.number().nullable(),
          usable: z.number().nullable(),
          lastUpdate: z.number().nullable(),
          diskCaches: z.number().nullable(),
          hugetlbPgalloc: z.number().nullable(),
          hugetlbpgfail: z.number().nullable(),
          rss: z.number().nullable(),
        }),
      })
    )
    .query(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      const memStat = await readMemStat(input.name);
      const cpuStat = await readCpuUsage(input.name);
      return {
        memory: {
          actual: memStat.actual ?? null,
          swapIn: memStat.swap_in ?? null,
          swapOut: memStat.swap_out ?? null,
          majorFault: memStat.major_fault ?? null,
          minorFault: memStat.minor_fault ?? null,
          unused: memStat.unused ?? null,
          available: memStat.available ?? null,
          usable: memStat.usable ?? null,
          lastUpdate: memStat.last_update ?? null,
          diskCaches: memStat.disk_caches ?? null,
          hugetlbPgalloc: memStat.hugetlb_pgalloc ?? null,
          hugetlbpgfail: memStat.hugetlb_pgfail ?? null,
          rss: memStat.rss ?? null,
        },
        cpu: {
          cpu: cpuStat.cpu ?? null,
          user: cpuStat.user ?? null,
          system: cpuStat.system ?? null,
        },
      };
    }),
  //#endregion
  //#region getMetrics
  getMetrics: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/vm/getMetrics',
        tags: ['vm'],
        summary: 'Gets the actions of the virtual machine.',
        protect: true,
      },
    })
    .input(
      z.object({
        names: z.string().optional(),
        name: z.string().optional(),
        _cpuHistory: z.number().optional(),
        _memoryHistory: z.number().optional(),
      })
    )
    .output(getMetricsResult)
    .query(async function ({ input, ctx }) {
      await fetchUserFromSession(ctx.session);
      const names = convert(
        input.names,
        (x) => z.string().array().parse(JSON.parse(x!)),
        (x) => x !== '' && x !== null && x !== undefined
      ) ?? [input.name ?? ''];
      const result = {} as z.infer<typeof getMetricsResult>;
      for (const name of names) {
        const lastStateAction = db
          .select()
          .from(domainActions)
          .where(
            and(
              eq(domainActions.domain, name),
              inArray(domainActions.action, ['shut off', 'running', 'paused'])
            )
          )
          .orderBy(desc(domainActions.timestamp))
          .limit(1)
          .all()?.[0];
        result[name] = {
          state: vmState.parse(lastStateAction?.action ?? 'undefined'),
          stateSince: lastStateAction?.timestamp?.getTime() ?? 0,
        };
        //TODO: Get CPU usage for the requested time period.
        //TODO: get Memory usage for the requested time period.
      }
      return result;
    }),
  //#endregion getMetrics
});

async function getDomainXml(vm: string) {
  const { stdout: xml } = await execAsync(
    'virsh dumpxml ' + escapeShellArgument(vm)
  );
  return xml;
}
async function setDomainXml(xml: string) {
  try {
    await withFile(async function ({ path }) {
      await writeFile(path, xml);
      await execAsync('virsh define ' + escapeShellArgument(path));
    });
  } catch (exc) {
    console.log('EXC', exc);
    throw new Error('Failed to set domain xml: ' + xml, {
      cause: JSON.stringify(exc),
    });
  }
}

function escapeShellArgument(str: string) {
  let result = JSON.stringify(str);
  result = result.replaceAll(/\\n/g, '\n');
  return result;
}

async function readMemStat(domain: string) {
  const { stdout } = await execAsync(
    'virsh dommemstat ' + escapeShellArgument(domain)
  );
  const result: Record<string, number> = {};
  const regex = /(\w+) ([0-9\.]+)/gm;
  let regexRes: RegExpExecArray | null;
  while ((regexRes = regex.exec(stdout))) result[regexRes[1]] = +regexRes[2];
  return result;
}
async function readCpuStat(domain: string) {
  const { stdout } = await execAsync(
    'virsh cpu-stats ' + escapeShellArgument(domain) + ' --total'
  );
  const time = hrtime.bigint();
  const result: Record<string, number | bigint> = { time };
  let regexRes: RegExpExecArray | null;
  const regex = /\s*(\w+)\s+([0-9\.]+) seconds/gm;
  while ((regexRes = regex.exec(stdout))) result[regexRes[1]] = +regexRes[2];
  return result;
}

async function getVcpuCount(domain: string) {
  const { stdout } = await execAsync(
    'virsh vcpucount ' + escapeShellArgument(domain)
  );
  const result = {
    maxLive: null as number | null,
    currentLive: null as number | null,
    maxConfig: null as number | null,
    currentConfig: null as number | null,
  };

  const regex = /\s*(max(?:imum)?|current)\s+(config|live)\s+(\d+)/gm;
  let regexRes: RegExpExecArray | null;
  while ((regexRes = regex.exec(stdout))) {
    if (regexRes[1].startsWith('max') && regexRes[2] == 'config')
      result['maxConfig'] = +regexRes[3];
    else if (regexRes[1].startsWith('max') && regexRes[2] == 'live')
      result['maxLive'] = +regexRes[3];
    else if (regexRes[1] == 'current' && regexRes[2] == 'config')
      result['currentConfig'] = +regexRes[3];
    else if (regexRes[1] == 'current' && regexRes[2] == 'live')
      result['currentLive'] = +regexRes[3];
  }
  return result;
}
async function getHostCpuCount() {
  const { stdout } = await execAsync('lscpu');
  const result = {
    sockets: 0,
    cores: 0,
    threads: 0,
  };
  const regex = /^\s*([a-zA-Z0-9_ ()\-]+):\s+(\d+)$/gm;
  let regexRes: RegExpExecArray | null;
  while ((regexRes = regex.exec(stdout))) {
    const key = regexRes[1].toLowerCase();
    const value = +regexRes[2];
    if (key == 'socket(s)') result.sockets = value;
    else if (key == 'core(s) per socket') result.cores = value;
    else if (key == 'thread(s) per core') result.threads = value;
  }
  return result;
}

async function readCpuUsage(domain: string) {
  //NOTE: vCpuCount is actually not required anymore.
  const vCpuCount = (await getVcpuCount(domain)).currentLive ?? 0;
  if (!vCpuCount) return { total: 0, user: 0, system: 0 };

  const v1 = await readCpuStat(domain);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const v2 = await readCpuStat(domain);

  const distance =
    Number((v2.time as bigint) - (v1.time as bigint)) / 1000000000;

  const hostCpuCountResult = await getHostCpuCount();
  const hostCpuCount =
    hostCpuCountResult.cores *
    hostCpuCountResult.threads *
    hostCpuCountResult.sockets;

  const result: Record<string, number> = {};

  new Set([...Object.keys(v1), ...Object.keys(v2)]).forEach((key) => {
    if (!(key in v1)) return;
    if (!(key in v2)) return;
    const a = v1[key];
    const b = v2[key];
    if (typeof a === 'bigint') return;
    if (typeof b === 'bigint') return;
    const newKey = key.endsWith('_time')
      ? key.substring(0, key.length - '_time'.length)
      : key;
    result[newKey] = ((b - a) / hostCpuCount / distance) * 100;
  });

  return result;
}
