import { useState } from 'react';
import { User, Lock, AlarmClockIcon, KeyRoundIcon } from 'lucide-react';
import { Button } from '@/components/shadcn/ui/button';
import { Card } from '@/components/shadcn/ui/card';
import { Label } from '@/components/shadcn/ui/label';
import { Input } from '@/components/shadcn/ui/input';
import { Alert } from '@/components/shadcn/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/ui/tooltip';

import { sha512 } from '@/lib/crypto';
import { useSession } from '@/context/appContext';
import { client } from '@/trpc-client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const [renewalRequired, setRenewalRequired] = useState(false);
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  //new Password

  const { setSessionToken } = useSession();

  async function changePasswordAndLogin() {
    if (password == newPassword1) {
      setMessage('New password has to be different!');
      return;
    }
    if (newPassword1.length <= 0) {
      setMessage('Password required!');
      return;
    }
    if (newPassword1 != newPassword2) {
      setMessage('Passwords do not match!');
      return;
    }
    const agent = navigator.userAgent;
    const passwordHash = await sha512(email + ':' + password);
    const newPasswordHash = await sha512(email + ':' + newPassword1);
    try {
      const token = await client.user.login.mutate({
        email,
        password: passwordHash,
        newPassword: newPasswordHash,
        agent,
      });
      setMessage('');
      setSessionToken(token);
    } catch (ex) {
      setRenewalRequired(false);
    }
  }
  async function login() {
    const agent = navigator.userAgent;
    const passwordHash = await sha512(email + ':' + password);
    try {
      const token = await client.user.login.mutate({
        email,
        password: passwordHash,
        agent,
      });
      setMessage('');
      setSessionToken(token);
    } catch (err) {
      const no = (err as any).shape.data.httpStatus;
      const ms = (err as any).shape.message;
      console.log(no, ms, (err as any).shape);
      // if (err instanceof TRPCError) {
      // const statusCode = getHTTPStatusCodeFromError(err);
      if (no == 409) {
        //CONFLICT
        //Require a new password.
        setRenewalRequired(true);
      } else setMessage(ms);
    }
  }
  return (
    <>
      <div className="absolute left-0 top-0 flex h-screen w-screen items-center">
        <Card className="relative m-auto w-fit overflow-hidden">
          <div className="absolute -left-28 -top-6 z-0 opacity-5">
            <AlarmClockIcon
              className="h-64 w-64 opacity-40"
              style={{ display: renewalRequired ? '' : 'none' }}
            />
            <KeyRoundIcon
              className="ml-24 h-52 w-52 opacity-40"
              style={{ display: renewalRequired ? 'none' : '' }}
            />
          </div>

          <form
            hidden={!renewalRequired}
            onSubmit={preventDefault}
            style={{ display: renewalRequired ? '' : 'none' }}
            className="relative z-10 m-5"
          >
            <h2 className="mb-2 text-lg">Password expired!</h2>
            <p className="py-3 text-sm">
              The password provided has to be changed. <br />
              Please provide a new password.
            </p>
            <Input
              className="my-3"
              id="txtNewPassword1"
              value={newPassword1}
              type="password"
              placeholder="New Password"
              onChange={(e) => setNewPassword1(e.target.value)}
            />
            <Input
              id="txtNewPassword2"
              value={newPassword2}
              type="password"
              placeholder="Repeat New Password"
              onChange={(e) => setNewPassword2(e.target.value)}
            />
            <div className="my-8 flex justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setNewPassword1('');
                  setNewPassword2('');
                  setEmail('');
                  setPassword('');
                  setRenewalRequired(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" onClick={() => changePasswordAndLogin()}>
                Change and Login
              </Button>
            </div>
          </form>
          <form
            hidden={renewalRequired}
            onSubmit={(e) => e.preventDefault()}
            className="grid-cols-[auto, auto] relative z-10 m-5 grid gap-5"
            style={{ display: renewalRequired ? 'none' : '' }}
          >
            <Label htmlFor="txtUsername" className="w-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <User />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>E-Mail</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="txtUsername"
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className=""
            />
            <Label htmlFor="txtPassword" className="w-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Password</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="txtPassword"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className=""
            />
            <Button onClick={() => login()} className="col-start-2">
              Login
            </Button>
          </form>
          {message == '' ? (
            ''
          ) : (
            <div className="m-5">
              <Alert className="text-sm" variant="destructive">
                {message}
              </Alert>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function preventDefault(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
}
