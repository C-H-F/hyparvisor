import { resourceLimits } from 'worker_threads';
import bytes from 'bytes-iec';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export type MemoryUnit =
  | 'b'
  | 'bytes'
  | 'KB'
  | 'k'
  | 'KiB'
  | 'MB'
  | 'M'
  | 'MiB'
  | 'GB'
  | 'G'
  | 'GiB'
  | 'TB'
  | 'T'
  | 'TiB';

export interface VirtualMachine {
  name: string;
  id: number;
  uuid: string;
  title: string;
  description: string;
  memory: number;
  hypervisor: string;
  vcpuCount: number;
}
function xmlEval(doc: XMLDocument, expr: string): string | null {
  return doc.evaluate(expr, doc).iterateNext()?.textContent ?? null;
}
export function parseVirtualMachineFromXML(xml: string): VirtualMachine {
  const parser = new XMLParser({
    attributeNamePrefix: 'a_',
    transformTagName: (x) => 'n_' + x,
    textNodeName: 't_',
    ignoreAttributes: false,
  });
  const data = parser.parse(xml).n_domain;
  const strMemory = (data.n_memory.t_ ?? '0') + (data.n_memory.a_unit ?? 'b');
  const memory = bytes.parse(strMemory) ?? 0;

  const result: VirtualMachine = {
    id: +(data.n_id ?? '0'),
    name: data.n_name ?? '',
    uuid: data.n_uuid ?? '',
    title: data.n_title ?? '',
    description: data.n_description ?? '',
    hypervisor: data.a_type,
    memory,
    vcpuCount: +data.n_vcpu.t_,
  };

  delete data.n_id;
  delete data.n_name;
  delete data.n_uuid;
  delete data.n_title;
  delete data.n_description;
  delete data.a_type;
  delete data.n_memory;
  delete data.n_vcpu.t_;
  return Object.assign(data, result);
}

export function serializeVirtualMachineToXML(vm: VirtualMachine): string {
  const builder = new XMLBuilder({
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    ignoreAttributes: false,
  });

  const tmp = structuredClone(vm) as any;

  tmp.n_name = tmp.name;
  delete tmp.name;
  tmp.n_uuid = tmp.uuid;
  delete tmp.uuid;
  tmp.n_title = tmp.title;
  delete tmp.n_title;
  tmp.n_description = tmp.description;
  delete tmp.description;
  tmp.a_type = tmp.hypervisor;
  delete tmp.hypervisor;
  tmp.n_vcpu.t_ = tmp.vcpuCount;
  delete tmp.n_vcpu.t_;
  const mem = bytes
    .format(tmp.memory, { mode: 'binary', unitSeparator: '/' })
    ?.split('/');
  if (mem) tmp.n_memory = { a_unit: mem[1], t_: mem[0] };
  delete tmp.memory;

  const map = (obj: Record<string, any>) => {
    let result: any = {};
    for (const key in obj) {
      let newKey = key;
      if (key.startsWith('a_')) newKey = '@_' + key.substring(2);
      else if (key === 't_') newKey = '#text';
      else if (key.startsWith('n_')) newKey = key.substring(2);
      else {
        console.warn('Unknown key type in obj', key, obj);
      }
      if (typeof obj[key] === 'object') result[newKey] = map(obj[key]);
      else result[newKey] = obj[key];
    }
    return result;
  };
  const result = map(tmp);

  return builder.build({ domain: result });
}
