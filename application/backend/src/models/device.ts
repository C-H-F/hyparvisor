import { z } from 'zod';
import { diskDevice, diskToXml } from './disk.js';
import { graphicsDevice, graphicsToXml } from './graphics.js';
import { isEmptyObject } from '../utils.js';
import { interfaceDevice, interfaceToXml } from './interface.js';

const unknownDevice = z.object({
  deviceType: z.literal('unknownDevice'),
});

export const device = z.union([
  diskDevice,
  unknownDevice,
  graphicsDevice,
  interfaceDevice,
]); //TODO
export type Device = z.infer<typeof device>;

// export function deviceFromXml(mutXmlData: any): Device {
//   if (mutXmlData['@device'] == 'cdrom' || mutXmlData['@device'] == 'disk') {
//     const result = diskFromXml(mutXmlData);
//     delete mutXmlData['@device'];
//     return result;
//   }
//   return { deviceType: 'unknownDevice' };
// }
// export function deviceToXml(mutDevice: Device) {
//   if (mutDevice.deviceType === 'disk') return diskToXml(mutDevice);
//   if (mutDevice.deviceType === 'graphics') return graphicsToXml(mutDevice);
//   return null;
// }

export function devicesFromXml<T>(
  mutXmlData: unknown,
  deviceFromXml: (x: unknown) => T
): T[] {
  const devices = [] as T[];
  if (!mutXmlData) return devices;
  if (typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  if (Array.isArray(mutXmlData))
    for (let i = 0; i < mutXmlData?.length ?? 0; i++)
      devices.push(deviceFromXml(mutXmlData[i]));
  else devices.push(deviceFromXml(mutXmlData));
  return devices;
}

export function pushDevicesFromXml<T extends Device>(
  devices: Device[],
  mutXmlData: unknown,
  key: string,
  deviceFromXml: (x: unknown) => T
) {
  if (!mutXmlData) return;
  if (typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  const xmlData = mutXmlData as Record<string, unknown>;
  devices.push(...devicesFromXml(xmlData[key], deviceFromXml));
  if (Array.isArray(xmlData[key] as unknown)) {
    const arr = xmlData[key] as unknown[];
    let allEmpty = true;
    for (let i = 0; i < arr.length ?? 0; i++)
      if (!isEmptyObject(arr[i])) {
        allEmpty = false;
        break;
      }
    if (allEmpty) delete xmlData[key];
  } else if (isEmptyObject(xmlData[key])) delete xmlData[key];
}
function pushValueToXml(xml: unknown, key: string, value: unknown) {
  if (!xml || typeof xml !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(xml));
  let arr = [] as unknown[];
  if (!(key in xml)) (xml as any)[key] = arr;
  else if (Array.isArray((xml as any)[key])) arr = (xml as any)[key];
  else {
    arr.push((xml as any)[key]);
    (xml as any)[key] = arr;
  }
  arr.push(value);
}
export function pushDevicesToXml(devices: Partial<Device>[], result: unknown) {
  //TODO: Generate XML for device
  if (!result || typeof result !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(result));
  let xmlDevices = {};
  if (
    'devices' in result &&
    result['devices'] &&
    typeof result['devices'] === 'object'
  )
    xmlDevices = result['devices'];
  else (result as any)['devices'] = xmlDevices;

  for (const device of devices) {
    if (device.deviceType === 'disk') {
      const diskXml = diskToXml(device);
      pushValueToXml(xmlDevices, 'disk', diskXml);
      console.log('DiskXml', diskXml);
    }
    if (device.deviceType === 'graphics') {
      const graphicsXml = graphicsToXml(device);
      pushValueToXml(xmlDevices, 'graphics', graphicsXml);
    }
    if (device.deviceType === 'interface') {
      const interfaceXml = interfaceToXml(device);
      pushValueToXml(xmlDevices, 'interface', interfaceXml);
    }
  }
}
