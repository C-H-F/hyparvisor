import { resourceLimits } from 'worker_threads';
import { JXml, xmlToJXml, jXmlToXml } from '~/utils/xmlHelper';
import bytes from 'bytes-iec';

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

export interface VirtualMachine extends JXml {
  xName: 'domain';
  name: string;
  id: number;
  uuid: string;
  title: string;
  description: string;
  memory: number;
  hypervisor: string;
}
function xmlEval(doc: XMLDocument, expr: string): string | null {
  return doc.evaluate(expr, doc).iterateNext()?.textContent ?? null;
}
export function parseVirtualMachineFromXML(xml: string): VirtualMachine {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const result = xmlToJXml(doc) as VirtualMachine;
  result.name = xmlEval(doc, '/domain/name/text()') ?? 'name';
  result.uuid = xmlEval(doc, '/domain/uuid/text()') ?? '';
  result.id = 0; //TODO
  result.title = xmlEval(doc, '/domain/title/text()') ?? '';
  result.description = xmlEval(doc, '/domain/description/text()') ?? '';
  const strMemory =
    (xmlEval(doc, '/domain/memory/text()') ?? '0') +
      xmlEval(doc, '/domain/memory/@unit') ?? '';
  result.memory = bytes.parse(strMemory) ?? 0;
  result.hypervisor = xmlEval(doc, '/domain/@type') ?? '';

  return result;
}
