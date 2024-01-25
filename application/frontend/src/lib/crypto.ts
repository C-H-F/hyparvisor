function arrayBufferToBase64(buffer: ArrayBuffer) {
  //return Buffer.from(sha512).toString('base64');
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Creates a SHA-512 hash from an UTF-8 encoded string and returns the result as base64 encoded string.
 * @param message The UTF-8 encoded message to hash.
 * @returns A promise of the base64 encoded SHA-512 hash.
 */
export async function sha512(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  if (!crypto.subtle) {
    //Fallback for debug HTTP connection: asynchronously load crypto-js library instead.
    //This should not be bundled into the application directly.
    const cjs = await import('crypto-js');
    const sha512 = cjs.SHA512(message);
    return sha512.toString(cjs.enc.Base64);
  }
  const sha512 = await crypto.subtle.digest('SHA-512', data);
  return arrayBufferToBase64(sha512);
}
