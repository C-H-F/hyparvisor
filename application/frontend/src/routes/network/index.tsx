import { component$, useClientEffect$, useStore } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';
import { getVirtualNetworks, NetworkInformation } from '~/logic';

type Store = {
  networks: NetworkInformation[];
};

export default component$(() => {
  const state = useStore<Store>({ networks: [] });
  useClientEffect$(async () => {
    const networks = await getVirtualNetworks();
    state.networks = networks;
  });
  return (
    <>
      <p>Hello from Network!</p>
      <ul>
        {state.networks.map((network) => (
          <li>
            <span>{network.name}</span>
            <span>{network.state}</span>
            <span>{network.persistant ? 'true' : 'false'}</span>
            <span>{network.autostart ? 'true' : 'false'}</span>
          </li>
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Network',
};
