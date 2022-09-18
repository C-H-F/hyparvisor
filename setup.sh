#!/bin/bash

keyboard_layout=""
disk=""
time_zone=""
hostname="hyparvisor"

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

if [ "$keyboard_layout" != "" ]; then
	echo "Changing keyboard layout to $keyboard_layout"
	loadkeys "$keyboard_layout"
fi

timedatectl set-ntp true

if [ "$disk" != "" ]; then
	echo "Formatting disk $disk"
	parted -s "$disk" "mklabel" "gpt" "mkpart" "system" "ext4" "1MiB" "100%"
	mkfs.ext4 -qF "${disk}1"
	mount "${disk}1" "/mnt"
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
pacman --noconfirm -S syslinux gptfdisk
syslinux-install_update -i -a -m
passwd -d root
systemctl enable dhcpcd

" > /mnt/root/setup.sh
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
sed -i "s/dev\/sda3/${escDisk}1/g" /mnt/boot/syslinux/syslinux.cfg

curl -Ls https://raw.githubusercontent.com/C-H-F/hyparvisor/main/hyparvisor.sh >  /mnt/root/hyparvisor.sh
chmod +x /mnt/root/hyparvisor.sh

reboot
