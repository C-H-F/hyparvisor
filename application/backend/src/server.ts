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
export type AppRouter = typeof appRouter;

const location = '/api';
const port = 3000;
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
app.use(express.static(path.join(__dirname, '..', '_htdocs')));
app.use(function (_req, res, _next) {
  res.sendFile(path.join(__dirname, '..', '_htdocs', 'index.html'));
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
console.log('Running at http://localhost:' + port + location);
