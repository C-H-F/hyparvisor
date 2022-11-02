import { component$, useContext, useStylesScoped$ } from '@builder.io/qwik';
import { applicationContext, ApplicationContext } from '~/ApplicationState';
import { checkLogin, setCredentials } from '~/logic';
import { QwikLogo } from '../icons/qwik';
import styles from './header.css?inline';

export default component$(() => {
  useStylesScoped$(styles);
  const appCtx = useContext<ApplicationContext>(applicationContext);
  return (
    <header>
      <div class="logo">
        <a href="/" target="_top">
          <QwikLogo />
        </a>
      </div>
      <ul>
        {
          appCtx.updateAvailable
          ? <li>
              <a href="#">System updates available!</a>
            </li>
          : null
        }
        <li>
          {
            appCtx.user
            ? <a href="#" onClick$={async () => {
                setCredentials(null);
                await checkLogin(appCtx);
              }} preventDefault:click>{appCtx.user}</a>
            : <a href="#">Login</a>
          }
        </li>
      </ul>
    </header>
  );
});
