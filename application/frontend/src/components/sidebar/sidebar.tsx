import { component$, useContext, useStylesScoped$ } from '@builder.io/qwik';
import styles from './sidebar.css?inline';

import { ComputerIcon } from '~/components/icons/computer';
import { HarddriveIcon } from '~/components/icons/harddrive';
import { NetworkIcon } from '~/components/icons/network';
import { HomeIcon } from '~/components/icons/home';
import { PreferencesIcon } from '~/components/icons/preferences';
import { applicationContext, ApplicationContext } from '~/ApplicationState';

export default component$(() => {
  useStylesScoped$(styles);
  const appCtx = useContext<ApplicationContext>(applicationContext);
  return (
    <>
      <div class="sidebar">
        <header>
          <button class="close">Close</button>
        </header>
        <nav>
          <div>
            <a href="/">
              <HomeIcon /> Dashboard
            </a>
          </div>

          <div>
            <a href="/vm">
              <ComputerIcon /> Virtual Machines
            </a>
            <ul>
              {appCtx.vms.map((vm) => (
                <li>
                  <a href={'/vm/' + encodeURIComponent(vm.name)}>{vm.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <a href="/storage">
              <HarddriveIcon /> Storage
            </a>
          </div>
          <div>
            <a href="/network">
              <NetworkIcon /> Network
            </a>
          </div>
          <div>
            <a href="/system">
              <PreferencesIcon /> System
            </a>
          </div>
        </nav>
      </div>
    </>
  );
});
