import { $, component$, useClientEffect$, useStore } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import { FileBrowser } from '~/components/file-browser/file-browser';
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
      const cols = line.split(/\s+/g, 9);
      if (cols.length != 9) continue;
      let date = cols[5] + 'T' + cols[6] + cols[7];
      result.push({
        name: cols[8],
        permissions: cols[0],
        type: +cols[1],
        user: cols[2],
        group: cols[3],
        size: +cols[4],
        date,
      });
    }
    return result;
  });
  return (
    <>
      <p>Hello from Storage!</p>
      <FileBrowser
        ls$={ls$}
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
