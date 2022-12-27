import {
  $,
  component$,
  PropFunction,
  useClientEffect$,
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
  fsEntries: FsEntry[];
  back: string[];
  forward: string[];
  pendingRequests: number;
};
export const FileBrowser = component$(
  (props: {
    ls$: PropFunction<LsFunc>;
    getIcon$?: PropFunction<(path: string, file: FsEntry) => string>;
  }) => {
    useStylesScoped$(styles);
    const state = useStore<Store>({
      path: '',
      fsEntries: [],
      back: [],
      forward: [],
    });
    const refreshPath$ = $(async (path: string) => {
      state.fsEntries = await props.ls$(path || '/');
    });
    useTask$(async ({ track }) => {
      const path = track(() => state.path);
      refreshPath$(path);
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
        <div>
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
              refreshPath$(state.path);
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
        <div class="icon">
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
              <span class="name">{entry.name}</span>
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
