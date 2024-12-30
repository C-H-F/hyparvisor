import StandardLayout from '@/components/layout/standard-layout';
import { Button } from '@/components/shadcn/ui/button';
import { Card } from '@/components/shadcn/ui/card';
import { Input } from '@/components/shadcn/ui/input';
import { Label } from '@/components/shadcn/ui/label';
import { Switch } from '@/components/shadcn/ui/switch';
import { createPasswordHash } from '@/lib/app-utils';
import { cn } from '@/lib/shadcn-utils';
import { client } from '@/trpc-client';
import { LoaderCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

export function Password() {
  const { id: rawId } = useParams();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatNewPassword, setRepeatNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const username = rawId || '';
  const msg = oldPassword ? checkPassword(newPassword, repeatNewPassword) : '';
  return (
    <StandardLayout>
      <div className="flex gap-4">
        <Card className="flex w-96 flex-col gap-2 p-3">
          <span>
            Change password of <strong>{username}</strong>
          </span>
          <Input
            type="password"
            placeholder="Old Password"
            value={oldPassword}
            onChange={(e) => {
              setOldPassword(e.target.value);
            }}
          />
          <Input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
            }}
          />
          <Input
            type="password"
            placeholder="Repeat new Password"
            value={repeatNewPassword}
            onChange={(e) => {
              setRepeatNewPassword(e.target.value);
            }}
          />
          <span>{msg || message}</span>
          <Button
            className="relative"
            disabled={!!msg || changingPassword}
            onClick={async (evt) => {
              try {
                setChangingPassword(true);
                if (repeatNewPassword !== newPassword) return;

                const res = await client.user.login.mutate({
                  email: username,
                  password: await createPasswordHash(username, oldPassword),
                  newPassword: await createPasswordHash(username, newPassword),
                  agent: navigator.userAgent,
                });
                setMessage('');
              } catch (e) {
                let msg = e + '';
                if (e && typeof e === 'object' && 'message' in e)
                  msg = e.message + '';
                setMessage(msg);
              } finally {
                setChangingPassword(false);
              }
            }}
          >
            <LoaderCircleIcon
              className={cn(
                'absolute left-4 animate-spin',
                changingPassword ? 'visible' : 'hidden'
              )}
            />
            <span>Change Password</span>
          </Button>
        </Card>
      </div>

      <div className="flex">
        <Switch id="passExpires" />
        <label htmlFor="passExpires">Password expires</label>
      </div>
      <div className="flex">
        <span>in</span>
        <Input type="number" />
        <span>days.</span>
      </div>
      <Button>Change expiration</Button>
    </StandardLayout>
  );
}

function checkPassword(p1: string, p2: string) {
  if (!p1) return 'The new password must not be empty.';
  if (p1.length < 8) return 'Password must be at least 8 characters long';
  if (p1 !== p2) return 'Passwords do not match';
}
