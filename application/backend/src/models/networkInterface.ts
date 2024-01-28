import { z } from 'zod';
import { isEmptyObject } from '../utils.js';
import {
  addressFromXml,
  addressToXml,
  address as zAddress,
} from './address.js';

export const networkInterfaceDevice = z.object({
  deviceType: z.literal('interface'),
  interfaceType: z.literal('network').optional(),
  macAddress: z.string().optional(),
  sourceNetwork: z.string().optional(),
  sourceBridge: z.string().optional(),
  sourcePortId: z.string().optional(),
  model: z
    .union([
      // 1Gbps
      z.literal('virtio'),
      z.literal('e1000'),
      // 10 / 100Mbps
      z.literal('i82551'),
      z.literal('i82557b'),
      z.literal('i82559er'),
      z.literal('rtl8139'),
      z.literal('pcnet'),
      // 10Mbps
      z.literal('ne2k_isa'),
      z.literal('ne2k_pci'),
    ])
    .optional(),
  targetDev: z.string().optional(),
  targetManaged: z.boolean().optional(),
  alias: z.string().optional(),
  address: zAddress.optional(),
});
export type NetworkInterfaceDevice = z.infer<typeof networkInterfaceDevice>;

export function networkInterfaceFromXml(
  mutXmlData: unknown
): NetworkInterfaceDevice {
  if (!mutXmlData || typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  if (!('@type' in mutXmlData && mutXmlData['@type'] === 'network'))
    throw new Error(
      'Device is probably no network interface:' + JSON.stringify(mutXmlData)
    );
  const result: NetworkInterfaceDevice = {
    deviceType: 'interface',
    interfaceType: 'network',
  };
  delete mutXmlData['@type'];
  if (
    'mac' in mutXmlData &&
    typeof mutXmlData.mac === 'object' &&
    mutXmlData.mac
  ) {
    if ('@address' in mutXmlData.mac) {
      result.macAddress = mutXmlData.mac['@address'] + '';
      delete mutXmlData.mac['@address'];
    }
    if (isEmptyObject(mutXmlData.mac)) delete mutXmlData.mac;
  }
  if (
    'source' in mutXmlData &&
    typeof mutXmlData.source === 'object' &&
    mutXmlData.source
  ) {
    if ('@network' in mutXmlData.source) {
      result.sourceNetwork = mutXmlData.source['@network'] + '';
      delete mutXmlData.source['@network'];
    }
    if ('@bridge' in mutXmlData.source) {
      result.sourceBridge = mutXmlData.source['@bridge'] + '';
      delete mutXmlData.source['@bridge'];
    }
    if ('@portid' in mutXmlData.source) {
      result.sourcePortId = mutXmlData.source['@portid'] + '';
      delete mutXmlData.source['@portid'];
    }
    if (isEmptyObject(mutXmlData.source)) delete mutXmlData.source;
  }
  if (
    'target' in mutXmlData &&
    typeof mutXmlData.target === 'object' &&
    mutXmlData.target
  ) {
    if ('@dev' in mutXmlData.target) {
      result.targetDev = mutXmlData.target['@dev'] + '';
      delete mutXmlData.target['@dev'];
    }
    if ('@managed' in mutXmlData.target) {
      result.targetManaged = mutXmlData.target['@managed'] === 'yes';
      delete mutXmlData.target['@managed'];
    }
    if (isEmptyObject(mutXmlData.target)) delete mutXmlData.target;
  }
  if (
    'model' in mutXmlData &&
    typeof mutXmlData.model === 'object' &&
    mutXmlData.model
  ) {
    if ('@type' in mutXmlData.model) {
      result.model = networkInterfaceDevice
        .pick({ model: true })
        .parse(mutXmlData.model['@type']).model;
      delete mutXmlData.model['@type'];
    }
    if (isEmptyObject(mutXmlData.model)) delete mutXmlData.model;
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
  if ('address' in mutXmlData) {
    result.address = addressFromXml(mutXmlData.address);
    if (isEmptyObject(mutXmlData.address)) delete mutXmlData.address;
  }
  return result;
}

export function networkInterfaceToXml(device: Partial<NetworkInterfaceDevice>) {
  const result: any = { '@type': 'network' };
  if (device.macAddress != null)
    result['mac'] = { '@address': device.macAddress };
  if (device.targetDev != null || device.targetManaged != null)
    result['target'] = {};
  if (device.targetDev != null) result['target']['@dev'] = device.targetDev;
  if (device.targetManaged != null)
    result['target']['@managed'] = device.targetManaged ? 'yes' : 'no';
  if (device.model != null) result['model'] = { '@type': device.model };
  if (device.alias != null) result['alias'] = { '@name': device.alias };
  if (
    device.sourceBridge != null ||
    device.sourceNetwork != null ||
    device.sourcePortId != null
  )
    result['source'] = {};
  if (device.sourceBridge != null)
    result['source']['@bridge'] = device.sourceBridge;
  if (device.sourceNetwork != null)
    result['source']['@network'] = device.sourceNetwork;
  if (device.sourcePortId != null)
    result['source']['@portid'] = device.sourcePortId;
  if (device.address != null) result['address'] = addressToXml(device.address);
  return result;
}
