export type JXml = {
  xName: string;
  xAttr: { [key: string]: string };
  xVals: (JXml | string)[];
};

export function xmlToJXml(node: Node | string): JXml | string | null {
  if (typeof node === 'string') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(node, 'text/xml');
    return xmlToJXml(doc);
  }
  if (node.nodeType == Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType == Node.DOCUMENT_NODE)
    for (let i = 0; i < node.childNodes?.length; i++) {
      const res = xmlToJXml(node.childNodes[i]);
      if (res) return res;
    }
  if (node.nodeType == Node.ELEMENT_NODE) {
    const elem = node as Element;
    const result: JXml = {
      xName: node.nodeName,
      xAttr: {},
      xVals: [],
    };
    for (let i = 0; i < elem.attributes?.length; i++) {
      const attribute = elem.attributes[i];
      result.xAttr[attribute.name] = attribute.value;
    }
    for (let i = 0; i < elem.childNodes?.length; i++) {
      const childNode = elem.childNodes[i];
      const val = xmlToJXml(childNode);
      if (typeof val === 'string' && val.trim().length === 0) continue;
      if (val) result.xVals.push(val);
    }
    return result;
  }
  return null;
}
function jXmlToXmlImpl(jXml: JXml | string, doc: Document): Node {
  if (typeof jXml === 'string') return doc.createTextNode(jXml);
  const elem = doc.createElement(jXml.xName);
  for (const key in jXml.xAttr) elem.setAttribute(key, jXml.xAttr[key]);
  for (const value of jXml.xVals) {
    if (!value) continue;
    elem.appendChild(jXmlToXmlImpl(value, doc));
  }
  doc.appendChild(elem);
  return elem;
}
export function jXmlToXml(jXml: JXml): Document {
  const result = new Document();
  jXmlToXmlImpl(jXml, result);
  return result;
}
