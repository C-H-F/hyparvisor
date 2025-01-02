import { createRoot } from 'react-dom/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './shadcn/ui/dialog';
import { ReactNode, useState } from 'react';
import MemorySelector from './memorySelector';
import { Button } from './shadcn/ui/button';

export default function SizeSelector(props: {
  title: string;
  onSelection: (size: number | null) => void;
  defaultSize?: number;
  children?: ReactNode;
}) {
  const [sizeSelectorVisible, setSizeSelectorVisible] = useState(true);
  const [value, setValue] = useState<number>(props.defaultSize ?? 0);
  function onOpenChange(visible: boolean) {
    setSizeSelectorVisible(visible);
    if (!visible) props.onSelection(null);
  }
  return (
    <Dialog open={sizeSelectorVisible} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        {props.children}
        <MemorySelector onChange={setValue} value={value} />
        <div className="flex justify-end space-x-2">
          <Button
            variant="secondary"
            onClick={() => {
              setSizeSelectorVisible(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={() => {
              props.onSelection(value);
            }}
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export async function selectSize(
  props: {
    title?: string;
    defaultSize?: number;
    content?: ReactNode;
  } = {}
) {
  await new Promise((cb) => setTimeout(cb, 0)); //Set timeout to avoid problems with dismissable layer.
  return await new Promise<number | null>((cb) => {
    const wrapper = document.createElement('div');
    (document.getElementById('appwrap') ?? document.body).append(wrapper);
    const root = createRoot(wrapper);
    function onSelection(size: number | null) {
      root.unmount();
      wrapper.remove();
      cb(size);
    }
    root.render(
      <SizeSelector
        title={props.title ?? 'Select Size'}
        onSelection={onSelection}
        defaultSize={props.defaultSize ?? 0}
      >
        {props.content}
      </SizeSelector>
    );
  });
}
