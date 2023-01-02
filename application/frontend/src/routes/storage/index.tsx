import { $, component$, useClientEffect$, useStore } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import {
  FileBrowser,
  normalizeAbsolutePath,
} from '~/components/file-browser/file-browser';
import { getBlockDevices, runCommand } from '~/logic';
import { BlockDevice } from '~/models/BlockDevice';
import { FsEntry } from '~/components/file-browser/fs-entry';
type Store = { blockDevices: BlockDevice[] | null };

export default component$(() => {
  const state = useStore<Store>({
    blockDevices: null,
  });
  useClientEffect$(async () => {
    const blockDevices = await getBlockDevices();
    state.blockDevices = blockDevices;
  });
  const ls$ = $(async (path: string) => {
    const ans = await runCommand('ls -la --full-time ' + JSON.stringify(path));
    const result: FsEntry[] = [];
    if (!ans.stdout.length) return result;
    const lines = ans.stdout.split('\n');
    for (let i = 1; i < lines.length; i++) {
      //Ignore first line (Total)
      const line = lines[i];
      const regex =
        /(\S*)\s+(\S*)\s+(\S*)\s+(\S*)\s+(\S*)\s+(\S*)\s+(\S*)\s+(\S*)\s+(.*)/g;
      const cols = regex.exec(line);
      if (!cols || cols.length != 10) continue;
      let date = cols[6] + 'T' + cols[7] + cols[8];
      const entry: FsEntry = {
        name: cols[9],
        permissions: cols[1],
        type: +cols[2],
        user: cols[3],
        group: cols[4],
        size: +cols[5],
        date,
        link: '',
      };
      if (entry.name == '.' || entry.name == '..') continue;
      const idx = entry.name.indexOf(' -> ');
      if (idx >= 0) {
        entry.name = entry.name.substring(0, idx);
        entry.link = entry.name.substring(idx + ' -> '.length);
      }
      result.push(entry);
    }
    return result;
  });
  const mkdir$ = $(async (path: string) => {
    const ans = await runCommand(
      'mkdir ' + JSON.stringify(normalizeAbsolutePath(path))
    );
    return ans.stdout + ans.stderr;
  });
  const rm$ = $(async (path: string[]) => {
    if (path.length == 0) return '';
    const message =
      path.length == 1
        ? 'Are you sure you want to delte this file?'
        : 'Are you sure you want to delete these ' + path.length + ' files?';
    if (!confirm(message)) return '';
    const args = path
      .map((x) => JSON.stringify(normalizeAbsolutePath(x)))
      .join(' ');
    const ans = await runCommand('rm -R ' + args);
    const msg = ans.stdout + ans.stderr;
    return msg;
  });
  return (
    <>
      <p>Hello from Storage!</p>
      <FileBrowser
        ls$={ls$}
        mkdir$={mkdir$}
        rm$={rm$}
        getIcon$={(path: string, entry: FsEntry): string => {
          if (entry.permissions.startsWith('d')) return '/directory.svg';
          return '/file.svg';
        }}
      />
    </>
  );
});

export const head: DocumentHead = {
  title: 'Storage',
};
