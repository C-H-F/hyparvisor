import { component$, useClientEffect$, useStore } from '@builder.io/qwik';
import { DocumentHead, useLocation } from '@builder.io/qwik-city';
import { getVirtualMachine } from '~/logic';

type Store = {
  xml: string;
};

export default component$(() => {
  const location = useLocation();

  const state = useStore<Store>({ xml: '' });
  const vmId = decodeURIComponent(location.params.vmId);
  useClientEffect$(async () => {
    state.xml = await getVirtualMachine(vmId);
  });

  return (
    <>
      <pre>{state.xml}</pre>
      <div>
        <button>Console</button>
        <button>Shutdown</button>
        <button>Pause</button>
        <button>Restart</button>
        <button>Edit</button>
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
              <td>2 vCPUs</td>
            </tr>
            <tr>
              <th>Memory:</th>
              <td>4GB</td>
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
