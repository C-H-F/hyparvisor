import { component$ } from '@builder.io/qwik';
import { BlockDevice } from '~/models/BlockDevice';
import bytes from 'bytes-iec';

export const Disk = component$((props: { device: BlockDevice }) => {
  return (
    <li>
      {props.device.name} {props.device.fstype}
      {props.device.label}
      {bytes.format(props.device.fsavail ?? 0)}
      <ul>
        {props.device.children?.map((device, index) => (
          <Disk device={device} />
        ))}
      </ul>
    </li>
  );
});

export default Disk;
