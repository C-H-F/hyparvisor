import StandardLayout from '@/components/layout/standard-layout';
import { useAsyncEffect } from '@/lib/react-utils';
import { Network } from '@/models';
import { client } from '@/trpc-client';
import { useState } from 'react';

export function Networks() {
  const [networks, setNetworks] = useState<Network[]>([]);
  useAsyncEffect(async () => {
    setNetworks(await client.vm.getNetworks.query());
  }, []);
  return (
    <StandardLayout>
      <h2>Network</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            {/* <th>UUID</th> */}
            <th>active</th>
            <th>autostart</th>
            <th>persistant</th>
            <th>bridge</th>
          </tr>
        </thead>
        <tbody>
          {networks
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((network) => (
              <tr key={network.name}>
                <td>{network.name}</td>
                {/* <td>{network.uuid}</td> */}
                <td>{network.active ? 'yes' : 'no'}</td>
                <td>{network.autostart ? 'yes' : 'no'}</td>
                <td>{network.persistent ? 'yes' : 'no'}</td>
                <td>{network.bridge}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </StandardLayout>
  );
}
