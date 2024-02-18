import { platform, networkInterfaces, NetworkInterfaceInfo } from 'os';
import type { Duplex } from 'stream';
export function isEmptyObject(obj: any) {
  return (
    obj &&
    Object.keys(obj).length === 0 &&
    Object.getPrototypeOf(obj) === Object.prototype
  );
}

export function getOsShell() {
  return platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
}

export function closeSocketWithError(socket: Duplex, content: string) {
  socket.write('HTTP/1.1 400 Bad Request\r\n');
  socket.write('Content-Type: text/plain\r\n');
  socket.write(`Content-Length: ${Buffer.byteLength(content)}\r\n`);
  socket.write('\r\n');
  socket.write(content);
  socket.destroy();
}

/**
 * Converts a given string, null or undefined value into a number.
 * Null, undefined and invalid strings are converted to the default value.
 */
export function toNumber(value: string | null | undefined, defaultValue = 0) {
  let result = +(value ?? defaultValue);
  if (Number.isNaN(result)) return defaultValue;
  return result;
}

export function getIpAddresses(
  filter: (nii: NetworkInterfaceInfo) => boolean = (nii) => !nii.internal
) {
  const interfaces = networkInterfaces();
  const addresses: string[] = [];
  for (const nic of Object.values(interfaces)) {
    if (!nic) continue;
    for (const cfg of nic) if (filter(cfg)) addresses.push(cfg.address);
  }
  return addresses;
}
