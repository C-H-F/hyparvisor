import { ReactNode } from 'react';
import { SortableList } from '.';
import { nanoid } from 'nanoid';

interface Props<T> {
  items: T[];
  onChange(items: T[]): void;
  renderItem(item: T, index: string): ReactNode;
}

export function SortableArrayList<T>(props: Props<T>) {
  const items = props.items.map((item, index) => ({
    id: index + ':' + nanoid(),
    value: item,
  }));
  return (
    <SortableList
      items={items}
      onChange={(items) => {
        props.onChange(items.map((x) => x.value));
      }}
      renderItem={(item) => props.renderItem(item.value, item.id)}
    ></SortableList>
  );
}
