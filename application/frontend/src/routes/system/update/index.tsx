import { component$, useClientEffect$, useStore } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import {
  getUpdateInformation,
  isUpdateInProgress,
  runCommand,
  UpdateInformation,
  updateSystem,
} from '~/logic';
type Store = {
  updateInformation: UpdateInformation | null;
  updateInProgress: boolean;
};
export default component$(() => {
  const state = useStore<Store>({
    updateInformation: null,
    updateInProgress: false,
  });
  useClientEffect$(async () => {
    state.updateInProgress = await isUpdateInProgress();
    const updateInformation = await getUpdateInformation();
    state.updateInformation = updateInformation;
  });
  return (
    <>
      <h1>Updates</h1>
      {state.updateInformation === null ? (
        <div>Checking for updates...</div>
      ) : (
        <>
          {state.updateInformation.packages.length === 0 ? (
            <div>No updates available.</div>
          ) : (
            <div>
              <p>
                There are updates for {state.updateInformation.packages.length}{' '}
                {state.updateInformation.packages.length === 1
                  ? 'packages'
                  : 'packages'}{' '}
                available.
              </p>
              <button
                on-click$={async () => {
                  state.updateInProgress = true;
                  console.log(await updateSystem());
                }}
                disabled={state.updateInProgress}
              >
                {state.updateInProgress
                  ? 'Update is in progress...'
                  : 'Install updates now.'}
              </button>
              <table>
                <tr>
                  <th>Name</th>
                  <th>Current Version</th>
                  <th>Latest Version</th>
                </tr>
                {state.updateInformation.packages.map((x) => (
                  <tr>
                    <td>
                      <a
                        target="_blank"
                        href={
                          'https://archlinux.org/packages/?sort=&arch=x86_64&repo=Community&repo=Core&repo=Extra&q=' +
                          encodeURIComponent(x.name)
                        }
                      >
                        {x.name}
                      </a>
                    </td>
                    <td>{x.currentVersion}</td>
                    <td>{x.latestVersion}</td>
                  </tr>
                ))}
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: 'Update',
};
