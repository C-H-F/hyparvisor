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
import { FsEntry } from './fs-entry';
import styles from './file-browser.css?inline';
import { LoadingIcon } from '~/components/icons/loading';
type LsFunc = (path: string) => FsEntry[];
type Store = {
  path: string;
  fsEntries: (FsEntry & { action?: 'rename' | 'mkdir' })[];
  back: string[];
  forward: string[];
  pendingRequests: number;
  signal: boolean;
};
export const FileBrowser = component$(
  (props: {
    ls$: PropFunction<LsFunc>;
    mkdir$?: PropFunction<(dir: string) => void>;
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
            &lt;
          </button>
          <button
            disabled={state.forward.length == 0}
            onClick$={() => {
              state.back.push(state.path);
              state.path = state.forward.pop() || '';
            }}
          >
            &gt;
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
            ^
          </button>
          <button
            onClick$={() => {
              refreshPath$();
            }}
          >
            Refresh
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
            <div>
              <a
                href="#"
                style={{ display: props.mkdir$ ? '' : 'none' }}
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
              class="fsEntry"
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
                          await props.mkdir$(state.path + '/' + src.value);
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
              <span class="size">{entry.size}</span>
              <span class="date">{entry.date}</span>
            </div>
          ))}
        </div>
      </>
    );
  }
);
