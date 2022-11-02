import {
  component$,
  Slot,
  useClientEffect$,
  useContextProvider,
  useStore,
} from '@builder.io/qwik';
import { applicationContext, ApplicationContext } from '~/ApplicationState';
import Header from '../components/header/header';
import Sidebar from '../components/sidebar/sidebar';
import Login from '../components/login/login';
import { checkLogin } from '~/logic';

export default component$(() => {
  const state = useStore<ApplicationContext>({
    user: null,
    updateAvailable: false,
    vms: []
  });
  useContextProvider<ApplicationContext>(applicationContext, state);
  useClientEffect$(async () => {
    if(!(await checkLogin(state)))
      return;
  });
  return (
    <>
      <span id="start"></span>
      <a class="jumplabel" href="#main">
        Skip to main content.
      </a>
      <Sidebar />
      <Header />
      <main id="main">
        <Slot />
        {state.user ? <div /> : <Login />}
      </main>

      <footer>
        Hyparvisor is free and open source software provided under the AGPL-3.0
        license. <a href="/license">Read more about it.</a>
      </footer>

      <a class="jumplabel" href="#start">
        Jump to start of page.
      </a>
    </>
  );
});
