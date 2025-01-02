import { useState } from 'react';
import FileBrowser from './file-browser/file-browser';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './shadcn/ui/dialog';
import { download, ls, mkdir, mkQcow2, mv, rm, touch } from '@/pages/storage';
import { Input } from './shadcn/ui/input';
import { Button } from './shadcn/ui/button';
import { combinePath } from '@/lib/utils';
import { createRoot } from 'react-dom/client';

export function FileSelector(props: {
  onSelection: (path: string | null) => void;
  filters?: Record<string, string>; //regex matching file. e.g. (\.jpg$)|(/$)
  defaultPath?: string;
}) {
  const [fileSelectorVisible, setFileSelectorVisible] = useState(true);
  const [selection, setSelection] = useState<string[]>([]);

  const [filter] = useState(Object.keys(props.filters ?? {})[0] ?? '');
  //TODO: Use onSelection instead of onNavigate.
  //TODO: Change display of selected value by combining path and selection filename afterwards...
  //TODO: Implement filter possibilities (Regex) --> Toggle button on top.
  function onOpenChange(visible: boolean) {
    setFileSelectorVisible(visible);
    if (!visible) props.onSelection(null);
  }
  return (
    <Dialog open={fileSelectorVisible} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80%]">
        <DialogHeader>
          <DialogTitle>Select a file...</DialogTitle>
        </DialogHeader>
        <div className="h-[70vh] overflow-hidden">
          <FileBrowser
            filter={filter}
            defaultPath={props.defaultPath}
            ls={ls}
            rm={rm}
            mv={mv}
            touch={touch}
            mkQcow2={mkQcow2}
            mkdir={(path: string) => mkdir(path)}
            download={download}
            onSelect={(selections) =>
              setSelection(selections.map((x) => combinePath(x.dir, x.name)))
            }
            onOpen={(selection) => {
              if (!props.onSelection) return;
              props.onSelection(combinePath(selection.dir, selection.name));
            }}
          />
        </div>
        <span>{props.filters?.[filter]}</span>
        <DialogFooter>
          <div className="flex w-full gap-2">
            <Input value={selection[0]} />
            <DialogClose asChild>
              <Button
                onClick={() => {
                  props.onSelection(selection[0]);
                }}
              >
                Select
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                onClick={() => {
                  props.onSelection(null);
                }}
              >
                Cancel
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  // existing code
}

export async function selectFile(
  props: { path?: string; filters?: Record<string, string> } = {}
) {
  await new Promise((cb) => setTimeout(cb, 0)); //Set timeout to avoid problems with dismissable layer.
  return await new Promise<string | null>((cb) => {
    const wrapper = document.createElement('div');
    (document.getElementById('appwrap') ?? document.body).append(wrapper);
    const root = createRoot(wrapper);
    function onSelection(path: string | null) {
      root.unmount();
      wrapper.remove();
      cb(path);
    }
    root.render(
      <FileSelector
        onSelection={onSelection}
        filters={props.filters}
        defaultPath={props.path}
      ></FileSelector>
    );
  });
}
