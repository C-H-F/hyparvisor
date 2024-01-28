import { z } from 'zod';

export const vncGraphicsDevice = z.object({
  deviceType: z.literal('graphics'),
  graphicsDevice: z.literal('vnc'),
  port: z.number().optional(),
  passwd: z.string().optional(),
  websocket: z.number().optional(),
  autoport: z.boolean().optional(),
  listen: z.string().optional(),
  keymap: z.string().optional(),
});
export type VncGraphicsDevice = z.infer<typeof vncGraphicsDevice>;

export function vncGraphicsFromXmlData(mutXmlData: unknown): VncGraphicsDevice {
  if (!mutXmlData || typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  if (!('@type' in mutXmlData && mutXmlData['@type'] === 'vnc'))
    throw new Error(
      'Device is probably no VNC device:' + JSON.stringify(mutXmlData)
    );
  const result: VncGraphicsDevice = {
    deviceType: 'graphics',
    graphicsDevice: 'vnc',
  };
  delete mutXmlData['@type'];
  if ('@port' in mutXmlData) {
    result.port = +(mutXmlData['@port'] as any);
    delete mutXmlData['@port'];
  }
  if ('@autoport' in mutXmlData) {
    result.autoport = mutXmlData['@autoport'] === 'yes';
    delete mutXmlData['@autoport'];
  }
  if ('@passwd' in mutXmlData) {
    result.passwd = mutXmlData['@passwd'] + '';
    delete mutXmlData['@passwd'];
  }
  if ('@websocket' in mutXmlData) {
    result.websocket = +(mutXmlData['@websocket'] as any);
    delete mutXmlData['@websocket'];
  }
  if ('@listen' in mutXmlData) {
    result.listen = mutXmlData['@listen'] + '';
    delete mutXmlData['@listen'];
  }
  if ('@keymap' in mutXmlData) {
    result.keymap = mutXmlData['@keymap'] + '';
    delete mutXmlData['@keymap'];
  }
  return result;
}

export function vncGraphicsToXml(graphics: Partial<VncGraphicsDevice>) {
  const result: any = { '@type': 'vnc' };
  if (graphics.port != null) result['@port'] = graphics.port;
  if (graphics.autoport != null)
    result['@autoport'] = graphics.autoport ? 'yes' : 'no';
  if (graphics.passwd != null) result['@passwd'] = graphics.passwd;
  if (graphics.websocket != null) result['@websocket'] = graphics.websocket;
  if (graphics.listen != null) result['@listen'] = graphics.listen;
  if (graphics.keymap != null) result['@keymap'] = graphics.keymap;
  return result;
}
