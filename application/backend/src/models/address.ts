import { z } from 'zod';

export const pciAddress = z.object({
  type: z.literal('pci'),
  bus: z.number(),
  slot: z.number(),
  function: z.number(),
  domain: z.number().optional(),
  multifunction: z.boolean().optional(), //'on' | 'off'
});
export const driveAddress = z.object({
  type: z.literal('drive'),
  controller: z.number(),
  bus: z.number(),
  target: z.number(),
  unit: z.number(),
});
export const usbAddress = z.object({
  type: z.literal('usb'),
  bus: z.number(),
  port: z.number(),
});
//export const address = pciAddress.or(driveAddress);
export const address = z.union([
  pciAddress.partial(),
  driveAddress.partial(),
  usbAddress.partial(),
]);
export type Address = z.infer<typeof address>;

export function addressFromXml(mutXmlData: unknown) {
  if (!mutXmlData || typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  const result: Partial<Address> = {};
  if ('@type' in mutXmlData) {
    const ans = mutXmlData['@type'] as typeof result.type;
    result.type = ans;
    delete mutXmlData['@type'];
    if (result.type == 'pci') {
      if ('@bus' in mutXmlData) {
        result.bus = +(mutXmlData['@bus'] as any);
        delete mutXmlData['@bus'];
      }
      if ('@slot' in mutXmlData) {
        result.slot = +(mutXmlData['@slot'] as any);
        delete mutXmlData['@slot'];
      }
      if ('@function' in mutXmlData) {
        result.function = +(mutXmlData['@function'] as any);
        delete mutXmlData['@function'];
      }
      if ('@domain' in mutXmlData) {
        result.domain = +(mutXmlData['@domain'] as any);
        delete mutXmlData['@domain'];
      }
      if ('@multifunction' in mutXmlData) {
        result.multifunction = mutXmlData['@multifunction'] === 'on';
        delete mutXmlData['@multifunction'];
      }
    }
    if (result.type == 'drive') {
      if ('@controller' in mutXmlData) {
        result.controller = +(mutXmlData['@controller'] as any);
        delete mutXmlData['@controller'];
      }
      if ('@bus' in mutXmlData) {
        result.bus = +(mutXmlData['@bus'] as any);
        delete mutXmlData['@bus'];
      }
      if ('@target' in mutXmlData) {
        result.target = +(mutXmlData['@target'] as any);
        delete mutXmlData['@target'];
      }
      if ('@unit' in mutXmlData) {
        result.unit = +(mutXmlData['@unit'] as any);
        delete mutXmlData['@unit'];
      }
    }
    if (result.type == 'usb') {
      if ('@bus' in mutXmlData) {
        result.bus = +(mutXmlData['@bus'] as any);
        delete mutXmlData['@bus'];
      }
      if ('@port' in mutXmlData) {
        result.port = +(mutXmlData['@port'] as any);
        delete mutXmlData['@port'];
      }
    }
  }
  return result;
}
export function addressToXml(address: Address, mutXmlData: any = null) {
  if (!mutXmlData || typeof mutXmlData !== 'object') mutXmlData = {};
  if (address.type === 'pci') {
    if (address.type) mutXmlData['@type'] = address.type;
    if (address.bus) mutXmlData['@bus'] = address.bus;
    if (address.slot) mutXmlData['@slot'] = address.slot;
    if (address.function) mutXmlData['@function'] = address.function;
    if (address.domain) mutXmlData['@domain'] = address.domain;
    if (address.multifunction)
      mutXmlData['@multifunction'] = address.multifunction ? 'on' : 'off';
  } else if (address.type === 'drive') {
    if (address.type) mutXmlData['@type'] = address.type;
    if (address.controller) mutXmlData['@controller'] = address.controller;
    if (address.bus) mutXmlData['@bus'] = address.bus;
    if (address.target) mutXmlData['@target'] = address.target;
    if (address.unit) mutXmlData['@unit'] = address.unit;
  } else if (address.type === 'usb') {
    if (address.type) mutXmlData['@type'] = address.type;
    if (address.bus) mutXmlData['@bus'] = address.bus;
    if (address.port) mutXmlData['@port'] = address.port;
  }
  return mutXmlData;
}
