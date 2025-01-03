import { useEffect, useState } from 'react';
//import { FsEntry } from '../../lib/fs-entry';
import bytes from 'bytes-iec';
import './file-browser.css';
import { range } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  DownloadCloud,
  File,
  Folder,
  HardDriveIcon,
  LayoutGrid,
  LayoutList,
  RefreshCw,
} from 'lucide-react';
import { Input } from '../shadcn/ui/input';
import { Button } from '../shadcn/ui/button';
import { Toggle } from '../shadcn/ui/toggle';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../shadcn/ui/context-menu';
import { Progress } from '../shadcn/ui/progress';
import { selectSize } from '../size-selector';

type FsType = 'dir' | 'file';
export type FsEntry = {
  type: string;
  name: string;
  alias?: string | null;
  user: number;
  group: number;
  size: number;
  dir: string;
  dateAccess: string;
  dateModify: string;
  dateChange: string;
  dateBirth: string;
  permissions: number;
  targetSize?: number;
};

type FsDummy = {
  type: string;
  name: string;
  dir: string;
  apply: (name: string) => Promise<void>;
} & Partial<FsEntry>;

type LsFunc = (path: string) => Promise<FsEntry[]>;
type RmFunc = (path: string) => Promise<void>;
type MkdirFunc = (path: string) => Promise<void>;
type MkQcow2Func = (path: string, size: number) => Promise<void>;
type MvFunc = (src: string, dst: string) => Promise<void>;
type TouchFunc = (path: string) => Promise<void>;
type DownloadFunc = (url: string, dst: string) => void;
type Layout = 'icon' | 'detail';

function typeCompare(a: string, b: string) {
  if (a == 'dir') return -1;
  if (a == b) return 0;
  return 1;
}

export default function FileBrowser(props: {
  filter?: string;
  defaultPath?: string;
  ls: LsFunc;
  rm?: RmFunc;
  mv?: MvFunc;
  mkdir?: MkdirFunc;
  touch?: TouchFunc;
  mkQcow2?: MkQcow2Func;
  download?: DownloadFunc;
  onNavigate?: (path: string) => void;
  onSelect?: (path: FsEntry[]) => void;
  onOpen?: (path: FsEntry) => void;
}) {
  const [path, setPath] = useState(props.defaultPath ?? '/');
  const [back, setBack] = useState<string[]>([]);
  const [forward, setForward] = useState<string[]>([]);
  const [pendingRequests] = useState(0);
  const [layout, setLayout] = useState<Layout>('icon');
  const [fsEntries, setFsEntries] = useState<FsEntry[]>([]);
  const [fsDummy, setFsDummy] = useState<FsDummy | null>(null);
  const [selection, setSelection] = useState<number[]>([]);
  const pushPath = function (newPath: string) {
    if (newPath == '') newPath = '/';
    setBack([...back, path]);
    setForward([]);
    setPath(newPath);
    setFsDummy(null);
  };
  const refreshPath = async function () {
    const entries = await props.ls(path);
    entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => typeCompare(a.type, b.type));
    setFsEntries(entries ?? []);
    setFsDummy(null);
  };
  const getFsTypeName = function (entry: FsEntry | FsDummy) {
    if (entry.type === 'dir') return 'directory';
    return 'file';
  };
  const getFsTypeIcon = function (entry: FsEntry | FsDummy) {
    const type = getFsTypeName(entry);
    if (type == 'directory') return <Folder />;
    return <File />;
  };
  useEffect(() => {
    refreshPath();
    if (props.onNavigate) props.onNavigate(path);
  }, [path]);
  useEffect(() => {
    if (!props.onSelect) return;
    const max = selection.reduce((x, y) => (x > y ? x : y), 0);
    if (fsEntries.length <= max) return;
    props.onSelect(selection.map((x) => fsEntries[x]));
  }, [selection, path, fsEntries]);

  async function focusInputRef(input: HTMLInputElement) {
    if (!input || input === document.activeElement) return;
    await new Promise((cb) => setTimeout(cb, 100));
    input.select();
    input.focus();
  }

  function makeEntryImpl(type: FsType, apply: (name: string) => Promise<void>) {
    let name = type == 'dir' ? 'New Folder' : 'New File';
    for (let i = 1; ; i++) {
      const currName = name + (i == 1 ? '' : ' ' + i);
      if (fsEntries.findIndex((x) => x.name == currName) >= 0) continue;
      name = currName;
      break;
    }
    setFsDummy({
      name,
      type,
      dir: path,
      apply: async (...args) => {
        await apply(...args);
        setFsDummy(null);
        await refreshPath();
      },
    });
  }
  function makeEntry(type: FsType) {
    return new Promise<string>((cb) =>
      makeEntryImpl(type, async (name) => cb(name))
    );
  }

  return (
    <div className="fileBrowser flex max-h-[100%] flex-col">
      <div className="flex flex-row items-center gap-2">
        <Button
          disabled={back.length == 0}
          variant="outline"
          size="sm"
          onClick={() => {
            setForward([...forward, path]);
            setPath(back.pop() || '');
            setBack([...back]);
          }}
        >
          <ArrowLeft />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={forward.length == 0}
          onClick={() => {
            setBack([...back, path]);
            setPath(forward.pop() || '');
            setForward([...forward]);
          }}
        >
          <ArrowRight />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            let tmpPath = path;
            while (tmpPath.endsWith('/'))
              tmpPath = tmpPath.substring(0, tmpPath.length - 1);
            const idx = tmpPath.lastIndexOf('/');
            if (idx < 0) return;
            pushPath(tmpPath.substring(0, idx));
          }}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refreshPath();
          }}
        >
          <RefreshCw />
        </Button>
        <Input
          type="text"
          value={path}
          onChange={(evt) => {
            pushPath(evt.target.value);
          }}
        />

        <Toggle
          variant="outline"
          aria-label="Toggle Icons"
          pressed={layout == 'icon'}
          onPressedChange={(val) => {
            if (val) setLayout('icon');
          }}
        >
          <LayoutGrid className="mr-2" />
          Icons
        </Toggle>
        <Toggle
          variant="outline"
          aria-label="Toggle Details"
          pressed={layout == 'detail'}
          onPressedChange={(val) => {
            if (val) setLayout('detail');
          }}
        >
          <LayoutList className="mr-2" />
          Details
        </Toggle>
      </div>
      <ContextMenu key="contextMenu/root">
        <ContextMenuTrigger className="flex-shrink overflow-auto">
          <div
            onClick={() => {
              setSelection([]);
            }}
            className={[
              'browser',
              layout,
              pendingRequests ? 'fetching' : 'ready',
              'bg-card',
              'mt-2',
              'p-1',
            ].join(' ')}
          >
            {fsEntries
              .map((entry, index) => ({ entry, index }))
              .filter(
                (x) =>
                  new RegExp(props.filter ?? '').test(x.entry.name) ||
                  x.entry.type === 'dir'
              )
              .map((x) => {
                const entry = x.entry;
                const index = x.index;
                return (
                  <ContextMenu key={'contextMenu/' + index}>
                    <ContextMenuTrigger>
                      <div
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.ctrlKey) {
                            setSelection([...selection, index]);
                            return;
                          }
                          if (e.shiftKey && selection.length > 0) {
                            const mainSelection =
                              selection[selection.length - 1];
                            const elements = range(mainSelection, index);
                            setSelection([...elements, index, mainSelection]);
                            return;
                          }
                          setSelection([index]);
                        }}
                        onDoubleClick={() => {
                          if (entry.type !== 'dir') {
                            if (props.onOpen) props.onOpen(entry);
                            return;
                          }
                          let temp = path;
                          if (!temp.endsWith('/')) temp += '/';
                          temp += entry.name;
                          pushPath(temp);
                        }}
                        className={[
                          'fsEntry',
                          selection.indexOf(index) >= 0 ? 'selected' : '',
                        ].join(' ')}
                      >
                        {getFsTypeIcon(entry)}
                        {entry.targetSize != null ? (
                          <Progress
                            className="absolute"
                            value={
                              entry.targetSize == 0
                                ? -1
                                : (100 / entry.targetSize) * entry.size
                            }
                          />
                        ) : (
                          ''
                        )}

                        <span className="name">
                          {entry.alias ?? entry.name}
                        </span>

                        <span className="permissions">{entry.permissions}</span>
                        <span className="type">{entry.type}</span>
                        <span className="user">{entry.user}</span>
                        <span className="group">{entry.group}</span>
                        <span className="size">
                          {bytes.format(entry.size, {
                            mode: 'binary',
                          })}
                        </span>
                        <span className="date">
                          {entry.dateChange ?? new Date().toISOString()}
                        </span>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem>Cut</ContextMenuItem>
                      <ContextMenuItem>Copy</ContextMenuItem>
                      {props.rm ? (
                        <ContextMenuItem
                          onClick={async () => {
                            //TODO: Use custom confirm dialog.
                            if (
                              !props.rm ||
                              !confirm(
                                'Are you sure you want to delete ' +
                                  (entry.alias ?? entry.name) +
                                  '?'
                              )
                            )
                              return;
                            await props.rm(entry.dir + '/' + entry.name);
                            refreshPath();
                          }}
                        >
                          Delete
                        </ContextMenuItem>
                      ) : (
                        ''
                      )}
                      {props.mv ? (
                        <ContextMenuItem
                          onClick={async () => {
                            setFsEntries([
                              ...fsEntries.filter((x) => x !== entry),
                            ]);
                            setFsDummy({
                              ...entry,
                              apply: async (name) => {
                                if (!props.mv) return;
                                await props.mv(
                                  entry.dir + '/' + entry.name,
                                  entry.dir + '/' + name
                                );
                                await refreshPath();
                              },
                            });
                          }}
                        >
                          Rename
                        </ContextMenuItem>
                      ) : (
                        ''
                      )}
                      <ContextMenuItem>Properties</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            {fsDummy ? (
              <div key="/DUMMY/" className="fsEntry">
                {getFsTypeIcon(fsDummy)}

                <Input
                  type="text"
                  className="name"
                  value={fsDummy.name}
                  ref={focusInputRef}
                  onChange={(evt) => {
                    setFsDummy({ ...fsDummy, name: evt.target.value });
                  }}
                  onKeyUp={(evt) => {
                    if (
                      evt.code == 'Enter' &&
                      'value' in evt.target &&
                      typeof evt.target.value === 'string'
                    )
                      fsDummy.apply(evt.target.value);
                  }}
                />
              </div>
            ) : (
              ''
            )}
            <div className="flex-grow">&nbsp;</div>
          </div>
          <div>&nbsp;</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              refreshPath();
            }}
          >
            Refresh
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>New</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {props.mkdir ? (
                <ContextMenuItem
                  onClick={async () => {
                    if (!props.mkdir) return;
                    const name = await makeEntry('dir');
                    await props.mkdir(path + '/' + name);
                  }}
                >
                  <Folder className="m-2 h-4 w-4" /> Folder
                </ContextMenuItem>
              ) : (
                ''
              )}
              {props.touch ? (
                <ContextMenuItem
                  onClick={async () => {
                    if (!props.touch) return;
                    const name = await makeEntry('file');
                    await props.touch(path + '/' + name);
                  }}
                >
                  <File className="m-2 h-4 w-4" />
                  Empty File
                </ContextMenuItem>
              ) : (
                ''
              )}
              {props.mkQcow2 && (
                <ContextMenuItem
                  onClick={async () => {
                    if (!props.mkQcow2) return;
                    let name = await makeEntry('file');
                    const size = await selectSize({
                      title: 'Disk Size',
                      content: 'Select the size of the new .qcow disk.',
                      defaultSize: 4 * 1024 * 1024 * 1024,
                    });
                    if (!size) return;
                    await props.mkQcow2(path + '/' + name, size);
                    refreshPath();
                  }}
                >
                  <HardDriveIcon className="m-2 h-4 w-4" />
                  qcow2 Disk
                </ContextMenuItem>
              )}
              {props.download ? (
                <ContextMenuItem
                  onClick={async () => {
                    if (!props.download) return;
                    const name = await makeEntry('file');
                    const url = prompt('Enter source URL');
                    if (!url) return;
                    await props.download(url, path + '/' + name);
                  }}
                >
                  <DownloadCloud className="m-2 h-4 w-4" />
                  Download
                </ContextMenuItem>
              ) : (
                ''
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem>Properties</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
  // existing code
}
