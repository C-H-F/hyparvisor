import { component$, useClientEffect$, useStore } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import { getBlockDevices } from '~/logic';
import { BlockDevice } from '~/models/BlockDevice';
type Store = { blockDevices: BlockDevice[] | null };

export const Disk = component$((props: { device: BlockDevice }) => {
  return (
    <li>
      {props.device.name} {props.device.fstype}
      <ul>
        {props.device.children?.map((device) => (
          <Disk device={device} />
        ))}
      </ul>
    </li>
  );
});

export default component$(() => {
  const state = useStore<Store>({
    blockDevices: null,
  });
  useClientEffect$(async () => {
    const blockDevices = await getBlockDevices();
    state.blockDevices = blockDevices;
  });
  return (
    <>
      <p>Hello from Storage!</p>
      <ul>
        {state.blockDevices?.map((device) => (
          <Disk device={device} />
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Storage',
};
