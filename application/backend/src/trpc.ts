import { initTRPC } from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';
import { Context } from './context.js';

export const trpc = initTRPC.meta<OpenApiMeta>().context<Context>().create();
