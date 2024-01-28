import { z } from 'zod';
import { isEmptyObject } from '../utils.js';
import { isEmptyXmlNode } from '../xmlUtils.js';
import { address, addressFromXml, addressToXml } from './address.js';

const networkProtocol = z.union([
  //z.discriminatedUnion('name', [
  z.object({
    protocol: z.union([
      z.literal('iscsi'),
      z.literal('rbd'),
      z.literal('sheepdog'),
      z.literal('gluster'),
      z.literal('nfs'),
      z.literal('ftp'),
      z.literal('ftps'),
      z.literal('tftp'),
    ]),
    name: z.string(),
  }),
  z.object({
    protocol: z.literal('nbd'),
    name: z.string().optional(),
    tls: z.boolean(),
    tlsHostname: z.string().optional(),
  }),
  z.object({
    protocol: z.union([z.literal('http'), z.literal('https')]),
    name: z.string(),
    query: z.string(),
  }),
  z.object({
    protocol: z.literal('vxhs'),
    name: z.string(),
    tls: z.boolean(), //'yes' | 'no'
  }),
]);

const source = z.union([
  //z.discriminatedUnion('type', [
  z.object({
    type: z.union([z.literal('file'), z.literal('block'), z.literal('dir')]),
    value: z.string(),
    index: z.number().optional(),
  }),
  z.object({
    type: z.literal('network'),
    value: networkProtocol,
    index: z.number().optional(),
  }),
  z.object({
    type: z.literal('volume'),
    value: z.object({
      pool: z.any(),
      volume: z.any(),
      mode: z.union([z.literal('direct'), z.literal('host')]).optional(),
    }),
    index: z.number().optional(),
  }),
  z.object({
    type: z.literal('nvme'),
    value: z.object({
      type: z.string(),
      managed: z.boolean(), //'yes' | 'no'
      namespace: z.number(),
    }),
    index: z.number().optional(),
  }),
  z.object({
    type: z.literal('vhostuser'),
    value: z.any(), //TODO
    index: z.number().optional(),
  }),
]);

const metadataCache = z.object({
  maxSize: z.number(),
  discardNoUnref: z.boolean().optional(),
});

const commonDiskDevice = z.object({
  deviceType: z.literal('disk'),
  device: z.union([z.literal('floppy'), z.literal('disk'), z.literal('cdrom')]),
  model: z
    .union([
      z.literal('virtio'),
      z.literal('virtio-transitional'),
      z.literal('virtio-non-transitional'),
    ])
    .optional(),
  snapshot: z
    .union([
      z.literal('internal'), //only qcow2
      z.literal('external'),
      z.literal('no'),
    ])
    .optional(),
  source: source,
  backingStore: z
    .object({
      type: z.any().optional(),
      index: z.any().optional(),
      format: z
        .object({
          type: z.union([z.literal('raw'), z.literal('qcow2')]),
          format: z.any(), // metadata_cache from driver...
        })
        .optional(),
      source: source.optional(),
    })
    .optional(),
  target: z
    .object({
      dev: z.string(),
      bus: z.union([
        z.literal('ide'),
        z.literal('scsi'),
        z.literal('virtio'),
        z.literal('xen'),
        z.literal('usb'),
        z.literal('sata'),
        z.literal('sd'),
      ]),
      tray: z.boolean().optional(), //'open' | 'closed' (for cdrom or floppy)
      removable: z.boolean().optional(), //'on' | 'off' (for USB or SCSI)
      rotationRate: z.number().optional(), //1025-65534 (rpm)
    })
    .optional(), //TODO: remove
  iotune: z.any().optional(), //TODO
  driver: z
    .object({
      name: z.literal('qemu'),
      type: z.union([
        z.literal('raw'),
        z.literal('bochs'),
        z.literal('qcow2'),
        z.literal('qed'),
      ]),
      cache: z
        .union([
          z.literal('default'),
          z.literal('none'),
          z.literal('writethrough'),
          z.literal('writeback'),
          z.literal('directsync'),
          z.literal('unsafe'),
        ])
        .optional(),
      errorPolicy: z
        .union([
          z.literal('stop'),
          z.literal('report'),
          z.literal('ignore'),
          z.literal('enospace'),
        ])
        .optional(),
      io: z.union([z.literal('threads'), z.literal('native')]).optional(),
      ioeventfd: z.boolean().optional(), //'on' | 'off'
      eventIdx: z.boolean().optional(), //'on' | 'off'
      copyOnRead: z.boolean().optional(), //'on' | 'off'
      discard: z.union([z.literal('trim'), z.literal('unmap')]).optional(),
      detectZeroes: z
        .union([z.literal('off'), z.literal('on'), z.literal('unmap')])
        .optional(),
      iothread: z.any().optional(), //TODO
      queues: z.number().optional(),
      queueSize: z.number().optional(),
      metadataCache: metadataCache.optional(),
    })
    .optional(),
  //backenddomain: Xen only!
  boot: z
    .object({
      order: z.number(),
      loadparm: z.string(), //8 char
    })
    .optional(),
  alias: z.string().optional(),
  encryption: z.any().optional(), //TODO
  readonly: z.boolean().optional(),
  shareable: z.boolean().optional(),
  transient: z.any().optional(), //TODO
  serial: z.string().optional(),
  wwn: z.string().optional(), //World Wide Name - 16 hex digits!
  vendor: z.string().optional(), //Max 8 chars
  product: z.string().optional(), //Max 16 chars
  address: address.optional(),
  auth: z.any().optional(), //TODO
  geometry: z.any().optional(), //TODO
  blockio: z.any().optional(), //TODO
});

const lunDiskDevice = commonDiskDevice.merge(
  z.object({
    type: z.union([z.literal('blick'), z.literal('network')]),
    device: z.literal('lun'),
    rawio: z.boolean(),
    sgio: z.union([z.literal('filtered'), z.literal('unfiltered')]),
  })
);

const genericDiskDevice = commonDiskDevice.merge(
  z.object({
    type: z.union([
      z.literal('file'),
      z.literal('block'),
      z.literal('dir'),
      z.literal('network'),
      z.literal('volume'),
      z.literal('nvme'),
      z.literal('vhostuser'),
    ]),
  })
);

export const diskDevice = z.union([
  //z.discriminatedUnion('type', [
  genericDiskDevice,
  lunDiskDevice,
]);
export type DiskDevice = z.infer<typeof diskDevice>;

export function diskFromXml(mutXmlData: unknown): DiskDevice {
  if (!mutXmlData || typeof mutXmlData !== 'object')
    throw new Error('Object expected. Got ' + JSON.stringify(mutXmlData));
  const result: Partial<DiskDevice> = {
    deviceType: 'disk',
  };

  if ('@type' in mutXmlData && typeof mutXmlData['@type'] === 'string') {
    const ans = mutXmlData['@type'] as typeof result.type;

    result.type = ans;
    delete mutXmlData['@type'];
  }

  if ('@device' in mutXmlData && typeof mutXmlData['@device'] === 'string') {
    const ans = mutXmlData['@device'] as typeof result.device;

    result.device = ans;
    delete mutXmlData['@device'];
  }

  if (
    'source' in mutXmlData &&
    mutXmlData.source &&
    typeof mutXmlData.source === 'object'
  ) {
    const source = mutXmlData.source;
    //result.source = {};

    if ('@file' in source && typeof source['@file'] === 'string') {
      result.source = {
        type: 'file',
        value: source['@file'],
      };
      delete source['@file'];
    } else if ('@block' in source && typeof source['@block'] === 'string') {
      result.source = {
        type: 'block',
        value: source['@block'],
      };
      delete source['@block'];
    } else if ('@dir' in source && typeof source['@dir'] === 'string') {
      result.source = {
        type: 'dir',
        value: source['@dir'],
      };
      delete source['@dir'];
    }
    if ('@index' in source) {
      (result as any).source.index = +(source['@index'] as any);
      delete source['@index'];
    }

    //TODO: Add more disk sources here. Continue here (https://libvirt.org/formatdomain.html#devices)

    if (isEmptyObject(source)) delete mutXmlData.source;
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
  if (
    'driver' in mutXmlData &&
    mutXmlData.driver &&
    typeof mutXmlData.driver === 'object' &&
    mutXmlData.driver
  ) {
    const zDriver = commonDiskDevice.shape.driver.unwrap();
    const driver = mutXmlData.driver;
    const resultDriver = {} as any;
    if ('@name' in driver) {
      resultDriver.name = zDriver.shape.name.parse(driver['@name']);
      delete driver['@name'];
    }
    if ('@type' in driver) {
      resultDriver.type = zDriver.shape.type.parse(driver['@type']);
      delete driver['@type'];
    }
    if ('@cache' in driver) {
      resultDriver.cache = zDriver.shape.cache.parse(driver['@cache']);
      delete driver['@cache'];
    }
    if ('@error_policy' in driver) {
      resultDriver.errorPolicy = zDriver.shape.errorPolicy.parse(
        driver['@error_policy']
      );
      delete driver['@error_policy'];
    }
    if ('@io' in driver) {
      resultDriver.io = zDriver.shape.io.parse(driver['@io']);
      delete driver['@io'];
    }
    if ('@ioeventfd' in driver) {
      resultDriver.ioeventfd = driver['@ioeventfd'] === 'on';
      delete driver['@ioeventfd'];
    }
    if ('@event_idx' in driver) {
      resultDriver.eventIdx = driver['@event_idx'] === 'on';
      delete driver['@event_idx'];
    }
    if ('@copy_on_read' in driver) {
      resultDriver.copyOnRead = driver['@copy_on_read'] === 'on';
      delete driver['@copy_on_read'];
    }
    if ('@discard' in driver) {
      resultDriver.discard = zDriver.shape.discard.parse(driver['@discard']);
      delete driver['@discard'];
    }
    if ('@detect_zeroes' in driver) {
      resultDriver.detectZeroes = zDriver.shape.detectZeroes.parse(
        driver['@detect_zeroes']
      );
      delete driver['@detect_zeroes'];
    }
    if ('@iothread' in driver) {
      //TODO
      console.error('NOT IMPLEMENTED: iothread!');
    }
    if ('@queues' in driver) {
      resultDriver.queues = +(driver['@queues'] as any);
      delete driver['@queues'];
    }
    if ('@queue_size' in driver) {
      resultDriver.queueSize = +(driver['@queue_size'] as any);
      delete driver['@queue_size'];
    }
    if ('metadata_cache' in driver) {
      //TODO
      console.error('NOT IMPLEMENTED: metadataCache!');
    }
    result.driver = resultDriver;

    if (isEmptyObject(driver)) delete mutXmlData.driver;
  }
  if (
    'address' in mutXmlData &&
    mutXmlData.address &&
    typeof mutXmlData.address === 'object'
  ) {
    (result as any).address = addressFromXml(mutXmlData.address);
    if (isEmptyObject(mutXmlData.address)) delete mutXmlData.address;
  }
  if ('readonly' in mutXmlData) {
    result.readonly = true;
    delete mutXmlData.readonly;
  }
  if (
    'target' in mutXmlData &&
    mutXmlData.target &&
    typeof mutXmlData.target === 'object'
  ) {
    const zTarget = commonDiskDevice.shape.target.unwrap();

    const resultTarget: any = {};
    const target = mutXmlData.target;
    if ('@dev' in target) {
      resultTarget.dev = target['@dev'] + '';
      delete target['@dev'];
    }
    if ('@bus' in target) {
      resultTarget.bus = zTarget.shape.bus.parse(target['@bus']);
      delete target['@bus'];
    }
    if ('@tray' in target) {
      resultTarget.tray = target['@tray'] === 'open';
      delete target['@tray'];
    }
    if ('@removable' in target) {
      resultTarget.removable = target['@removable'] === 'on';
      delete target['@removable'];
    }
    if ('@rotation_rate' in target) {
      resultTarget.rotationRate = +(target['@rotation_rate'] as any);
      delete target['@rotation_rate'];
    }
    result.target = resultTarget;
    if (isEmptyObject(target)) delete mutXmlData.target;
  }

  if (
    ('backingStore' in mutXmlData && isEmptyXmlNode(mutXmlData.backingStore)) ||
    ('backingStore' in mutXmlData &&
      mutXmlData.backingStore &&
      typeof mutXmlData.backingStore === 'object')
  ) {
    result.backingStore = {};
    const backingStore = mutXmlData.backingStore;
    //TODO: Subelements
    if (isEmptyXmlNode(backingStore)) delete mutXmlData.backingStore;
    else console.error('Subelements of backingStore not implemented');
  }

  //TODO: Add more here. Continue here

  console.log(result);
  diskDevice.parse(result);
  return result as DiskDevice;
}
export function diskToXml(disk: Partial<DiskDevice>) {
  const result: any = {
    '@device': disk.device,
  };
  if (disk.type) result['@type'] = disk.type;
  if (disk.source) {
    if (disk.source.index) result['source'] = { '@index': disk.source.index };
    if (disk.source.type === 'file') {
      let source = result['source'];
      if (!source || typeof source !== 'object') source = {};
      source['@file'] = disk.source.value;
      result['source'] = source;
    } else if (disk.source.type === 'block') {
      let source = result['source'];
      if (!source || typeof source !== 'object') source = {};
      source['@block'] = disk.source.value;
      result['source'] = source;
    } else if (disk.source.type === 'dir') {
      let source = result['source'];
      if (!source || typeof source !== 'object') source = {};
      source['@dir'] = disk.source.value;
      result['source'] = source;
    }
  }
  if (disk.driver) {
    let driver = result['driver'];
    if (!driver || typeof driver !== 'object') driver = {};

    if (disk.driver.name) driver['@name'] = disk.driver.name;
    if (disk.driver.type) driver['@type'] = disk.driver.type;
    if (disk.driver.cache) driver['@cache'] = disk.driver.cache;
    if (disk.driver.errorPolicy)
      driver['@error_policy'] = disk.driver.errorPolicy;
    if (disk.driver.io) driver['@io'] = disk.driver.io;
    if (disk.driver.ioeventfd)
      driver['@ioeventfd'] = disk.driver.ioeventfd ? 'on' : 'off';
    if (disk.driver.eventIdx)
      driver['@event_idx'] = disk.driver.eventIdx ? 'on' : 'off';
    if (disk.driver.copyOnRead)
      driver['@copy_on_read'] = disk.driver.copyOnRead ? 'on' : 'off';
    if (disk.driver.discard) driver['@discard'] = disk.driver.discard;
    if (disk.driver.detectZeroes)
      driver['@detect_zeroes'] = disk.driver.detectZeroes;
    if (disk.driver.iothread) {
      throw new Error('iothread not implemented'); //TODO
    }
    if (disk.driver.queues) driver['@queues'] = disk.driver.queues;
    if (disk.driver.queueSize) driver['@queue_size'] = disk.driver.queueSize;
    if (disk.driver.metadataCache)
      throw new Error('metadataCache not implemented'); //TODO
    result['driver'] = driver;
  }
  if (disk.address)
    result['address'] = addressToXml(disk.address, result['address']);
  if (disk.readonly) result['readonly'] = { '#text': '' };
  if (disk.target) {
    let target = result['target'];
    if (!target || typeof target !== 'object') target = {};
    if (disk.target.dev) target['@dev'] = disk.target.dev;
    if (disk.target.bus) target['@bus'] = disk.target.bus;
    if (disk.target.tray)
      target['@tray'] = disk.target.tray ? 'open' : 'closed';
    if (disk.target.removable)
      target['@removable'] = disk.target.removable ? 'on' : 'off';
    if (disk.target.rotationRate)
      target['@rotation_rate'] = disk.target.rotationRate;
    result['target'] = target;
  }
  if (disk.backingStore) {
    if (isEmptyObject(disk.backingStore))
      result['backingStore'] = { '#text': '' };
    else throw new Error('Subelements of backingStore not implemented');
  }
  if (disk.alias) result['alias'] = { '@name': disk.alias };
  return result;
}
