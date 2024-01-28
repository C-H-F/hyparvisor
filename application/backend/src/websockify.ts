import { nanoid } from 'nanoid';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { WebSocket, WebSocketServer } from 'ws';
import { closeSocketWithError } from './utils.js';
const execAsync = promisify(exec);

export function createWebsockifyWrapper(args: { rootPath: string }) {
  const rootPath = args.rootPath;
  const websocketServer = new WebSocketServer({ noServer: true });
  return {
    handleUpgrade: async function (
      request: Parameters<typeof websocketServer.handleUpgrade>[0],
      socket: Parameters<typeof websocketServer.handleUpgrade>[1],
      head: Parameters<typeof websocketServer.handleUpgrade>[2]
    ) {
      //TODO: Check if user is valid and has permission. Close if not.
      // try {
      //   const sessionId = request.headers['authorization'];
      //   await fetchUserFromSession(sessionId);
      // } catch {
      //   closeSocketWithError(socket, 'Invalid session.');
      //   return;
      // }

      if (!request.url?.startsWith(rootPath)) {
        socket.destroy({
          message: 'Invalid path.',
          name:
            'Invalid path "' +
            request.url +
            '". Should start with "' +
            rootPath +
            '".',
        });
        return;
      }
      const serverPort = +request.url?.substring(rootPath.length);
      if (isNaN(serverPort) || serverPort < 1 || serverPort > 65535) {
        closeSocketWithError(
          socket,
          'Invalid path "' + request.url + '". No server port provided.'
        );
        return;
      }
      const containername = 'hyparvisor.websockify.' + nanoid();
      const dockerProcess = exec(
        `docker run --name ${JSON.stringify(
          containername
        )} --env HOST=${JSON.stringify(
          '172.17.0.1' //This is the docker host IP in the default network configuration. TODO: Determine the correct IP dynamically.
        )} --rm -p 127.0.0.1:0:80 --entrypoint sh jwnmulder/websockify -c 'python -m websockify 80 $HOST:${+serverPort}'`,
        { encoding: 'utf8' }
      );

      let websockifyPort = 0;
      let reason = '';
      while (true) {
        if (dockerProcess.exitCode !== null) break;
        //Wait for the container to download and start.
        try {
          const { stdout } = await execAsync(
            `docker ps --format "{{.Ports}}" --filter ${JSON.stringify(
              'name=' + containername
            )}`
          );
          const ans = /(127\.0\.0\.1|0\.0\.0\.0):(\d+)->80\/tcp/g.exec(stdout);
          if (!ans) {
            await new Promise((cb) => setTimeout(cb, 1000));
            continue;
          }
          websockifyPort = +ans[2];
        } catch (err) {
          reason = err + '';
        }
        break;
      }
      if (websockifyPort === 0) {
        closeSocketWithError(
          socket,
          'Could not establish a connection to the websockify container. ' +
            reason
        );
        return;
      }

      console.log(`Forwarding to port ${serverPort} through ${websockifyPort}`);
      websocketServer.handleUpgrade(
        request,
        socket,
        head,
        async function (wsClient) {
          const websockify = new WebSocket('ws://localhost:' + websockifyPort);

          await new Promise((cb) => {
            websockify.onopen = cb;
            websockify.onerror = cb;
            websockify.onclose = cb;
          });
          if (websockify.readyState !== WebSocket.OPEN) {
            closeSocketWithError(
              socket,
              'Could not open connection to websockify.'
            );
            return;
          }
          websockify.onmessage = (msg) => {
            wsClient.send(msg.data);
          };
          wsClient.onmessage = (msg) => {
            websockify.send(msg.data);
          };
          websockify.onclose = () => {
            wsClient.close();
          };
          wsClient.on('close', () => {
            websockify.close();
            dockerProcess.kill();
          });
        }
      );
    },
  };
}
