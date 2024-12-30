import StandardLayout from '@/components/layout/standard-layout';
import { Button } from '@/components/shadcn/ui/button';
import { Card } from '@/components/shadcn/ui/card';
import { Skeleton } from '@/components/shadcn/ui/skeleton';
import { useInterval } from '@/lib/react-utils';
import { cn } from '@/lib/shadcn-utils';
import { range } from '@/lib/utils';
import { AccountDetails, makeDefaultAccountDetails } from '@/models';
import {
  expandPermissions,
  parsePermissions,
  zRootPermission,
  zSubPermission,
} from '@/permissions';
import { client } from '@/trpc-client';
import { format, formatDistance } from 'date-fns';
import { CheckIcon, XIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';

export function Users() {
  const [accountDetails, setAccountDetails] = useState<AccountDetails>(
    makeDefaultAccountDetails()
  );
  useInterval(async () => {
    const result = await client.user.getAccountDetails.query({
      sessionLimit: 3,
    });
    if (JSON.stringify(accountDetails) != JSON.stringify(result))
      setAccountDetails(result);
  }, 1000);

  const permissions = accountDetails.email
    ? expandPermissions(
        accountDetails.role === 'Administrator'
          ? zRootPermission.options //Allow everything
          : parsePermissions(accountDetails.permissions) //Parse defined permissions
      )
    : null;

  return (
    <StandardLayout>
      <div className="flex flex-wrap gap-3">
        <Card className="flex flex-col p-3">
          <h3 className="font-bold">
            {accountDetails.email || <Skeleton className="my-1 h-5 w-20" />}
          </h3>
          <p className="my-2 text-xs italic">
            {accountDetails.role || <Skeleton className="h-4 w-52" />}
          </p>
          <p className="text-sm">
            {accountDetails.home || <Skeleton className="h-4 w-64" />}
          </p>
          <div className="flex-grow"></div>
          <div className="flex gap-3">
            <a
              href={`/system/users/${encodeURIComponent(
                accountDetails.email
              )}/password`}
            >
              <Button>Change Password</Button>
            </a>
            <Button
              variant="destructive"
              disabled={accountDetails.role === 'Administrator'}
            >
              Delete Account
            </Button>
          </div>
        </Card>
        <Card className="w-80 p-3">
          <h3>Logins</h3>
          <ul className="my-3 text-sm">
            {accountDetails.email === '' &&
              range(0, 3).map(() => <Skeleton className="mb-2 h-4" />)}
            {accountDetails.sessions.map((session) => (
              <li
                key={session.begin}
                className={cn(
                  session.end > new Date().getTime() ? '' : 'opacity-50'
                )}
              >
                {format(session.begin, 'PPpp')} (
                {formatDistance(session.end, new Date(), { addSuffix: true })})
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-3">
          <h3>Permissions</h3>
          <ul className="my-3 columns-3">
            {zSubPermission.options.map((permission) => (
              <li>
                {permissions ? (
                  permissions.includes(permission) ? (
                    <CheckIcon className="inline-block w-4 text-green-500" />
                  ) : (
                    <XIcon className="inline-block w-4 text-red-500" />
                  )
                ) : (
                  <Loader2Icon className="inline-block w-4 animate-spin text-gray-500" />
                )}{' '}
                {permission}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </StandardLayout>
  );
}
