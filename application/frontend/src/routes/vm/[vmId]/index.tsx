import { component$, useClientEffect$, useStore } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';
import { getVirtualMachine } from '~/logic';
import { ShutdownIcon } from '~/components/icons/shutdown';
import { PauseIcon } from '~/components/icons/pause';
import { RestartIcon } from '~/components/icons/restart';
import { EditIcon } from '~/components/icons/edit';
import { ComputerIcon } from '~/components/icons/computer';
import bytes from 'bytes-iec';
import {
  parseVirtualMachineFromXML,
  serializeVirtualMachineToXML,
  VirtualMachine,
} from '~/models/VirtualMachine';

type Store = {
  xml: string;
  vm: VirtualMachine | null;
};

export default component$(() => {
  const location = useLocation();

  const state = useStore<Store>({ xml: '', vm: null });
  const vmId = decodeURIComponent(location.params.vmId);
  useClientEffect$(async () => {
    state.xml = await getVirtualMachine(vmId);
    state.vm = parseVirtualMachineFromXML(state.xml);
  });

  return (
    <>
      <pre>{state.xml}</pre>
      <div>
        <button>
          <ComputerIcon /> Console
        </button>
        <button>
          <ShutdownIcon /> Shutdown
        </button>
        <button>
          <PauseIcon /> Pause
        </button>
        <button>
          <RestartIcon /> Restart
        </button>
        <button>
          <EditIcon />
          Edit
        </button>
      </div>
      <div style="float: right;">
        <section>
          <h2>Preview</h2>
          <img src="https://placekitten.com/300/140" alt="preview" />
        </section>
        <section>
          <h2>CPU usage</h2>
          <img src="https://placekitten.com/300/80" alt="preview" />
        </section>
        <section>
          <h2>Memory usage</h2>
          <img src="https://placekitten.com/300/81" alt="preview" />
        </section>
        <section>
          <h2>Network usage</h2>
          <img src="https://placekitten.com/300/79" alt="preview" />
        </section>
      </div>
      <div>
        <section>
          <h2>General</h2>
          <table>
            <tr>
              <th>Name:</th>
              <td>{vmId}</td>
            </tr>
            <tr>
              <th>IP Addresses:</th>
              <td>
                <ol>
                  <li>10.0.0.1</li>
                  <li>192.168.1.1</li>
                  <li>ffff::ffff:ffff</li>
                </ol>
              </td>
            </tr>
          </table>
        </section>
        <section>
          <h2>System</h2>
          <table>
            <tr>
              <th>CPU:</th>
              <td>{state.vm?.vcpuCount} vCPU(s)</td>
            </tr>
            <tr>
              <th>Memory:</th>
              <td>{bytes.format(state.vm?.memory ?? 0, { mode: 'binary' })}</td>
            </tr>
          </table>
        </section>

        <section>
          <h2>Storage</h2>
          <table>
            <tr>
              <th>HDD 1:</th>
              <td>16GB</td>
            </tr>
            <tr>
              <th>HDD 2:</th>
              <td>4GB</td>
            </tr>
            <tr>
              <th>CD DVD Drive</th>
              <td>archlinux.iso</td>
            </tr>
          </table>
        </section>
      </div>
      <div style="clear: both;"></div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Virtual Machines',
};
