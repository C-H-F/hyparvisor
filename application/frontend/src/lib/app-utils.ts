import { sha512 } from './crypto';

export function createPasswordHash(email: string, password: string) {
  return sha512(email + ':' + password);
}
