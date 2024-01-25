import { z } from 'zod';
import { diskDevice, diskFromXml, diskToXml } from './disk.js';
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

export function pushDevicesFromXml<T>(
  devices: Device[],
  mutXmlData: unknown,
  key: string,
  deviceFromXml: (x: unknown) => T
) {
  if (!mutXmlData) return;
  if (typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  devices.push(...devicesFromXml(mutXmlData[key], deviceFromXml));
  if (Array.isArray(mutXmlData[key])) {
    let allEmpty = true;
    for (let i = 0; i < mutXmlData[key].length ?? 0; i++)
      if (!isEmptyObject(mutXmlData[key][i])) {
        allEmpty = false;
        break;
      }
    if (allEmpty) delete mutXmlData[key];
  } else if (isEmptyObject(mutXmlData[key])) delete mutXmlData[key];
}
function pushValueToXml(xml: unknown, key: string, value: unknown) {
  if (typeof xml !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(xml));
  let arr = [];
  if (!(key in xml)) xml[key] = arr;
  else if (Array.isArray(xml[key])) arr = xml[key];
  else {
    arr.push(xml[key]);
    xml[key] = arr;
  }
  arr.push(value);
}
export function pushDevicesToXml(devices: Device[], result: unknown) {
  //TODO: Generate XML for device
  let xmlDevices = {};
  if (result['devices'] && typeof result['devices'] === 'object')
    xmlDevices = result['devices'];
  else result['devices'] = xmlDevices;

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
