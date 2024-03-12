import FileBrowser, { FsEntry } from '@/components/file-browser/file-browser';
import StandardLayout from '@/components/layout/standard-layout';
import { client } from '@/trpc-client';
import { useEffect, useState } from 'react';

export async function ls(path: string) {
  const entries: FsEntry[] = await client.file.ls.query({ path });
  entries.forEach((x) => {
    const regex = /^(.*)\.(\d+)\.hyparvisor_download$/;
    const result = regex.exec(x.name);
    if (!result || result.length != 3) return;
    const filename = result[1];
    const size = result[2];
    x.alias = filename;
    x.targetSize = +size;
  });
  return entries;
}
export async function rm(path: string) {
  await client.file.rm.mutate({ path });
}
export async function mkdir(path: string) {
  await client.file.mkdir.mutate({ path });
}
export async function mv(src: string, dst: string) {
  await client.file.mv.mutate({ source: src, destination: dst });
}
export async function touch(path: string) {
  await client.file.touch.mutate({ path });
}
export async function download(url: string, destination: string) {
  await client.file.download.mutate({ source: url, destination });
}

export default function Storage() {
  const [path, setPath] = useState(
    window.location.hash.length > 1 ? window.location.hash.substring(1) : '/'
  );
  useEffect(() => {
    window.location.hash = path;
  }, [path]);
  return (
    <StandardLayout>
      <p>Storage</p>
      <FileBrowser
        defaultPath={path}
        onNavigate={(path) => setPath(path)}
        ls={ls}
        rm={rm}
        mv={mv}
        touch={touch}
        mkdir={(path: string) => mkdir(path)}
        download={download}
      />
    </StandardLayout>
  );
  // existing code
}
