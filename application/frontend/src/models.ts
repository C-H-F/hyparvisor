import { client } from '@/trpc-client';
export type VmList = Awaited<ReturnType<typeof client.vm.list.query>>;
export type VmInfo = Awaited<ReturnType<typeof client.vm.getInfo.query>>;
export type VmDefinition = Awaited<
  ReturnType<typeof client.vm.getDefinition.query>
>;
export type Device = VmDefinition['devices'][0];
export type GraphicsDevice = Extract<Device, { deviceType: 'graphics' }>;
export type VncGraphicsDevice = Extract<
  GraphicsDevice,
  { graphicsDevice: 'vnc' }
>;

export type Network = Awaited<
  ReturnType<typeof client.vm.getNetworks.query>
>[0];

export type AccountDetails = Awaited<
  ReturnType<typeof client.user.getAccountDetails.query>
>;
export function makeDefaultAccountDetails(): AccountDetails {
  return {
    email: '',
    permissions: [],
    passwordExpiration: null,
    role: 'User',
    home: '',
    sessions: [],
  };
}
