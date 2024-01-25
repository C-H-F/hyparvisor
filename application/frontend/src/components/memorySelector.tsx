import { Input } from '@/components/shadcn/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
} from '@/components/shadcn/ui/select';
import { SelectTrigger, SelectValue } from '@radix-ui/react-select';
import { useState } from 'react';
import { endsWithNumber, equalsIgnoreCase } from '@/lib/utils';

export type MemorySelectorProps = {
  value: number;
  onChange: (bytes: number) => void;
};

type unit = 'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB';
const units: unit[] = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];

function fromBytes(
  value: number,
  exponentOrUnit: number | unit,
  digits: number | null = null
) {
  const exponent =
    typeof exponentOrUnit === 'number'
      ? exponentOrUnit
      : units.indexOf(exponentOrUnit);

  let result = value / Math.pow(1024, exponent);
  if (digits !== null) {
    const factor = Math.pow(10, digits);
    result = Math.floor(result * factor + 0.5) / factor;
  }
  return result;
}
function toBytes(value: number, exponentOrUnit: number | unit) {
  const exponent =
    typeof exponentOrUnit === 'number'
      ? exponentOrUnit
      : units.indexOf(exponentOrUnit);
  let result = value * Math.pow(1024, exponent);
  return result;
}

export default function MemorySelector(props: MemorySelectorProps) {
  let exponent = 2;
  const onChange = props.onChange;
  const [bytes, setBytes] = useState(+props.value);
  const [unit, setUnit] = useState<unit>(units[exponent]);
  const [value, setValue] = useState(fromBytes(bytes, exponent, 2) + '');

  function notifyChange(bytes: number) {
    if (!onChange) return;
    onChange(bytes);
  }

  function changeUnit(unit: unit) {
    const exponent = units.indexOf(unit);
    setUnit(unit);
    setValue(fromBytes(bytes, exponent, 2) + '');
    //It makes no sense to change the unit of 0 bytes.
    //Instead notify the default value after changing the unit without text.
    //Value already prepared in changeValue.
    if (value === '') notifyChange(bytes);
  }
  function changeValue(value: string) {
    if (value == '') {
      setValue('');
      setBytes(props.value);
      notifyChange(0);
      return;
    }
    let u = unit;
    if (!endsWithNumber(value))
      for (let i = 0; i < units.length; i++)
        if (equalsIgnoreCase(units[i].charAt(0), value.slice(-1))) {
          setUnit(units[i]);
          u = units[i];
          break;
        }

    value = value.replaceAll(/[^0-9.e]/g, '');
    setValue(value);
    const bytes = toBytes(+value, u);
    setBytes(bytes);
    notifyChange(bytes);
  }

  return (
    <div className="flex flex-row">
      <Input
        type="number"
        value={value}
        onChange={(e) => changeValue(e.target.value)}
      />
      <Select value={unit} onValueChange={(x) => changeUnit(x as unit)}>
        <SelectTrigger className="mx-3">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {units.map((u) => (
            <SelectItem value={u} key={u}>
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
