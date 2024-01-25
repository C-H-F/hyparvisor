import { useState } from 'react';
import { User, Lock } from 'lucide-react';
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

      // } else {
      //   console.warn('Something else ');
      // }
    }
  }
  return (
    <>
      <div className="absolute left-0 top-0 flex h-screen w-screen items-center">
        <Card className="m-auto w-fit">
          <form hidden={!renewalRequired} onSubmit={preventDefault}>
            <h2>Password expired</h2>
            <p>
              The password provided has to be changed. Please provide a new
              password.
            </p>
            <Label htmlFor="txtNewPassword1">New Password</Label>
            <Input
              id="txtNewPassword1"
              value={newPassword1}
              onChange={(e) => setNewPassword1(e.target.value)}
            />

            <Label htmlFor="txtNewPassword2">Repeat</Label>
            <Input
              id="txtNewPassword2"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
            />
            <Button
              type="button"
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
              Change Password and Login
            </Button>
          </form>

          <form
            hidden={renewalRequired}
            onSubmit={(e) => e.preventDefault()}
            className="grid-cols-[auto, auto] m-5 grid gap-5"
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
          {message == '' ? '' : <Alert>{message}</Alert>}
        </Card>
      </div>
    </>
  );
}

function preventDefault(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
}
