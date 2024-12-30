import { createBrowserRouter } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import Error from './pages/error';
import Terminal from './pages/system/terminal';
import 'xterm/css/xterm.css';
import Update from './pages/system/update';
import License from './pages/license';
import Storage from './pages/storage';
import Vm from './pages/vm';
import ShowVm from './pages/vm/show/vm';
import XmlVm from './pages/vm/xml/vm';
import { Networks } from './pages/network';
import { Users } from './pages/system/users';
import { Password } from './pages/system/users/password';
export function getRouter() {
  return createBrowserRouter([
    { path: '/', element: <Dashboard />, errorElement: <Error /> },
    { path: '/license', element: <License /> },
    { path: '/storage', element: <Storage /> },
    { path: '/system/terminal', element: <Terminal /> },
    { path: '/system/update', element: <Update /> },
    { path: '/system/users', element: <Users /> },
    { path: '/vm', element: <Vm /> },
    { path: '/vm/show/:id', element: <ShowVm /> },
    { path: '/vm/xml/:id', element: <XmlVm /> },
    { path: '/vm/create', element: <ShowVm /> },
    { path: '/network', element: <Networks /> },
    { path: '/system/users/:id', element: <Users /> },
    { path: '/system/users/:id/password', element: <Password /> },
  ]);
}
