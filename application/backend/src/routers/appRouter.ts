import { trpc } from '../trpc.js';
import { userRouter } from './userRouter.js';
import { demoRouter } from './demoRouter.js';
import { fileRouter } from './fileRouter.js';
import { vmRouter } from './vmRouter.js';
import { systemRouter } from './systemRouter.js';
export const appRouter = trpc.router({
  demo: demoRouter,
  user: userRouter,
  file: fileRouter,
  vm: vmRouter,
  system: systemRouter,
});
export type AppRouter = typeof appRouter;
