import { z } from 'zod';
import { isEmptyObject } from '../utils.js';
import bytes from 'bytes-iec';
import {
  Device,
  device,
  pushDevicesFromXml,
  pushDevicesToXml,
} from './device.js';
import { diskFromXml } from './disk.js';
import { graphicsFromXml } from './graphics.js';
import { interfaceFromXml } from './interface.js';
import { inputFromXml } from './input.js';

export const vmDefinition = z.object({
  id: z.number(),
  name: z.string(),
  uuid: z.string(),
  title: z.string(),
  description: z.string(),
  hypervisor: z.string(),
  memory: z.number(),
  vcpuCount: z.number(),
  devices: device.array(),
  osId: z.string().optional().nullable(),
  osType: z
    .union([
      z.literal('hvm'),
      z.literal('linux'),
      z.literal('xenphv'),
      z.literal('exe'),
    ])
    .optional()
    .nullable(),
  osArch: z
    .union([z.literal('x86_64'), z.literal('i686')])
    .optional()
    .nullable(),
  _raw: z.unknown(),
});
export type VmDefinition = z.infer<typeof vmDefinition>;

export function vmDefinitionFromXml(mutXmlData: any) {
  const tmp = mutXmlData;
  const name = tmp.name;
  delete tmp.name;
  const id = tmp['@id'] == null ? undefined : +tmp['@id'];
  delete tmp['@id'];
  const memorySize = tmp.memory['#text'] ?? '0';
  delete tmp.memory['#text'];
  const memoryUnit = tmp.memory['@unit'] ?? 'b';
  delete tmp.memory['@unit'];
  const memory = bytes.parse(memorySize + memoryUnit) ?? 0;
  if (isEmptyObject(tmp.memory)) delete tmp.memory;
  const uuid = tmp.uuid;
  delete tmp.uuid;
  const vcpuCount = +tmp.vcpu['#text'];
  delete tmp.vcpu['#text'];
  const title = tmp.title;
  delete tmp.title;
  const description = tmp.description;
  delete tmp.description;
  const hypervisor = tmp['@type'];
  delete tmp['@type'];
  const osId =
    tmp.metadata?.['libosinfo:libosinfo']?.['libosinfo:os']?.['@id'] ?? null;
  if (osId != null) {
    delete tmp.metadata['libosinfo:libosinfo']['libosinfo:os']['@id'];
    if (isEmptyObject(tmp.metadata['libosinfo:libosinfo']['libosinfo:os'])) {
      delete tmp.metadata['libosinfo:libosinfo']['libosinfo:os'];
      delete tmp.metadata['libosinfo:libosinfo']['@xmlns:libosinfo'];
    }
    if (isEmptyObject(tmp.metadata['libosinfo:libosinfo']))
      delete tmp.metadata['libosinfo:libosinfo'];
    if (isEmptyObject(tmp.metadata)) delete tmp.metadata;
  }

  const devices = [] as Device[];
  pushDevicesFromXml(devices, tmp.devices, 'disk', diskFromXml);
  pushDevicesFromXml(devices, tmp.devices, 'graphics', graphicsFromXml);
  pushDevicesFromXml(devices, tmp.devices, 'interface', interfaceFromXml);
  pushDevicesFromXml(devices, tmp.devices, 'input', inputFromXml);

  const result: VmDefinition = {
    name,
    id: id ?? 0,
    osId,
    memory,
    uuid,
    vcpuCount,
    title,
    description,
    hypervisor,
    devices,
    _raw: tmp,
  };

  if (tmp.os && typeof tmp.os === 'object') {
    if (tmp.os.type && typeof tmp.os.type === 'object') {
      if (tmp.os.type['#text']) {
        try {
          result.osType = vmDefinition.shape.osType.parse(tmp.os.type['#text']);
          delete tmp.os.type['#text'];
        } catch {
          //Unknown os type. Just ignore it.
        }
      }
      if (tmp.os.type['@arch']) {
        try {
          result.osArch = vmDefinition.shape.osArch.parse(tmp.os.type['@arch']);
          delete tmp.os.type['@arch'];
        } catch {
          //Unknown os type. Just ignore it.
        }
      }
      if (isEmptyObject(tmp.os.type)) delete tmp.os.type;
    }
    if (isEmptyObject(tmp.os)) delete tmp.os;
  }

  return result;
}
export function vmDefinitionToXml(mutDefinition: Partial<VmDefinition>) {
  const definition = mutDefinition;
  const result: any = definition['_raw'] ?? {};
  delete definition['_raw'];

  if (definition.id != null) result['@id'] = definition.id;
  if (definition.name != null) result['name'] = definition.name;
  if (definition.memory != null) {
    if (result['memory'] == null) result['memory'] = {};
    const formattedBytes = bytes.format(definition.memory, {
      mode: 'binary',
      unitSeparator: ' ',
    });
    if (!formattedBytes)
      throw new Error(
        'Problems occured while exporting memory size: "' +
          JSON.stringify(definition.memory) +
          '"'
      );
    const [size, unit] = formattedBytes.split(' ');
    result['memory']['#text'] = size;
    result['memory']['@unit'] = unit;
  }
  if (definition.uuid != null) result['uuid'] = definition.uuid;
  if (definition.vcpuCount != null) {
    if (result['vcpu'] == null) result['vcpu'] = {};
    result['vcpu']['#text'] = definition.vcpuCount;
  }
  if (definition.title != null) result['title'] = definition.title;
  if (definition.description != null)
    result['description'] = definition.description;
  if (definition.hypervisor != null) result['@type'] = definition.hypervisor;
  if (definition.osId != null) {
    if (result['metadata'] == null) result['metadata'] = {};
    if (result['metadata']['libosinfo:libosinfo'] == null)
      result['metadata']['libosinfo:libosinfo'] = {};
    if (result['metadata']['libosinfo:libosinfo']['libosinfo:os'] == null)
      result['metadata']['libosinfo:libosinfo']['libosinfo:os'] = {};
    result['metadata']['libosinfo:libosinfo']['libosinfo:os']['@id'] =
      definition.osId;
    result['metadata']['libosinfo:libosinfo']['@xmlns:libosinfo'] =
      'http://libosinfo.org/xmlns/libvirt/domain/1.0';
  }
  if (definition.osType != null) {
    if (result.os == null) result.os = {};
    if (result.os.type == null) result.os.type = {};
    if (definition.osType) result.os.type['#text'] = definition.osType;
    if (definition.osArch) result.os.type['@arch'] = definition.osArch;
  }
  if (definition.devices) pushDevicesToXml(definition.devices, result);
  return result;
}
