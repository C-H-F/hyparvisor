import { trpc } from '../trpc.js';
import { z } from 'zod';
export const demoRouter = trpc.router({
  demo1: trpc.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/demo/demo1',
        tags: ['demo'],
        summary: 'A simple query procedure for dummy code.',
      },
    })
    .input(z.void())
    .output(z.literal('It works!'))
    .query(function (_) {
      return 'It works!' as const;
    }),
  demo2: trpc.procedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/demo/demo2',
        tags: ['demo'],
        summary: 'A simple mutation procedure for dummy code.',
      },
    })
    .input(z.object({ input: z.any() }))
    .output(z.boolean())
    .mutation(function (req) {
      console.log('Demo2', req.input);
      return true;
    }),
});
export type DemoRouter = typeof demoRouter;
