import { z } from 'zod';
import {
  networkInterfaceDevice,
  networkInterfaceFromXml,
  networkInterfaceToXml,
} from './networkInterface.js';

const unknownInterfaceDevice = z.object({
  deviceType: z.literal('interface'),
  interfaceType: z.literal('unknown'),
});

export const interfaceDevice = z.union([
  unknownInterfaceDevice,
  networkInterfaceDevice,
]);
export type InterfaceDevice = z.infer<typeof interfaceDevice>;

export function interfaceFromXml(mutXmlData: unknown): InterfaceDevice {
  if (!mutXmlData || typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  if ('@type' in mutXmlData && mutXmlData['@type'] === 'network')
    return networkInterfaceFromXml(mutXmlData);
  return {
    deviceType: 'interface',
    interfaceType: 'unknown',
  };
}

export function interfaceToXml(device: Partial<InterfaceDevice>) {
  if (device.interfaceType === 'network') return networkInterfaceToXml(device);
  return {};
}
