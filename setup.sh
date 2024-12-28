#!/bin/bash

keyboard_layout=""
disk=""
time_zone=""
hostname="hyparvisor"
efi=false
help=false
#Argument parsing. (Source: https://stackoverflow.com/a/62616466/5604118)
usage_error () { echo >&2 "$(basename $0): $1"; exit 2; }
assert_arg () { test "$1" != "$EOL" || usage_error "$2 requires an argument"; }
if [ "$#" != 0 ]; then
  EOL=$(printf '\1\1\1\1')
  set -- "$@" "$EOL"
  while [ $1 != "$EOL" ]; do
    opt=$1; shift
    case "$opt" in
      -k|--keyboard) assert_arg "$1" "$opt"
        keyboard_layout="$1"
        shift;;
      -d|--disk) assert_arg "$1" "$opt"
        disk="$1"
        shift;;
      -h|--hostname) assert_arg "$1" "$opt"
        hostname="$1"
        shift;;
      -e|--efi)
        efi=true
        shift;;
      --help)
        help=true
        shift;;
      # Arguments processing. You may remove any unneeded line after the 1st.
      -|''|[!-]*) set -- "$@" "$opt";;                                          # positional argument, rotate to the end
      --*=*)      set -- "${opt%%=*}" "${opt#*=}" "$@";;                        # convert '--name=arg' to '--name' 'arg'
      -[!-]?*)    set -- $(echo "${opt#-}" | sed 's/\(.\)/ -\1/g') "$@";;       # convert '-abc' to '-a' '-b' '-c'
      --)         while [ "$1" != "$EOL" ]; do set -- "$@" "$1"; shift; done;;  # process remaining arguments as positional
      -*)         usage_error "unknown option: '$opt'";;                        # catch misspelled options
      *)          usage_error "this should NEVER happen ($opt)";;               # sanity test for previous patterns

    esac
  done
  shift
fi

if [ "$help" = true ]; then
  echo "setup.sh"
  echo "========"
  echo ""
  echo "Example: bash ./setup.sh -d /dev/sda -k de -h newhostname --efi"
  echo ""
  echo "-k | --keyboard"
  echo "  Define keyboard layout. (e.g. de)"
  echo "-d | --disk"
  echo "  System disk to format (completely)"
  echo "-h | --hostname"
  echo "  Hostname for the new system"
  echo "-e | --efi"
  echo "  Setup with EFI. Normally BIOS is used"
  echo "--help"
  echo "  Print this help and exit"

  exit 0
fi


if [ "$keyboard_layout" != "" ]; then
  echo "Changing keyboard layout to $keyboard_layout"
  loadkeys "$keyboard_layout"
fi

timedatectl set-ntp true

if [ "$disk" != "" ]; then
  echo "Formatting disk $disk"
  if [ "$efi" = true ]; then
    parted -s "${disk}" "mklabel" "gpt" "mkpart" "EFI" "fat32" "1MiB" "1025MiB" "set 1 esp on" "mkpart" "system" "ext4" "1025MiB" "100%"
    mkfs.msdos -F 32 "${disk}1"
    mkfs.ext4 -qF "${disk}2"
    mount "${disk}2" "/mnt"
  else
    parted -s "$disk" "mklabel" "gpt" "mkpart" "system" "ext4" "1MiB" "100%"
    mkfs.ext4 -qF "${disk}1"
    mount "${disk}1" "/mnt"
  fi
fi

if ! mountpoint -q -- "/mnt"; then
  echo >&2 "/mnt is not a mount point!"
  exit 1
fi

pacstrap /mnt base linux linux-firmware nano dhcpcd

#Configure the system
genfstab -U /mnt >> /mnt/etc/fstab


echo "en_US.UTF-8 UTF-8" >> /mnt/etc/locale.gen
echo "LANG=en_US.UTF-8" >> /mnt/etc/locale.conf
if [ "$keyboard_layout" != "" ]; then
  echo "KEYMAP=$keyboard_layout" >> /mnt/etc/vconsole.conf
fi
echo "$hostname" >> /mnt/etc/hostname

echo "#!/bin/bash
locale-gen
pacman --noconfirm -S syslinux gptfdisk iwd
passwd -d root
systemctl enable dhcpcd

" > /mnt/root/setup.sh

if [ "$efi" = true ]; then
  echo "
  mount \"${disk}1\" /boot
  mkdir -p /boot/EFI/syslinux
  pacman --noconfirm -S linux efibootmgr
  cp -r /usr/lib/syslinux/efi64/* /boot/EFI/syslinux
  cp /usr/share/syslinux/syslinux.cfg /boot/EFI/syslinux/syslinux.cfg
  efibootmgr --create --disk \"${disk}\" --part 1 --loader /EFI/syslinux/syslinux.efi --label \"Syslinux\" --unicode
  " >> /mnt/root/setup.sh
else
  echo "
  cp -r /usr/lib/syslinux/* /boot/syslinux/
  syslinux-install_update -i -a -m
  " >> /mnt/root/setup.sh
fi

if [ "$time_zone" != "" ]; then
  echo "
  ln -sf "/usr/share/zoneinfo/$time_zone" /etc/localtime
  hwclock --systohc
  " >> /mnt/root/setup.sh
fi
chmod +x /mnt/root/setup.sh

arch-chroot /mnt ./root/setup.sh
rm /mnt/root/setup.sh

escDisk=$( echo "$disk" | sed -e "s/\//\\\\\//g" )
if [ "$efi" = true ]; then
  sed -i "s/dev\/sda3/${escDisk}2/g" /mnt/boot/EFI/syslinux/syslinux.cfg
  sed -i "s/\.\.\//\.\.\/\.\.\//g" /mnt/boot/EFI/syslinux/syslinux.cfg
else
  sed -i "s/dev\/sda3/${escDisk}1/g" /mnt/boot/syslinux/syslinux.cfg
fi

mkdir /mnt/opt/hyparvisor
curl -Ls https://raw.githubusercontent.com/C-H-F/hyparvisor/master/update.sh >  /mnt/opt/hyparvisor/update.sh
chmod +x /mnt/opt/hyparvisor/update.sh

reboot
