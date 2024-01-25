import { ReactNode, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../shadcn/ui/dialog';
import { Label } from '@/components/shadcn/ui/label';
import { Button } from '@/components/shadcn/ui/button';
import MemorySelector from '../memorySelector';
export type MemoryDetails = {
  memorySize: number;
};
export function MemoryConfigurationDialog(props: {
  children: ReactNode;
  memoryDetails: MemoryDetails;
  onSave?: (memoryDetails: MemoryDetails) => void;
}) {
  const [memorySize, setMemorySize] = useState(props.memoryDetails.memorySize);
  const onClose = () => {
    setMemorySize(props.memoryDetails.memorySize);
  };
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Memory Settings</DialogTitle>
          <DialogDescription>
            Adjust the memory settings of this virtual machine.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label>Memory</Label>
          <MemorySelector value={memorySize} onChange={setMemorySize} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" className="ml-3">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="default"
              className="ml-3"
              onClick={() => {
                if (!props.onSave) return;
                props.onSave({ memorySize });
              }}
            >
              Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
