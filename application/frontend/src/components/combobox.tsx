import { ReactNode, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/ui/popover';
import { Button } from './shadcn/ui/button';
import { ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
} from '@/components/shadcn/ui/command';
import { CommandGroup } from 'cmdk';

export type ComboBoxModel = Record<string, string | ReactNode>;
export default function ComboBox(props: {
  kindName?: string;
  selected?: string | null;
  onSelect?: (id: string) => void;
  values: ComboBoxModel;
  trigger?: ReactNode;
}) {
  const values: ComboBoxModel = props.values;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(props.selected);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {props.trigger ? (
          props.trigger
        ) : (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value
              ? values[value]
              : `${props.kindName ?? 'Bitte'} auswählen...`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Command>
          <CommandInput
            placeholder={`${props.kindName ?? 'Eintrag'} suchen...`}
            className="h-9"
          />
          <CommandEmpty>
            {props.kindName ?? 'Eintrag'} nicht gefunden.
          </CommandEmpty>
          <CommandGroup className="max-h-96 overflow-auto">
            {Object.keys(values).map((key) => {
              const value = values[key];
              return (
                <CommandItem
                  key={key}
                  value={key}
                  onSelect={(currVal) => {
                    setValue(currVal);
                    props.onSelect?.(currVal);
                    //setOpen(false);
                  }}
                >
                  {value}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
