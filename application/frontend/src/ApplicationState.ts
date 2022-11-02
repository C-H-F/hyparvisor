import {
  createContext,
} from '@builder.io/qwik';

export type ApplicationContext = {
  user: string | null;
  updateAvailable: boolean;
  vms:  {name: string}[];
};
export const applicationContext = createContext<ApplicationContext>('application-context');
