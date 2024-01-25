import { z } from 'zod';
import {
  vncGraphicsDevice,
  vncGraphicsFromXmlData,
  vncGraphicsToXml,
} from './vncGraphicsDevice.js';

const unknownGraphicsDevice = z.object({
  deviceType: z.literal('graphics'),
  graphicsDevice: z.literal('unknown'),
});

export const graphicsDevice = z.union([
  unknownGraphicsDevice,
  vncGraphicsDevice,
]);
export type GraphicsDevice = z.infer<typeof graphicsDevice>;

export function graphicsFromXml(mutXmlData: unknown): GraphicsDevice {
  if (!mutXmlData || typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  if ('@type' in mutXmlData && mutXmlData['@type'] === 'vnc')
    return vncGraphicsFromXmlData(mutXmlData);
  return {
    deviceType: 'graphics',
    graphicsDevice: 'unknown',
  };
}

export function graphicsToXml(graphics: GraphicsDevice) {
  if (graphics.graphicsDevice === 'vnc') return vncGraphicsToXml(graphics);
  return {};
}
