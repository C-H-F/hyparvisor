import {
  Folder,
  Home,
  Menu,
  Monitor,
  Network,
  PackageCheck,
  TerminalSquare,
  Users,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './shadcn/ui/button';
import { useState } from 'react';
//import { useVirtualMachineStore } from '../context/appContext';

function menuEntryClasses(urlPattern: string, classes: string[]) {
  const path = window.location.pathname;
  const regex = new RegExp(urlPattern);
  if (regex.test(path)) classes.push('bg-gray-50', 'dark:bg-gray-700');
  return classes.join(' ');
}

export default function Sidebar() {
  // const virtualMachines = useVirtualMachineStore(
  //   (state) => state.virtualMachines
  // );
  const [pinned, setPinned] = useState(false);
  return (
    <>
      <Button className="absolute m-5">
        <Menu
          onClick={(evt) => {
            const unpin = () => {
              window.removeEventListener('click', unpin);
              setPinned(false);
            };
            window.addEventListener('click', unpin);
            setPinned(!pinned);
            evt.stopPropagation();
          }}
        />
      </Button>
      <aside
        className="fixed left-0 top-0 z-10 flex max-h-screen min-h-screen w-[var(--nav-size)] -translate-x-[var(--nav-size)] flex-col bg-gray-300 text-black transition-transform dark:bg-gray-900 dark:text-white sm:translate-x-0"
        style={{ transform: pinned ? 'translateX(0px)' : '' }}
      >
        <header className="h-36 w-full bg-black"></header>
        <nav className="overflow-auto">
          <div>
            <Link to="/">
              <div className={menuEntryClasses('^/$', ['p-3'])}>
                <Home className="mr-3 inline-block h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </Link>
          </div>
          <div>
            <Link to="/vm">
              <div className={menuEntryClasses('^/vm', ['p-3'])}>
                <Monitor className="mr-3 inline-block h-4 w-4" />
                <span>Virtual Machines</span>
              </div>
            </Link>
            <ul>
              {/* {Object.keys(virtualMachines).map((vmName) => (
              <li key={vmName}>
                <Link to={'/vm/show/' + vmName}>{vmName}</Link>
              </li>
            ))} */}
            </ul>
          </div>
          <div>
            <Link to="/storage">
              <div className={menuEntryClasses('^/storage$', ['p-3'])}>
                <Folder className="mr-3 inline-block h-4 w-4" />
                <span>Storage</span>
              </div>
            </Link>
          </div>
          <div>
            <Link to="/network">
              <div className={menuEntryClasses('^/network$', ['p-3'])}>
                <Network className="mr-3 inline-block h-4 w-4" />
                <span>Network</span>
              </div>
            </Link>
          </div>
          <div>
            <Link to="/system">
              <div className={menuEntryClasses('^/system$', ['p-3'])}>
                <Wrench className="mr-3 inline-block h-4 w-4" />
                <span>System</span>
              </div>
            </Link>
            <ul>
              <li>
                <Link to="/system/users">
                  <div
                    className={menuEntryClasses('^/system/users$', [
                      'p-1',
                      'pl-7',
                    ])}
                  >
                    <Users className="mr-3 inline h-4 w-4" />
                    <span>Users</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/system/terminal">
                  <div
                    className={menuEntryClasses('^/system/terminal$', [
                      'p-1',
                      'pl-7',
                    ])}
                  >
                    <TerminalSquare className="mr-3 inline h-4 w-4" />
                    <span>Terminal</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/system/update">
                  <div
                    className={menuEntryClasses('^/system/update$', [
                      'p-1',
                      'pl-7',
                    ])}
                  >
                    <PackageCheck className="mr-3 inline h-4 w-4" />
                    <span>Update</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
    </>
  );
}
