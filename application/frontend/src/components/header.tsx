import { useSession } from '@/context/appContext';
import { client } from '@/trpc-client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/shadcn/ui/button';
import { CalendarDays, Clock, Mail, User } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from './shadcn/ui/hover-card';
import { Avatar, AvatarFallback } from './shadcn/ui/avatar';

export default function Header() {
  //TODO: Replace placeholders!
  const { setSessionToken } = useSession();
  const [username, setUsername] = useState('');

  useEffect(() => {
    (async () => {
      const username = await client.user.getName.query();
      if (username === null) setSessionToken(null);
      else setUsername(username);
    })();
  }, []);

  const logout = () => {
    try {
      client.user.logout.mutate();
    } catch {}
    setSessionToken(null);
  };
  return (
    <header className="mb-5 flex h-24 flex-row-reverse items-center p-2">
      <img
        src="/hyparvisor.svg"
        alt="Hyparvisor"
        className="ml-3 mr-5 h-16 w-16"
      />

      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="link">
            <Avatar>
              <AvatarFallback className="bg-yellow-500 text-black">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="m-5 w-72">
          <h2>{username}</h2>
          <p className="text-sm">Administrator</p>
          <div className="m-2 mb-3">
            <p className="text-sm">
              <Clock className="inline-block h-4 w-4" /> Session expires in ?
              minutes.
            </p>
            <p className="text-sm">
              <CalendarDays className="inline-block h-4 w-4" /> Last login: ?
              days ago.
            </p>
          </div>
          <Button className="right-0" onClick={() => logout()}>
            Logout
          </Button>
        </HoverCardContent>
      </HoverCard>

      <HoverCard>
        <HoverCardTrigger>
          <Button variant="link">
            <Mail className="h-8 w-8 dark:text-gray-300" />
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="m-5">
          There are no messages available.
        </HoverCardContent>
      </HoverCard>
    </header>
  );
}
