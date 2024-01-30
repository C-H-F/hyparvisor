import { z } from 'zod';
import { address, addressFromXml, addressToXml } from './address.js';
import { isEmptyObject } from '../utils.js';

export const inputDevice = z.object({
  deviceType: z.literal('input'),
  inputDevice: z.union([
    z.literal('mouse'),
    z.literal('keyboard'),
    z.literal('tablet'),
    z.literal('passthrough'),
    z.literal('evdev'),
    z.literal('unknown'),
  ]),
  bus: z
    .union([z.literal('usb'), z.literal('ps2'), z.literal('virtio')])
    .optional(),
  address: address.optional(),
  alias: z.string().optional(),
});

export type InputDevice = z.infer<typeof inputDevice>;

export function inputFromXml(mutXmlData: unknown): InputDevice {
  if (!mutXmlData || typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  const result: InputDevice = {
    deviceType: 'input',
    inputDevice: 'unknown',
  };
  type: if ('@type' in mutXmlData) {
    if (mutXmlData['@type'] === 'mouse') {
      result.inputDevice = 'mouse';
    } else if (mutXmlData['@type'] === 'keyboard') {
      result.inputDevice = 'keyboard';
    } else if (mutXmlData['@type'] === 'tablet') {
      result.inputDevice = 'tablet';
    } else if (mutXmlData['@type'] === 'passthrough') {
      result.inputDevice = 'passthrough';
    } else if (mutXmlData['@type'] === 'evdev') {
      result.inputDevice = 'evdev';
    } else break type;
    delete mutXmlData['@type'];
  }
  bus: if ('@bus' in mutXmlData) {
    if (mutXmlData['@bus'] === 'usb') {
      result.bus = 'usb';
    } else if (mutXmlData['@bus'] === 'ps2') {
      result.bus = 'ps2';
    } else if (mutXmlData['@bus'] === 'virtio') {
      result.bus = 'virtio';
    } else break bus;
    delete mutXmlData['@bus'];
  }
  if ('address' in mutXmlData) {
    result.address = addressFromXml(mutXmlData['address']);
    if (isEmptyObject(mutXmlData.address)) delete mutXmlData.address;
  }
  if (
    'alias' in mutXmlData &&
    typeof mutXmlData.alias === 'object' &&
    mutXmlData.alias
  ) {
    if ('@name' in mutXmlData.alias) {
      result.alias = mutXmlData.alias['@name'] + '';
      delete mutXmlData.alias['@name'];
    }
    if (isEmptyObject(mutXmlData.alias)) delete mutXmlData.alias;
  }
  return result;
}

export function inputToXml(input: Partial<InputDevice>) {
  const result: any = {};
  result['@type'] = input.inputDevice ?? 'unknown';
  if (input.bus) result['@bus'] = input.bus ?? 'usb';
  if (input.address) result.address = addressToXml(input.address);
  if (input.alias) {
    result.alias = { '@name': input.alias };
  }
  return result;
}
