import { Client } from 'ssh2';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server as WebServer } from 'http';
import { AddressInfo } from 'net';
import { httpListen, wsReceiveMessage } from './webHelper';
import type { Config } from './Config';

(async () => {
  type ConnectionMode = 'shell' | 'exec' | '';
  const config: Partial<Config> = {
    httpPort: 8080,
    verbose: true,
  };

  const websocketServer = new WebSocketServer({ noServer: true });
  const webServer = new WebServer((req, res) => {
    res.statusCode = 404;
    res.write('404 Not Found!');
    res.end();
  });

  webServer.on('upgrade', (req, sock, head) => {
    websocketServer.handleUpgrade(req, sock, head, async (websocket) => {
      if (websocket.protocol === 'ssh') {
        await provideSSH(websocket);
      } else {
        console.log('Invalid Protocol', websocket.protocol);
        websocket.close();
      }
    });
  });
  webServer.on('error', (err) => console.log);

  while (true) {
    await httpListen(webServer, 8080);

    if (config.verbose)
      console.log(
        'Listening to port:',
        (webServer.address() as AddressInfo).port
      );

    await new Promise((res) => webServer.on('close', res));
  }

  async function provideSSH(webSocket: WebSocket) {
    try {
      const connectionData = JSON.parse(await wsReceiveMessage(webSocket));
      const mode = (connectionData.mode ?? '') as ConnectionMode;
      delete connectionData.mode;
      const conn = new Client();
      conn.on('ready', () => {
        if (mode === 'shell') {
          conn.shell((err, stream) => {
            if (err) throw err;
            stream.on('close', () => {
              conn.end();
            });
            stream.on('data', (data: Buffer) => {
              webSocket.send(data.toString('utf-8'));
            });
            webSocket.on('message', (data) => {
              stream.write(data.toString('utf-8'));
            });
            webSocket.on('close', () => {
              stream.close();
            });
          });
        } else if (mode === 'exec') {
          const messageListener = (data: RawData) => {
            webSocket.removeListener('message', messageListener);
            conn.exec(data.toString('utf-8'), (err, stream) => {
              if (err) {
                webSocket.send(
                  JSON.stringify({ status: 'error', message: 'err' })
                );
                websocketServer.close();
                return;
              }
              stream.on('data', (data: Buffer) => {
                webSocket.send(
                  JSON.stringify({
                    source: 'stdout',
                    data: data.toString('utf-8'),
                  })
                );
              });
              stream.stderr.on('data', (data: Buffer) => {
                webSocket.send(
                  JSON.stringify({
                    source: 'stdout',
                    data: data.toString('utf-8'),
                  })
                );
              });
              webSocket.addListener('message', (data: Buffer) => {
                stream.stdin.write(data.toString('utf-8'));
              });
              stream.on('close', () => {
                webSocket.close();
              });
            });
          };
          webSocket.on('message', messageListener);
          webSocket.send('ready\n');
        } else {
          webSocket.send(
            JSON.stringify({ kind: 'exception', error: 'Invalid Mode' })
          );
          webSocket.close();
        }
      });
      conn.connect(connectionData);
      conn.addListener('error', (exc) => {
        webSocket.send(JSON.stringify({ kind: 'exception', error: exc }));
      });
    } catch (exc) {
      webSocket.send(JSON.stringify({ kind: 'exception', error: exc }));
      webSocket.close();
    }
  }

  console.log('This should not happen');
})();
