import { TRPCError } from '@trpc/server';
import { trpc } from '../trpc.js';
import { string, z } from 'zod';
import { promisify } from 'util';
import { exec } from 'child_process';
import { fetchUserFromSession } from '../trpcUtils.js';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import bytes from 'bytes-iec';
import { withFile } from 'tmp-promise';
import { writeFile, readFile } from 'fs/promises';
import {
  vmDefinition,
  vmDefinitionFromXml,
  vmDefinitionToXml,
} from '../models/vm.js';
const execAsync = promisify(exec);

const vmState = z.enum(['undefined', 'shut off', 'running', 'paused']);

const instance = z.object({
  id: z.string().optional(),
  name: z.string(),
  state: vmState,
});
type Instance = z.infer<typeof instance>;

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

export const vmRouter = trpc.router({
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
      const { stdout } = await execAsync('virsh list --all', {
        encoding: 'utf8',
      });
      const result = [] as Instance[];
      const table = parseTable(stdout);
      for (const row of table)
        result.push({
          id: row['Id'],
          name: row['Name'],
          state: vmState.catch('undefined').parse(row['State']),
        });
      return result;
    }),
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

function parseTable(
  text: string,
  separator: RegExp = /\s\s+/g
): Record<string, string>[] {
  const lines = text.split('\n');
  const result: Record<string, string>[] = [];
  const columns: { title: string; pos: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length == 0) continue;
    if (i == 0) {
      //Header line determine positions
      let title = '';

      //for (let j = 0; j < line.length; j++) {
      while (true) {
        let startPos = separator.lastIndex;
        const regexRes = separator.exec(line);
        title = line.substring(startPos, regexRes?.index ?? line.length).trim();
        if (title.length > 0) columns.push({ title, pos: startPos });

        if (!regexRes || regexRes.length <= 0) break;
        const endPos = regexRes.index + regexRes[0].length;

        separator.lastIndex = endPos;
      }
      continue;
    }
    if (i == 1) {
      //Separator line. Nothing to do here.
      continue;
    }
    const resultRow: Record<string, string> = {};
    for (let j = 0; j < columns.length; j++) {
      const column = columns[j];
      const endPos = j + 1 < columns.length ? columns[j + 1].pos : line.length;
      const value = line.substring(column.pos, endPos);

      resultRow[column.title] = value.replaceAll(separator, '').trim();
    }
    result.push(resultRow);
  }
  return result;
}
