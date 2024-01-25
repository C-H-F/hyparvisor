import {
  TRPCLink,
  createTRPCProxyClient,
  httpBatchLink,
  loggerLink,
} from '@trpc/client';
import { observable } from '@trpc/server/observable';
import { AppRouter } from '../../backend/src/server';
let sessionToken: string | null = null;
export function setSessionToken(token: string | null) {
  sessionToken = token;
}

const endSessionLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if ((err.data?.code ?? '') == 'UNAUTHORIZED') {
            console.log(
              'LOGOUT REQUIRED. TODO: Clear sessionToken from appContext.'
            );
            //TODO: Clear sessionToken from AppContext!
          }
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

const errorCallbacks: ((err: any) => void)[] = [];
export function addErrorCallback(callback: (err: any) => void) {
  errorCallbacks.push(callback);
}
const errorLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          //TODO: Create an error toast...
          console.error('ERROR', JSON.stringify(err));
          for (const callback of errorCallbacks) callback(err);

          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

function getTrpcUrl(): string {
  return window.location.origin + '/api/trpc';
}
export const client = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink(),
    endSessionLink,
    errorLink,
    httpBatchLink({
      url: getTrpcUrl(),
      headers: function () {
        const result = {} as Record<string, string>;
        if (sessionToken) result['authorization'] = sessionToken;
        return result;
      },
    }),
  ],
});
