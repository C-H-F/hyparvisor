import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/ui/dialog';
import { Label } from '@/components/shadcn/ui/label';
import { Input } from '@/components/shadcn/ui/input';
import { Button } from '@/components/shadcn/ui/button';
import { ReactNode, useState } from 'react';

export type CpuDetails = {
  vcpuCount: number;
};
export function CpuConfigurationDialog(props: {
  children: ReactNode;
  cpuDetails: CpuDetails;
  onSave?: (cpuDetails: CpuDetails) => void;
}) {
  const [vcpuCount, setVcpuCount] = useState(props.cpuDetails.vcpuCount);
  const onClose = () => {
    setVcpuCount(props.cpuDetails.vcpuCount);
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
          <DialogTitle>CPU Settings</DialogTitle>
          <DialogDescription>
            Adjust the CPU settings of this virtual machine.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label>Cores</Label>
          <Input
            type="number"
            value={vcpuCount}
            onChange={(e) => setVcpuCount(+e.target.value)}
          />
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
                props.onSave({ vcpuCount });
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
