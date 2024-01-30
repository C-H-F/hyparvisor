import StandardLayout from '@/components/layout/standard-layout';
import { Button } from '@/components/shadcn/ui/button';
import { Skeleton } from '@/components/shadcn/ui/skeleton';
import { useAsyncEffect } from '@/lib/react-utils';
import { client } from '@/trpc-client';
import {
  Component,
  Cpu,
  Disc,
  Eraser,
  HardDrive,
  KeyboardIcon,
  MemoryStick,
  Monitor,
  MoreVertical,
  MouseIcon,
  NetworkIcon,
  PauseIcon,
  PlayIcon,
  PlusCircle,
  Save,
  ServerCogIcon,
  SquareIcon,
  TabletIcon,
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import bytes from 'bytes-iec';
import { Device, VmDefinition, VmInfo, VncGraphicsDevice } from '@/models';
import { CpuConfigurationDialog } from '@/components/dialogs/cpu-configuration-dialog';
import { MemoryConfigurationDialog } from '@/components/dialogs/memory-configuration-dialog';
import ComboBox from '@/components/combobox';
import { OsLogo } from '@/components/os-logo';
import { SortableArrayList } from '@/components/sortable-list/sortable-array-list';
import { SortableList } from '@/components/sortable-list';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/ui/dropdown-menu';
import { selectFile } from '@/components/file-selector';
import { cn } from '@/lib/shadcn-utils';
import { GamepadIcon } from 'lucide-react';

type OperatingSystem = Awaited<
  ReturnType<typeof client.vm.listOperatingSystems.query>
>[0];

async function getDefaultPath() {
  return '/home/user';
}

export default function ShowVm() {
  let screenshotInterval: NodeJS.Timeout;
  const { id } = useParams();
  const [info, setInfo] = useState<VmInfo | null>(null);
  const [definition, setDefinition] = useState<VmDefinition | null>(null);
  const [sourceDefinition, setSourceDefinition] = useState<VmDefinition | null>(
    null
  );
  const [operatingSystems, setOperatingSystems] = useState<OperatingSystem[]>(
    []
  );
  const [screenshot, setScreenshot] = useState<string | null>(null);
  useAsyncEffect(async function () {
    const operatingSystems = await client.vm.listOperatingSystems.query();
    setOperatingSystems(operatingSystems);
  }, []);
  useAsyncEffect(async function () {
    const name = id ?? '';
    const pInfo = client.vm.getInfo.query({ name });
    const pDefinition = client.vm.getDefinition.query({ name });
    const info = await pInfo;
    const definition = await pDefinition;
    setInfo(info);
    setDefinition(definition);
    setSourceDefinition(definition);
  }, []);
  useAsyncEffect(
    async function () {
      if (info?.state != 'running') return;
      screenshotInterval = setInterval(async () => {
        const name = id ?? '';
        const info = await client.vm.getInfo.query({ name });
        if (info.state != 'running') {
          setScreenshot(null);
          clearInterval(screenshotInterval);
          setInfo(info);
          return;
        }
        const screenshot = await client.vm.screenshot.query({ name });
        setScreenshot(screenshot);
      }, 1000);
    },
    [info?.state],
    () => {
      clearInterval(screenshotInterval);
    }
  );
  const definitionChanged =
    JSON.stringify(definition) !== JSON.stringify(sourceDefinition);

  if (!id) {
    return <></>;
  }
  return (
    <StandardLayout>
      <Link to="/vm">
        <Button>Back</Button>
      </Link>

      <Link to={'/vm/edit/' + id}>
        <Button>Edit</Button>
      </Link>
      <Link to={'/vm/xml/' + id}>
        <Button>XML</Button>
      </Link>

      {info && definition ? (
        <>
          <div className="my-3 flex flex-row items-center gap-3">
            <ComboBox
              values={operatingSystems.reduce(
                (prev, curr) => {
                  prev[curr.id] = (
                    <span className="whitespace-nowrap">
                      <OsLogo
                        osId={curr.id}
                        className="mr-2 inline-block h-5 w-5"
                      />
                      <span>{curr.name}</span>
                    </span>
                  );
                  return prev;
                },
                {} as Record<string, ReactNode>
              )}
              trigger={
                <Button
                  variant="ghost"
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary p-1"
                >
                  <OsLogo osId={definition.osId} />
                </Button>
              }
              selected={definition.osId}
              onSelect={(osId) => {
                setDefinition({ ...definition, osId });
              }}
            />
            <h2 className="text-lg">{id}</h2>
            <span className="flex-grow">
              <span
                className={cn(
                  'text-xs',
                  info.state === 'running' && 'text-green-500',
                  info.state === 'shut off' && 'text-red-500'
                )}
              >
                ({info.state})
              </span>
            </span>
            {definitionChanged ? (
              <>
                <Button
                  variant="ghost"
                  className="reset"
                  onClick={async () => {
                    let value = sourceDefinition;
                    try {
                      value = await client.vm.getDefinition.query({
                        name: id ?? '',
                      });
                      setSourceDefinition(value);
                    } catch (_) {}
                    setDefinition(value);
                  }}
                >
                  <Eraser />
                </Button>
                <Button
                  variant="ghost"
                  className="submit"
                  onClick={async () => {
                    const differences = definition; //TODO: Set differences only!
                    await client.vm.setDefinition.mutate(differences);
                    {
                      const value = await client.vm.getDefinition.query({
                        name: id ?? '',
                      });
                      setSourceDefinition(value);
                      setDefinition(value);
                    }
                    setInfo(await client.vm.getInfo.query({ name: id }));
                  }}
                >
                  <Save />
                </Button>
              </>
            ) : (
              <></>
            )}
            <Button
              variant="ghost"
              onClick={async () => {
                if (info.state === 'paused')
                  await client.vm.resume.mutate({ name: id });
                else await client.vm.start.mutate({ name: id });
                setInfo(await client.vm.getInfo.query({ name: id }));
              }}
              style={{
                display: info.state === 'running' ? 'none' : '',
              }}
            >
              <PlayIcon />
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await client.vm.pause.mutate({ name: id });
                setInfo(await client.vm.getInfo.query({ name: id }));
              }}
              style={{
                display:
                  info.state === 'paused' || info.state === 'shut off'
                    ? 'none'
                    : '',
              }}
            >
              <PauseIcon />
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await client.vm.stop.mutate({ name: id, force: true });
                setInfo(await client.vm.getInfo.query({ name: id }));
              }}
              style={{
                display: info.state === 'shut off' ? 'none' : '',
              }}
            >
              <SquareIcon />
            </Button>
          </div>
          <div className="masonry">
            <div className="inline-flex flex-col items-stretch gap-3">
              <div
                className="flex h-48 flex-col items-center overflow-hidden rounded-sm border-4 border-gray-800 bg-gray-800"
                onClick={() => {
                  const vncDevice = definition.devices.find(
                    (x) =>
                      x.deviceType == 'graphics' && x.graphicsDevice == 'vnc'
                  ) as VncGraphicsDevice | undefined;
                  const vncPort = vncDevice?.port ?? 0;
                  window.open(
                    '/novnc/vnc.html?path=websockify/' +
                      vncPort +
                      '&autoconnect=1'
                  );
                }}
              >
                {screenshot ? (
                  <img
                    src={screenshot}
                    alt="Screenshot"
                    className="max-h-full max-w-full flex-shrink flex-grow"
                  />
                ) : (
                  ''
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex">
                  <h2 className="flex-grow">Devices</h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="mx-5">
                      <PlusCircle className="mr-2 inline-block" />
                      Add Device
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={async () => {
                          const file = await selectFile({
                            path: await getDefaultPath(),
                            filters: {
                              '\\.(qcow2|raw)$': 'Disk Images (*.qcow2, *.raw)',
                              '.*': 'All Files',
                            },
                          });
                          if (file == null) return;
                          addDeviceToDefinition({
                            deviceType: 'disk',
                            type: 'file',
                            source: { type: 'file', value: file },
                            device: 'disk',
                          });
                        }}
                      >
                        <HardDrive className="mr-2 inline-block" />
                        Add Hard Disk
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const file = await selectFile({
                            path: await getDefaultPath(),
                            filters: {
                              '\\.iso$': 'ISO Files (*.iso)',
                              '.*': 'All Files',
                            },
                          });
                          if (file == null) return;

                          addDeviceToDefinition({
                            deviceType: 'disk',
                            type: 'file',
                            source: { type: 'file', value: file },
                            device: 'cdrom',
                            target: { bus: 'sata', dev: getNextHdDev() },
                          });
                        }}
                      >
                        <Disc className="mr-2 inline-block" />
                        Add Optical Drive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const file = await selectFile({
                            path: await getDefaultPath(),
                            filters: {
                              '\\.img$': 'Floppy image (*.img)',
                              '.*': 'All Files',
                            },
                          });
                          if (file == null) return;
                          addDeviceToDefinition({
                            deviceType: 'disk',
                            type: 'file',
                            source: { type: 'file', value: file },
                            device: 'floppy',
                          });
                        }}
                      >
                        <Save className="mr-2 inline-block" />
                        Add Floppy Drive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          addDeviceToDefinition({
                            deviceType: 'interface',
                            interfaceType: 'network',
                            sourceNetwork: 'default',
                          });
                        }}
                      >
                        <NetworkIcon className="mr-2 inline-block" />
                        Add Network Adapter
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Cpu className="mr-2 inline-block" />
                        Add Generic Device
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <SortableArrayList
                  items={definition.devices}
                  onChange={(devices) =>
                    setDefinition({ ...definition, devices })
                  }
                  renderItem={(device, index) => {
                    let key = '';
                    let text = 'Unknown device';
                    let icon = <Component />;
                    if (
                      device.deviceType === 'graphics' &&
                      device.graphicsDevice === 'vnc'
                    ) {
                      key = `vnc@${(device as VncGraphicsDevice).port}`;
                      text = `VNC @ ${(device as VncGraphicsDevice).port}`;
                      icon = <Monitor />;
                    }
                    if (
                      device.deviceType === 'disk' &&
                      device.device === 'cdrom' &&
                      device.source.type === 'file'
                    ) {
                      key = `cdrom@${device.source}`;
                      text = `${device.source.value}`;
                      icon = <Disc />;
                    }
                    if (
                      device.deviceType === 'disk' &&
                      device.device === 'disk' &&
                      device.source.type === 'file'
                    ) {
                      key = `disk@${device.source}`;
                      text = `${device.source.value}`;
                      icon = <HardDrive />;
                    }
                    if (
                      device.deviceType === 'interface' &&
                      device.interfaceType === 'network'
                    ) {
                      key = `network@${device.macAddress}`;
                      text = `${device.macAddress} -> ${device.sourceNetwork} ${device.alias}`;
                      icon = <NetworkIcon />;
                    }
                    if (device.deviceType === 'input') {
                      key = `input@?`;
                      text = `${device.bus} ${device.inputDevice}`;
                      if (device.alias) text = device.alias + ': ' + text;
                      switch (device.inputDevice) {
                        case 'keyboard':
                          icon = <KeyboardIcon />;
                          break;
                        case 'mouse':
                          icon = <MouseIcon />;
                          break;
                        case 'tablet':
                          icon = <TabletIcon />;
                          break;
                        case 'passthrough':
                          icon = <GamepadIcon />;
                          break;
                        case 'evdev':
                          icon = <ServerCogIcon />;
                          break;
                        default:
                          icon = <Component />;
                          break;
                      }
                    }
                    return (
                      <SortableList.Item
                        id={index}
                        className="flex w-full"
                        data-key={key}
                      >
                        <SortableList.DragHandle />
                        <div className="flex flex-grow items-center">
                          {icon}
                          <span className="ml-3 flex-grow">{text}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="mx-5">
                              <MoreVertical className="mr-2 inline-block" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={async () => {
                                  setDefinition({
                                    ...definition,
                                    devices: [
                                      ...definition.devices.filter(
                                        (x) => x !== device
                                      ),
                                    ],
                                  });
                                }}
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </SortableList.Item>
                    );
                  }}
                />
              </div>
            </div>
            <CpuConfigurationDialog
              cpuDetails={{ vcpuCount: definition.vcpuCount }}
              onSave={async (cpuDetails) => {
                setDefinition({
                  ...definition,
                  vcpuCount: cpuDetails.vcpuCount,
                });
              }}
            >
              <Button
                variant="outline"
                className="flex-row px-0 py-7 text-left"
              >
                <Cpu className="mr-3 h-14 w-14 p-2" />
                <div className="flex flex-grow flex-col justify-center">
                  {info.state == 'running' ? (
                    <>
                      <p>{info.cpus} CPUs</p>
                      <p>{info.cpuTime}</p>
                    </>
                  ) : (
                    <>
                      <p>{definition.vcpuCount} CPUs</p>
                    </>
                  )}
                </div>
              </Button>
            </CpuConfigurationDialog>
            <MemoryConfigurationDialog
              memoryDetails={{ memorySize: definition.memory }}
              onSave={async (memoryDetails) => {
                setDefinition({
                  ...definition,
                  memory: memoryDetails.memorySize,
                });
              }}
            >
              <Button
                variant="outline"
                className="flex-row px-0 py-7 text-left"
              >
                <MemoryStick className="mr-3 h-14 w-14 p-2" />
                <div className="flex flex-grow flex-col justify-center">
                  {info.state == 'running' ? (
                    <>
                      {bytes.format(info.usedMemory ?? 0, { mode: 'binary' })}
                      {' / '}
                      {bytes.format(info.maxMemory ?? 0, { mode: 'binary' })}
                    </>
                  ) : (
                    <>{bytes.format(definition.memory, { mode: 'binary' })}</>
                  )}
                </div>
              </Button>
            </MemoryConfigurationDialog>
          </div>
        </>
      ) : (
        <Skeleton className="m-10 h-[400px]" />
      )}
    </StandardLayout>
  );
  function addDeviceToDefinition(device: Device) {
    if (!definition) return;
    setDefinition({
      ...definition,
      devices: [...definition.devices, device],
    });
  }
  function getNextHdDev() {
    if (!definition) return 'hda';
    for (let i = 0; i < 64; i++) {
      let char = String.fromCharCode('a'.charCodeAt(0) + i);
      const result = 'hd' + char;
      let found = false;
      for (const device of definition.devices) {
        if (device.deviceType == 'disk' && device.target) {
          if (device.target.dev == result) {
            found = true;
            break;
          }
        }
      }
      if (!found) return result;
    }
    return '';
  }
}
