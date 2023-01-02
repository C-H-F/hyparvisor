import {
  $,
  component$,
  PropFunction,
  useClientEffect$,
  useSignal,
  useStore,
  useStylesScoped$,
  useTask$,
  useTaskQrl,
} from '@builder.io/qwik';
import bytes from 'bytes-iec';
import { FsEntry } from './fs-entry';
import styles from './file-browser.css?inline';
import { GoNextIcon } from '~/components/icons/goNext';
import { GoPreviousIcon } from '~/components/icons/goPrevious';
import { GoUpIcon } from '~/components/icons/goUp';
import { RefreshIcon } from '~/components/icons/refresh';
type LsFunc = (path: string) => FsEntry[];
type Store = {
  path: string;
  fsEntries: (FsEntry & { action?: 'rename' | 'mkdir' })[];
  back: string[];
  forward: string[];
  pendingRequests: number;
  signal: boolean;
  selection: string[];
};

export const normalizeAbsolutePath = (path: string) => {
  const parts = path.split('/');
  const result: string[] = [];
  for (const part of parts) {
    if (part == '') continue;
    if (part == '.') continue;
    if (part == '..') {
      result.pop();
      continue;
    }
    result.push(part);
  }
  return '/' + result.join('/');
};
export const joinPath = (...args: string[]) => {
  const tmp = args.join('/');
  if (tmp.startsWith('/')) normalizeAbsolutePath(tmp);
  return tmp; //Relative path
};
export const FileBrowser = component$(
  (props: {
    ls$: PropFunction<LsFunc>;
    mkdir$?: PropFunction<(dir: string) => string | void>;
    rm$?: PropFunction<(dir: string[]) => string | void>;
    download$?: PropFunction<(url: string, dest: string) => string | void>;
    getIcon$?: PropFunction<(path: string, file: FsEntry) => string>;
  }) => {
    useStylesScoped$(styles);
    const nameInput = useSignal<HTMLInputElement>();
    const state = useStore<Store>({
      path: '',
      fsEntries: [],
      back: [],
      forward: [],
      pendingRequests: 0,
      signal: false,
      selection: [],
    });
    const refreshPath$ = $(async (path: string | null = null) => {
      state.pendingRequests++;
      state.fsEntries = await props.ls$(path || state.path || '/');
      state.pendingRequests--;
    });
    useTask$(async ({ track }) => {
      const path = track(() => state.path);
      refreshPath$(path);
    });
    useClientEffect$(({ track }) => {
      track(() => state.signal);
      if (!state.signal) return;
      const input = nameInput.value;
      if (!input) return;
      input.select();
      input.focus();
      state.signal = false;
    });
    useClientEffect$(async () => {
      state.path = '/';
    });
    const pushPath$ = $((path: string) => {
      state.back.push(state.path);
      state.forward = [];
      state.path = path;
    });
    return (
      <>
        <div class="menu">
          <button
            disabled={state.back.length == 0}
            onClick$={() => {
              state.forward.push(state.path);
              state.path = state.back.pop() || '';
            }}
          >
            <GoPreviousIcon />
          </button>
          <button
            disabled={state.forward.length == 0}
            onClick$={() => {
              state.back.push(state.path);
              state.path = state.forward.pop() || '';
            }}
          >
            <GoNextIcon />
          </button>
          <button
            onClick$={() => {
              let path = state.path;
              while (path.endsWith('/'))
                path = path.substring(0, path.length - 1);
              const idx = path.lastIndexOf('/');
              if (idx < 0) return;
              pushPath$(path.substring(0, idx));
            }}
          >
            <GoUpIcon />
          </button>
          <button
            onClick$={() => {
              refreshPath$();
            }}
          >
            <RefreshIcon />
          </button>
          <input
            type="text"
            value={state.path}
            onBlur$={(evt) => {
              pushPath$(evt.target.value);
            }}
          />
        </div>
        <div
          class={[
            'browser',
            'icon',
            state.pendingRequests ? 'fetching' : 'ready',
          ]}
          preventdefault:contextmenu
          onContextMenu$={(evt) => {
            const contextMenu =
              document.querySelector<HTMLDivElement>('.contextmenu');
            if (!contextMenu) return;
            const clear = (evt: MouseEvent) => {
              window.removeEventListener('mouseup', clear);
              contextMenu.style.display = 'none';
            };
            window.addEventListener('mouseup', clear);
            contextMenu.style.top = evt.pageY + 'px';
            contextMenu.style.left = evt.pageX + 'px';
            contextMenu.style.display = 'block';
          }}
        >
          <div class="contextmenu">
            <div style={{ display: props.mkdir$ ? '' : 'none' }}>
              <a
                href="#"
                preventdefault:click
                onClick$={() => {
                  console.log('Creating new Folder...');
                  state.fsEntries = [
                    ...state.fsEntries,
                    {
                      name: 'New Folder',
                      permissions: 'd---------',
                      type: 0,
                      user: '~',
                      group: '~',
                      size: 0,
                      date: 'TODO',
                      action: 'mkdir',
                      link: '',
                    },
                  ];
                  state.signal = true;
                }}
              >
                New Folder
              </a>
            </div>
            <div>
              New File
              <div>
                <div>
                  <a
                    href="#"
                    preventdefault:click
                    onClick$={async () => {
                      if (!props.download$) return;
                      const url = prompt('Download URL:');
                      if (!url) return;
                      await props.download$(
                        url,
                        normalizeAbsolutePath(state.path)
                      );
                      refreshPath$();
                    }}
                  >
                    Download from URL
                  </a>
                </div>
              </div>
            </div>
            <div
              style={{
                display: props.rm$ && state.selection.length ? '' : 'none',
              }}
            >
              <a
                href="#"
                preventdefault:click
                onClick$={async () => {
                  if (!props.rm$) return;
                  const error = await props.rm$(
                    state.selection.map((x) => joinPath(state.path, x))
                  );
                  if (error) console.error(error); //TODO: Show toast instead.
                  await refreshPath$();
                }}
              >
                Delete
              </a>
            </div>
          </div>
          {state.fsEntries.map((entry, index) => (
            <div
              key={index}
              onDblClick$={async () => {
                let path = state.path;
                if (!path.endsWith('/')) path += '/';
                path += entry.name;
                pushPath$(path);
              }}
              onPointerUp$={(evt) => {
                if (evt.button === 2) {
                  if (state.selection.indexOf(entry.name) >= 0) return;
                }
                const newSelection: string[] = [];
                let add = true;
                if (evt.ctrlKey) {
                  newSelection.push(...state.selection);
                  const pos = newSelection.indexOf(entry.name);
                  if (pos >= 0) newSelection.splice(pos, 1);
                  else newSelection.push(entry.name);
                } else if (evt.shiftKey) {
                  //TODO: Range Select
                } else {
                  newSelection.push(entry.name);
                }
                state.selection = newSelection;
              }}
              class={[
                'fsEntry',
                state.selection.indexOf(entry.name) >= 0 ? 'selected' : '',
              ]}
            >
              <img
                src="/loading.svg"
                onLoad$={async (evt) => {
                  const img = evt.target as HTMLImageElement;
                  if (!props.getIcon$) return;
                  img.src = await props.getIcon$(state.path, entry);
                }}
              />
              {['mkdir', 'rename'].indexOf(entry.action || '') >= 0 ? (
                <input
                  class="name"
                  type="text"
                  value={entry.name}
                  ref={nameInput}
                  onKeyDown$={async (evt) => {
                    const src = evt.target as HTMLInputElement;
                    let refresh = true;
                    try {
                      if (evt.key === 'Enter') {
                        if (entry.action === 'mkdir' && props.mkdir$) {
                          const error = await props.mkdir$(
                            joinPath(state.path, src.value)
                          );
                          if (error) console.error(error); //TODO: Show toast instead.
                          return;
                        }
                        console.warn('Unknown action', entry.action);
                      }
                      if (evt.key === 'Escape') {
                        return;
                      }
                      refresh = false;
                    } finally {
                      if (refresh) refreshPath$();
                    }
                  }}
                />
              ) : (
                <span class="name">{entry.name}</span>
              )}
              <span class="permissions">{entry.permissions}</span>
              <span class="type">{entry.type}</span>
              <span class="user">{entry.user}</span>
              <span class="group">{entry.group}</span>
              <span class="size">
                {bytes.format(entry.size, { mode: 'binary' })}
              </span>
              <span class="date">{entry.date}</span>
            </div>
          ))}
        </div>
      </>
    );
  }
);
