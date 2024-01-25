import StandardLayout from '@/components/layout/standard-layout';

export default function License() {
  return (
    <StandardLayout>
      <h2>License</h2>
      <p>
        This software is licensed (if not written differently for some
        libraries) under the AGPL-3.0 license. For more information about
        AGPL-3.0 see the{' '}
        <a
          href="https://github.com/C-H-F/hyparvisor/blob/main/LICENSE"
          target="_blank"
          className="text-blue-500 dark:text-blue-800"
        >
          license information
        </a>
        .
      </p>

      <p>
        The source code is available on{' '}
        <a
          href="https://github.com/C-H-F/hyparvisor/"
          target="_blank"
          className="text-blue-500 dark:text-blue-800"
        >
          GitHub
        </a>
        .
      </p>

      <p>
        API is available at{' '}
        <a href="/api" className="text-blue-500 dark:text-blue-800">
          API
        </a>
        .
      </p>

      <p>
        noVNC (located in public/novnc of the frontend) is licensed under{' '}
        <a
          href="https://github.com/novnc/noVNC/blob/d4197932d60fbfef8da37a979ab95850dc5b6d43/LICENSE.txt"
          target="_blank"
          className="text-blue-500 dark:text-blue-800"
        >
          MPL 2.0 (Mozilla Public License 2.0)
        </a>
        .
      </p>
      <p>
        Tux:{' '}
        <a
          href="https://commons.wikimedia.org/wiki/File:Tux.svg"
          carget="_blank"
          className="text-blue-500 dark:text-blue-800"
        >
          lewing@isc.tamu.edu Larry Ewing and The GIMP
        </a>
        , CC0, via Wikimedia Commons
      </p>
    </StandardLayout>
  );
}
