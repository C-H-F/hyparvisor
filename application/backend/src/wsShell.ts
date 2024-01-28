//import { spawn } from 'child_process';
import { nanoid } from 'nanoid';
import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import os from 'os';
import { getOsShell } from './utils.js';

export function createWebsocketShell(url: string) {
  const websocketServer = new WebSocketServer({ noServer: true });
  const accessTokens = new Map<string, Date>();
  return {
    requestAccess: function (timeoutMs: number) {
      const token = nanoid(32);
      const now = +new Date();
      accessTokens.set(token, new Date(now + timeoutMs));
      setTimeout(function () {
        const now = new Date();
        const toDelete = [] as string[];
        for (const [token, date] of accessTokens.entries())
          if (date <= now) toDelete.push(token);
        for (const token of toDelete) accessTokens.delete(token);
      }, timeoutMs);
      return token;
    },
    handleUpgrade: function (
      request: Parameters<typeof websocketServer.handleUpgrade>[0],
      socket: Parameters<typeof websocketServer.handleUpgrade>[1],
      head: Parameters<typeof websocketServer.handleUpgrade>[2]
    ) {
      websocketServer.handleUpgrade(
        request,
        socket,
        head,
        function (websocket) {
          const reqUrl = request.url ?? '';
          const prefix = url + '/';
          if (!reqUrl.startsWith(prefix)) {
            //Does not match URL. Do not upgrade.
            websocket.close();
            return;
          }
          const token = reqUrl.substring(prefix.length);
          if (!accessTokens.has(token)) {
            //No valid access token.
            websocket.close();
            return;
          }
          accessTokens.delete(token);

          const shell = getOsShell();
          const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env,
          });
          ptyProcess.onData((data) => websocket.send(data));

          websocket.on('message', (msg) => {
            const pkg = JSON.parse(msg.toString('utf8')) as unknown;
            if (!pkg || typeof pkg !== 'object') return;
            if ('c' in pkg && typeof pkg.c === 'string') {
              ptyProcess.write(pkg.c);
              return;
            }
            if ('type' in pkg && pkg.type === 'resize') {
              let cols = ptyProcess.cols;
              let rows = ptyProcess.rows;
              if ('cols' in pkg) cols = +(pkg.cols as any);
              if ('rows' in pkg) rows = +(pkg.rows as any);
              try {
                ptyProcess.resize(cols, rows);
              } catch (ex) {
                console.error('Could not resize PTY: ', ex);
                ptyProcess.kill();
              }
            }
          });

          const closeShell = function () {
            ptyProcess.kill();
          };
          websocket.on('close', closeShell);
          websocket.on('error', closeShell);
        }
      );
    },
  };
}
