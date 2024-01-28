import StandardLayout from '@/components/layout/standard-layout';
import MemorySelector from '@/components/memorySelector';
import { Button } from '@/components/shadcn/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/ui/dropdown-menu';
import { Input } from '@/components/shadcn/ui/input';
import { Skeleton } from '@/components/shadcn/ui/skeleton';
import { useAsyncEffect } from '@/lib/react-utils';
import { client } from '@/trpc-client';
import { Cpu, Disc, HardDrive, Network, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { selectFile } from '@/components/file-selector';
import { Device } from '@/models';
type VmDefinition = Awaited<ReturnType<typeof client.vm.getDefinition.query>>;
export default function EditVm() {
  const { id } = useParams();
  const [definition, setDefinition] = useState<VmDefinition | null>(null);
  const [_fileSelectorVisible, setFileSelectorVisible] = useState(false);
  let originalDefinition: VmDefinition | null = null;
  useAsyncEffect(async function () {
    const name = id ?? '';
    originalDefinition = await client.vm.getDefinition.query({ name });
    setDefinition(originalDefinition);
  }, []);
  console.log(definition);
  const addDeviceToDefinition = function (device: Device) {
    if (!definition) return;
    setDefinition({
      ...definition,
      devices: [...definition.devices, device],
    });
  };

  return (
    <StandardLayout>
      <Link to="/vm">
        <Button>Back</Button>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className="mx-5">
          <PlusCircle className="mr-2 inline-block" />
          Add Device
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => {
              setFileSelectorVisible(true);
            }}
          >
            <HardDrive className="mr-2 inline-block" />
            Add Hard Disk
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              //TODO: Ask for file location...
              const file = await selectFile();
              if (file == null) return;
              console.log('FILE IS', file);
              addDeviceToDefinition({
                deviceType: 'disk',
                type: 'file',
                source: { type: 'file', value: file },
                device: 'disk',
              });
            }}
          >
            <Disc className="mr-2 inline-block" />
            Add Optical Drive
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Network className="mr-2 inline-block" />
            Add Network Adapter
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Cpu className="mr-2 inline-block" />
            Add Generic Device
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <h2>{id}</h2>
      {definition ? (
        <>
          <label>
            <span>Name:</span>{' '}
            <Input
              value={definition.name}
              onChange={(evt) => {
                setDefinition({ ...definition, name: evt.target.value });
              }}
            />
          </label>
          <label>
            <span>CPUs:</span>
            <Input
              value={definition.vcpuCount}
              onChange={(evt) => {
                setDefinition({ ...definition, vcpuCount: +evt.target.value });
              }}
              type="number"
              min="1"
            />
          </label>
          <label>
            <span>Memory:</span>{' '}
          </label>
          <MemorySelector
            value={definition.memory}
            onChange={(memory) => {
              setDefinition({ ...definition, memory });
            }}
          />
          {definition.devices.map((device, idx) => {
            if (device.deviceType === 'disk' && device.device == 'disk') {
              console.log(device);
              return (
                <div key={idx}>
                  <HardDrive className="mr-2 inline-block" />
                  {'value' in device.source &&
                  typeof device.source.value === 'string'
                    ? device.source.value
                    : '??'}
                </div>
              );
            }
            if (device.deviceType === 'disk' && device.device == 'cdrom') {
              return (
                <div key={idx}>
                  <Disc className="mr-2 inline-block" />
                  {'value' in device.source &&
                  typeof device.source.value === 'string'
                    ? device.source.value
                    : '??'}
                </div>
              );
            } else {
              return JSON.stringify(device);
            }
          })}
        </>
      ) : (
        <Skeleton className="m-10 h-[200px]" />
      )}
    </StandardLayout>
  );
}
