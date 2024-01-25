import { isEmptyObject } from './utils.js';

export function isEmptyXmlNode(obj: any) {
  if (isEmptyObject(obj)) return true;
  if (obj['#text'] === '') return true;
  if (obj === '') return true;
  return false;
}
