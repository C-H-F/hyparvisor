import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/appRouter.js';
import { createOpenApiExpressMiddleware } from 'trpc-openapi';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi.js';
import { createContext } from './context.js';
import { createWebsocketShell } from './wsShell.js';
import { setWebSocketShellRequestTokenFunction } from './routers/systemRouter.js';
import { createWebsockifyWrapper } from './websockify.js';
import path from 'path';
import { parseArgs } from 'node:util';
import { getIpAddresses, toNumber } from './utils.js';
export type AppRouter = typeof appRouter;

const parsedArguments = parseArgs({
  args: process.argv,
  options: { port: { type: 'string', short: 'p' }, htdocs: { type: 'string' } },
  allowPositionals: true,
});

const port = toNumber(parsedArguments.values.port, 80);
const htdocs = parsedArguments.values.htdocs ?? './htdocs';
const location = '/api';
const app = express();
const trpcExpressOptions: Parameters<typeof createExpressMiddleware>[0] = {
  router: appRouter,
  createContext,
};

app.use(location + '/trpc', createExpressMiddleware(trpcExpressOptions));
app.use(
  location + '/rest',
  createOpenApiExpressMiddleware(trpcExpressOptions as any)
);
app.use(location, swaggerUi.serve);
app.get(location, swaggerUi.setup(openApiDocument));

//Host static files from _htdocs
app.use(express.static(htdocs));
app.use(function (_req, res, _next) {
  res.sendFile(path.join(htdocs, 'index.html'), { root: '.' });
});

const server = app.listen(port);

const websockifyWrapper = createWebsockifyWrapper({
  rootPath: '/websockify/',
});

const websocketShell = createWebsocketShell('/api/shell');
setWebSocketShellRequestTokenFunction(websocketShell.requestAccess); //TODO: Change to a better solution when there is time.
server.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/websockify/')) {
    websockifyWrapper.handleUpgrade(request, socket, head);
    return;
  }

  if (request.url?.startsWith('/api/shell/')) {
    websocketShell.handleUpgrade(request, socket, head);
    return;
  }
});

console.log('Hyparvisor running at:');
for (const ip of getIpAddresses()) {
  console.log(
    `  - http://${ip.indexOf(':') >= 0 ? '[' + ip + ']' : ip}:${port}/`
  );
}
