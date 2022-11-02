import { component$, useClientEffect$, useContext, useStore, useStylesScoped$ } from '@builder.io/qwik';
import { applicationContext, ApplicationContext } from '~/ApplicationState';
import { Credentials, getCredentials, initializeState, setCredentials, testCredentials } from '~/logic';

import styles from './login.css?inline';
export default component$(() => {
  useStylesScoped$(styles);
  const appCtx = useContext<ApplicationContext>(applicationContext);
  const store = useStore<Credentials>({wsUrl: '', wsProtocol: 'ssh', username: '', password: '',  serverHost: '', serverPort: 0});
  useClientEffect$(async() => {
    Object.assign(store, getCredentials());
  });

  return (
    <>
      <div class="login">
        <form>
          <label>
            <span>Username:</span>
            <input type="text" value={store.username} onChange$={(evt) => {store.username = (evt.target as HTMLInputElement).value;}}/>
          </label>
          <label>
            <span>Password:</span>
            <input type="password" value={store.password} onChange$={(evt) => {store.password = (evt.target as HTMLInputElement).value;}} />
          </label>
          <label>
            <span>Server:</span>
            <input type="text" value={store.serverHost} onChange$={(evt) => {store.serverHost = (evt.target as HTMLInputElement).value;}} />
          </label>
          <label>
            <span>Port:</span>
            <input type="number" value={store.serverPort} onChange$={(evt) => {store.serverPort = +(evt.target as HTMLInputElement).value;}} />
          </label>
          <input
            type="reset"
            value="Reset"
            preventDefault:click
            onClick$={(evt) => {
              //Reset local copy to current values.
              Object.assign(store, appCtx);
            }}
          />
          <input
            type="submit"
            value="Login"
            preventDefault:click

            onClick$={async (evt) => {
              const self = evt.target as HTMLInputElement;
              try {
                const oldCredentials = getCredentials();
                setCredentials({...store});
                if(await testCredentials())
                  appCtx.user = store.username + '@' + store.serverHost;
                else
                  setCredentials(oldCredentials);
              }
              catch(ex){console.error(ex);}
              finally{self.disabled = false;}

            }}
          />
        </form>
      </div>
    </>
  );
});
