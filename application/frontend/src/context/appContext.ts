import { setSessionToken as setTrpcSessionToken } from '@/trpc-client';
import { create } from 'zustand';

export type SessionStore = {
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;
};

const sessionToken = localStorage.getItem('sessionToken');
setTrpcSessionToken(sessionToken);
export const useSession = create<SessionStore>()((set) => ({
  sessionToken,
  setSessionToken: (token) => {
    if (token === null) localStorage.removeItem('sessionToken');
    else localStorage.setItem('sessionToken', token);
    set(() => {
      setTrpcSessionToken(token);
      return { sessionToken: token };
    });
  },
}));
