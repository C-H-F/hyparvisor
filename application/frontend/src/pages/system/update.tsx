import StandardLayout from '@/components/layout/standard-layout';
import { Alert } from '@/components/shadcn/ui/alert';
import { Button } from '@/components/shadcn/ui/button';
import { Skeleton } from '@/components/shadcn/ui/skeleton';
import { useAsyncEffect } from '@/lib/react-utils';
import { range } from '@/lib/utils';
import { client } from '@/trpc-client';
import { useState } from 'react';

export default function Update() {
  type UpdatePackages = Awaited<
    ReturnType<typeof client.system.getUpdates.query>
  >['packages'];
  const [packages, setPackages] = useState<UpdatePackages | null>(null);
  const [upating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState('');
  const [error, setError] = useState('');

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

  async function requestUpdates() {
    try {
      const updating = await client.system.isUpdating.query();
      if (updating) {
        setUpdating(true);
        setUpdateLog(
          await client.system.getUpdateStatus.query({
            start: 0,
          })
        );
        await showPendingUpdates();
        setUpdating(false);
        return;
      }

      const response = await client.system.getUpdates.query();
      setPackages(response.packages);
    } catch (err) {
      setError(err + '');
    }
  }

  useAsyncEffect(requestUpdates, []);

  return (
    <div>
      <StandardLayout>
        <h2>Update</h2>
        {error != '' ? <Alert>{error}</Alert> : ''}
        {updateLog ? (
          <pre className="m-5 whitespace-pre-wrap bg-gray-200 p-5 font-mono dark:bg-gray-800">
            {updateLog}
          </pre>
        ) : (
          ''
        )}
        {upating ? (
          ''
        ) : !packages || !packages.length ? (
          <p>
            There are no packages available at the moment.
            <Button variant="link" onClick={() => requestUpdates()}>
              Click here to check for updates.
            </Button>
          </p>
        ) : (
          <div>
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Current Version</th>
                  <th>Latest Version</th>
                </tr>
              </thead>
              <tbody>
                {(packages ?? range(10).map(() => null)).map((pkg, idx) =>
                  pkg === null ? (
                    <tr key={idx}>
                      <td>
                        <Skeleton className="h-4 w-[250px]" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-[120px]" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-[120px]" />
                      </td>
                    </tr>
                  ) : (
                    <tr key={pkg.name}>
                      <td>{pkg.name}</td>
                      <td>{pkg.currentVersion}</td>
                      <td>{pkg.latestVersion}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            <Button
              disabled={upating}
              onClick={async () => {
                setUpdating(true);

                await client.system.update.mutate();

                await showPendingUpdates();

                setUpdating(false);
                await requestUpdates();
              }}
            >
              Udate System
            </Button>
          </div>
        )}
      </StandardLayout>
    </div>
  );
}
