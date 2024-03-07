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
 * Converts a given string, null or undefined value into a number or a given default value.
 * Null, undefined, NaN and invalid strings are converted to the default value.
 */
export function toNumber<T = number>(
  value: string | null | undefined,
  defaultValue: T | number = 0
): number | T {
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

/**
 * A map function (like Array.map) for objects.
 * Calls a defined callback function on each value of an object, and returns a new object with key and value returned for every entry.
 * @param obj Object to remap
 * @param callbackfn A function that accepts two arguments.
 *   The map method calls the callbackfn function one time for each element in the object.
 * @returns A new object with the remapped keys and values.
 */
export function mapObject<
  KI extends string | number | symbol,
  VI,
  KO extends string | number | symbol,
  VO
>(
  obj: Record<KI, VI>,
  callbackfn: (key: KI, value: VI) => [key: KO, value: VO]
) {
  const result: Record<KO, VO> = {} as any;
  for (const key in obj) {
    const [newKey, value] = callbackfn(key, obj[key]);
    result[newKey] = value;
  }
  return result;
}

/**
 * A map function (like Array.map) for object values.
 * Calls a defined callback function on each value of an object, and returns a new object that contains the new values.
 * @param obj Object to remap.
 * @param callbackfn A function that accepts two arguments.
 *   The map method calls the callbackfn function one time for each element in the object.
 * @returns A new object with the remapped values.
 */
export function mapObjectValues<K extends string | number | symbol, V, VO>(
  obj: Record<K, V>,
  callbackfn: (value: V, key: K) => VO
) {
  return mapObject(obj, (key, value) => [key, callbackfn(value, key)]);
}
