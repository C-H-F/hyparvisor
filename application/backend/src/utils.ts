import os from 'os';
import internal from 'stream';
export function isEmptyObject(obj: any) {
  return (
    obj &&
    Object.keys(obj).length === 0 &&
    Object.getPrototypeOf(obj) === Object.prototype
  );
}

export function getOsShell() {
  return os.platform() === 'win32' ? 'powershell.exe' : 'bash';
}

export function closeSocketWithError(socket: internal.Duplex, content: string) {
  socket.write('HTTP/1.1 400 Bad Request\r\n');
  socket.write('Content-Type: text/plain\r\n');
  socket.write(`Content-Length: ${Buffer.byteLength(content)}\r\n`);
  socket.write('\r\n');
  socket.write(content);
  socket.destroy();
}
