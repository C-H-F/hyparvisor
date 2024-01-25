import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import './standard-layout.css';
import { Toaster } from '../shadcn/ui/toaster';

export default function StandardLayout(props: { children: ReactNode }) {
  return (
    <div className="standard-layout mt-0">
      <span id="start"></span>
      <Link className="jumplabel" to="#main">
        Skip to main content.
      </Link>
      <Sidebar />
      <Header />
      <main id="main" className="m-0 p-5 sm:ml-[var(--nav-size)]">
        {props.children}
      </main>
      <footer className="mt-10 p-5 text-gray-400 dark:text-gray-400 sm:ml-[var(--nav-size)]">
        Hyparvisor is free and open source software provided under the AGPL-3.0
        license.{' '}
        <Link to="/license" className="text-blue-500 dark:text-blue-800">
          Read more about it.
        </Link>
      </footer>

      <Link className="jumplabel" to="#start">
        Jump to start of page.
      </Link>
      <Toaster />
    </div>
  );
}
