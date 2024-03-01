import StandardLayout from '@/components/layout/standard-layout';
import { OsLogo } from '@/components/os-logo';
import { Button } from '@/components/shadcn/ui/button';
import { useAsyncEffect } from '@/lib/react-utils';
import { cn } from '@/lib/shadcn-utils';
import { VmDefinition, VmList } from '@/models';
import { client } from '@/trpc-client';
import {
  AlertTriangleIcon,
  Edit,
  Play,
  Square,
  Trash2Icon,
} from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import bytes from 'bytes-iec';

export default function Vm() {
  const [virtualMachines, setVirtualMachines] = useState<VmList>([]);
  const [definitions, setDefinitions] = useState<Record<string, VmDefinition>>(
    {}
  );
  const [selection, setSelection] = useState<string[]>([]);
  useAsyncEffect(loadVirtualMachines, []);
  return (
    <StandardLayout>
      <Link to="create" className="absolute top-24">
        <Button variant="secondary">Add Virtual Machine</Button>
      </Link>
      <div
        className={cn(
          'relative overflow-auto py-2 @container'
          //"after:fixed after:right-0 after:top-0 after:h-full after:w-20 after:bg-gradient-to-r after:from-red-500 after:to-gray-950 after:content-['']"
        )}
      >
        <div className="flex flex-row">
          {virtualMachines.map((vm) => {
            const online = vm.state === 'running';
            const warning = false;
            return (
              <a href={'/vm/show/' + vm.name} key={'topVM_' + vm.name}>
                <Button
                  className="relative mr-4 h-40 w-72 overflow-hidden rounded-md text-left"
                  variant="ghost"
                >
                  <div
                    className={cn(
                      'absolute left-0 top-0 h-full w-full p-4',
                      warning ? 'bg-yellow-950' : 'bg-gray-900'
                    )}
                  >
                    <OsLogo
                      osId={definitions[vm.name]?.osId}
                      className="float-left mb-2 mr-3 h-16 w-16"
                    />
                    <div
                      className={cn(
                        'absolute right-4 h-2 w-2 overflow-hidden rounded-full ',
                        online ? 'bg-green-500' : 'bg-red-500'
                      )}
                    >
                      &nbsp;
                    </div>
                    <div className="mb-2 text-lg">
                      {warning && (
                        <AlertTriangleIcon className="mr-2 inline-block align-bottom text-yellow-400" />
                      )}
                      {vm.name}
                    </div>
                    <div
                      className={cn(
                        'h-16 overflow-clip text-ellipsis ',
                        warning
                          ? 'text-yellow-400'
                          : online
                            ? 'text-green-500'
                            : ''
                      )}
                    >
                      {' '}
                      {online
                        ? 'Powered on since ? hours.'
                        : 'Powered off since ? hours.'}
                    </div>
                    <div className="absolute bottom-4 left-4 text-xl">???%</div>
                    <div className="absolute bottom-5 right-4 text-xl">
                      ???MiB /{' '}
                      {definitions[vm.name]?.memory != null
                        ? bytes.format(definitions[vm.name]?.memory, {
                            mode: 'binary',
                          })
                        : '...'}
                    </div>
                  </div>
                </Button>
              </a>
            );
          })}
        </div>
      </div>
      <table className="my-8 w-full">
        <thead>
          <tr>
            <th>{/* Checkbox */}</th>
            <th>{/* Icon */}</th>
            <th>Virtual Machine</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {virtualMachines
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((vm) => (
              <tr key={vm.name} className="even:bg-gray-900">
                <td>
                  <input
                    type="checkbox"
                    onClick={(evt) => {
                      const tmp = [...selection.filter((x) => x != vm.name)];
                      if (evt.currentTarget.checked) tmp.push(vm.name);
                      setSelection(tmp);
                    }}
                  />
                </td>
                <td>
                  <OsLogo
                    osId={definitions[vm.name]?.osId}
                    className="m-2 h-10 w-10"
                  />
                </td>
                <td>{vm.name}</td>
                <td>{vm.state}</td>
                <td>
                  <Link to={'show/' + vm.name}>
                    <Button variant="outline">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {selection.length >= 1 && (
        <div className="flex flex-wrap gap-2">
          <Link
            aria-disabled={selection.length !== 1}
            style={{ display: selection.length === 1 ? '' : 'none' }}
            to={selection.length === 1 ? '/vm/show/' + selection[0] : ''}
          >
            <Button>Show "{selection[0]}"</Button>
          </Link>
          <Button
            onClick={async () => {
              await Promise.allSettled(
                selection.map(async (name) => {
                  await client.vm.start.mutate({ name });
                })
              );
              await loadVirtualMachines();
            }}
          >
            <Play className="mr-2 h-4 w-4" /> Start
          </Button>
          <Button
            onClick={async () => {
              await Promise.allSettled(
                selection.map(async (name) => {
                  await client.vm.stop.mutate({ name, force: true });
                })
              );
              await loadVirtualMachines();
            }}
          >
            <Square className="mr-2 h-4 w-4" /> Stop
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (
                selection.length === 1 &&
                !confirm(
                  `Do you really want to delete the virtual machine "${selection[0]}"?`
                )
              )
                return;
              if (
                selection.length > 1 &&
                !confirm(
                  `Do you really want to delete these ${+selection.length} virtual machines?\n${selection.map((name) => ` - ${name}`).join('\n')}`
                )
              )
                return;
              await Promise.allSettled(
                selection.map(async (name) => {
                  await client.vm.remove.mutate({ name });
                })
              );
              await loadVirtualMachines();
            }}
          >
            <Trash2Icon className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      )}
    </StandardLayout>
  );

  async function loadVirtualMachines() {
    const vms = await client.vm.list.query();
    setVirtualMachines(vms);

    const defs = await Promise.all(
      vms.map(async (vm) => {
        return {
          key: vm.name,
          value: await client.vm.getDefinition.query({ name: vm.name }),
        };
      })
    );
    setDefinitions(
      defs.reduce(
        (prev, curr) => {
          prev[curr.key] = curr.value;
          return prev;
        },
        {} as typeof definitions
      )
    );
  }
}
