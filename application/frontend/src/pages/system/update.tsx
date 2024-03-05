import StandardLayout from '@/components/layout/standard-layout';
import { Button } from '@/components/shadcn/ui/button';
import { Card } from '@/components/shadcn/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/ui/table';
import { useAsyncEffect } from '@/lib/react-utils';
import { client } from '@/trpc-client';
import {
  ExternalLinkIcon,
  Loader2Icon,
  MonitorDownIcon,
  PackageCheckIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { useState } from 'react';

type State = 'idle' | 'checking' | 'updating' | 'error';
type UpdatePackages = Awaited<
  ReturnType<typeof client.system.getUpdates.query>
>['packages'];

export default function Update() {
  const [packages, setPackages] = useState<UpdatePackages>([]);
  const [state, setState] = useState<State>('idle');
  const [updateLog, setUpdateLog] = useState('');

  useAsyncEffect(async () => {
    await checkForUpdates();
  }, []);

  return (
    <StandardLayout>
      {state === 'checking' && (
        <div className="m-20 flex items-center justify-center">
          <Card className="flex flex-row items-center gap-5 p-5">
            <Loader2Icon className="h-20 w-20 animate-spin opacity-50" />
            <div>
              <p>Please wait...</p>
              <p>The system is currently checking for updates.</p>
            </div>
          </Card>
        </div>
      )}
      {state === 'idle' && (
        <div>
          {packages.length > 0 ? (
            <>
              <Button
                className="absolute top-10"
                variant="ghost"
                onClick={startUpdate}
              >
                <MonitorDownIcon className="mr-3 h-8 w-8" />
                <span>Start update</span>
              </Button>

              <Table>
                <TableCaption>
                  Found {packages.length} packages ready to update.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead className="w-36">Current Version</TableHead>
                    <TableHead className="w-36">Latest Version</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.name}>
                      <TableCell>
                        {pkg.repository === 'other' ? (
                          pkg.name
                        ) : (
                          <a
                            className="hover:underline"
                            target="_blank"
                            href={`https://archlinux.org/packages/${encodeURIComponent(pkg.repository)}/x86_64/${encodeURIComponent(pkg.name)}`}
                          >
                            {pkg.name}{' '}
                            <ExternalLinkIcon className="inline-block h-3 w-3 opacity-25" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell>{pkg.currentVersion}</TableCell>
                      <TableCell>{pkg.latestVersion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-10 flex gap-4">
                <Button onClick={checkForUpdates}>
                  <RefreshCwIcon className="mr-3" /> Check for updates
                </Button>
                <span className="flex-grow"></span>

                <Button disabled={packages.length <= 0} onClick={startUpdate}>
                  <MonitorDownIcon className="mr-3" /> Start update now
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <PackageCheckIcon className="h-40 w-40 opacity-25" />
              <p className="text-center text-3xl opacity-25">
                No updates found.
              </p>
              <Button onClick={checkForUpdates} className="mt-10">
                <RefreshCwIcon className="mr-3" /> Check again
              </Button>
            </div>
          )}
        </div>
      )}
      {state === 'updating' && (
        <div>
          <div className="flex items-center gap-2">
            <Loader2Icon className="animate-spin opacity-50" />
            <p className="">Updating system...</p>
          </div>
          <pre className="m-5 whitespace-pre-wrap bg-gray-200 p-5 font-mono dark:bg-gray-800">
            {updateLog}{' '}
          </pre>
        </div>
      )}
    </StandardLayout>
  );

  async function checkForUpdates() {
    setState('checking');

    const updating = await client.system.isUpdating.query();
    if (updating) {
      setState('updating');
      await showPendingUpdates();
    }
    setState('checking');
    const response = await client.system.getUpdates.query();
    setPackages(response.packages);
    setState('idle');
  }
  async function startUpdate() {
    await client.system.update.mutate();
    setState('updating');
    await showPendingUpdates();
    await checkForUpdates();
  }
  async function showPendingUpdates() {
    let isUpdating = true;
    do {
      isUpdating = await client.system.isUpdating.query();
      setUpdateLog(
        updateLog +
          (await client.system.getUpdateStatus.query({
            start: updateLog.length,
          }))
      );
      await new Promise((cb) => setTimeout(cb, 1000));
    } while (isUpdating);
  }
}
