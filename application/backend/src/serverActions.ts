import { and, desc, eq, inArray, like } from 'drizzle-orm';
import { db } from './database/drizzle.js';
import { domainActions, temporaries } from './database/schema.js';
import { rmdir, stat, unlink } from 'fs/promises';
import { z } from 'zod';
import { vmState } from './models/vm.js';
import { listAllVirtualMachines } from './virshManager.js';

const action = z.union([
  z.literal('cpu_usage'),
  z.literal('memory_usage'),
  vmState,
]);
export type Action = z.infer<typeof action>;

export async function runServerActions() {
  // Delete all temporary files that still exist from the last session.
  await deleteTemporaryFiles();
  updateDomainActions();
}

async function updateDomainActions() {
  async function implementation() {
    const vms = await listAllVirtualMachines();
    for (const vm of vms) {
      const stateValues = Object.values(vmState.Values);
      const lastStateInformation = db
        .select()
        .from(domainActions)
        .where(
          and(
            eq(domainActions.domain, vm.name),
            inArray(domainActions.action, stateValues)
          )
        )
        .orderBy(desc(domainActions.timestamp))
        .limit(1)
        .all();

      if (
        lastStateInformation.length == 0 ||
        lastStateInformation[0].action != vm.state
      ) {
        db.insert(domainActions)
          .values({
            domain: vm.name,
            timestamp: new Date(),
            action: vm.state,
            value: 0,
          })
          .run();
      }
      if (vm.state !== 'running') continue;

      // For every running VM update CPU and memory usage.
      //TODO: Handle actions
    }
  }

  while (true) {
    await implementation();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function deleteTemporaryFiles() {
  const temporaryFiles = db
    .select()
    .from(temporaries)
    .where(like(temporaries.key, 'file://'))
    .all();
  for (const temporaryFile of temporaryFiles) {
    const filePath = temporaryFile.key.slice('file://'.length);
    try {
      const file = await stat(filePath);
      if (file.isDirectory()) await rmdir(filePath, { recursive: true });
      else if (file.isFile()) await unlink(filePath);
      db.delete(temporaries)
        .where(eq(temporaries.key, temporaryFile.key))
        .run();
    } catch {}
  }
}
