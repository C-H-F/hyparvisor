import { inferAsyncReturnType } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';

export async function createContext({ req }: CreateNextContextOptions) {
  async function getSessionFromHeader() {
    const auth = req?.headers?.authorization;
    if (typeof auth === 'string') {
      const index = auth.indexOf(' ');
      return auth.substring(index + 1);
    }
    return null;
  }
  const session = await getSessionFromHeader();
  return {
    session,
  };
}
export type Context = inferAsyncReturnType<typeof createContext>;
