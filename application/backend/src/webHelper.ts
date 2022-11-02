import type { Server as WebServer } from 'http';
import type { WebSocket, MessageEvent, ErrorEvent } from 'ws';
export function httpListen(
  webServer: WebServer,
  ...args: Parameters<typeof webServer.listen>
): Promise<void> {
  return new Promise<void>((res, rej) => {
    webServer.on('listening', () => {
      webServer.removeListener('error', rej);
      res();
    });
    webServer.on('error', rej);
    webServer.listen(...args);
  });
}

export async function wsReceiveMessage(ws: WebSocket): Promise<string> {
  return new Promise<string>((res, rej) => {
    const listener = (evt: MessageEvent) => {
      const result = evt.data.toString('utf-8');
      ws.removeEventListener('message', listener);
      ws.removeEventListener('error', errorListener);
      res(result);
    };
    const errorListener = (error: ErrorEvent) => {
      ws.removeEventListener('message', listener);
      ws.removeEventListener('error', errorListener);
      rej(error.error);
    };
    ws.addEventListener('error', errorListener);
    ws.addEventListener('message', listener);
  });
}
