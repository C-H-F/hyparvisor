type Fstype = 'ext4' | 'iso9660' | string;
type Percentage = `${number}%`;

export type BlockDevice = {
  name: string;
  fstype: null | Fstype;
  fsver: null | string;
  label: null;
  uuid: null | string;
  fsavail: null | number;
  'fsuse%': null | Percentage;
  mountpoints: (null | string)[];
  children: BlockDevice[];
};
