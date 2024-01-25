import { ReactNode, useEffect, useState } from 'react';
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
import { Label } from '../shadcn/ui/label';
import { Button } from '../shadcn/ui/button';
import { useAsyncEffect } from '@/lib/react-utils';
import { client } from '@/trpc-client';
import ComboBox from '../combobox';

type OperatingSystem = Awaited<
  ReturnType<typeof client.vm.listOperatingSystems.query>
>[0];
export function OsConfigurationDialog(props: {
  children: ReactNode;
  //osDetails: MemoryDetails;
  //onSave?: (memoryDetails: MemoryDetails) => void;
}) {
  const [operatingSystems, setOperatingSystems] = useState<OperatingSystem[]>(
    []
  );
  useAsyncEffect(async function () {
    const operatingSystems = await client.vm.listOperatingSystems.query();
    setOperatingSystems(operatingSystems);
  }, []);
  return (
    <Dialog>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>OS Settings</DialogTitle>
          <DialogDescription>
            Adjust the OS settings of this virtual machine.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label>OS</Label>
          <ComboBox
            values={operatingSystems.reduce(
              (prev, curr) => {
                prev[curr.id] = curr.name;
                return prev;
              },
              {} as Record<string, string>
            )}
          ></ComboBox>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" className="ml-3">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="default" className="ml-3">
              Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
