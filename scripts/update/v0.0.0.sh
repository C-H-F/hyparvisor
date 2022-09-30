#!/bin/bash

mkdir /etc/hyparvisor
echo "0.0.1" > /etc/hyparvisor/version

pacman --noconfirm -Sy
pacman --noconfirm -S archlinux-keyring
pacman --noconfirm -Syu
pacman --noconfirm -Rdd iptables
pacman --noconfirm -S qemu-base libvirt iptables-nft dnsmasq dmidecode bridge-utils openbsd-netcat sudo openssh

systemctl enable libvirtd
systemctl start libvirtd

#Allow system upgrade
groupadd sysupgrade
echo "
%sysupgrade ALL=(ALL) NOPASSWD: /usr/bin/pacman -Syu
%sysupgrade ALL=(ALL) NOPASSWD: /usr/bin/pacman --noconfirm -Syu
%sysupgrade ALL=(ALL) NOPASSWD: /usr/bin/pacman --noconfirm -S archlinux-keyring
%sudo ALL=(ALL:ALL) ALL
" >> /etc/sudoers

#Allow SSH
groupadd sshusers
echo "AllowGroups sshusers" >> /etc/ssh/ssd_config

useradd admin -m -G sudo,sshusers,kvm,libvirt-qemu,libvirt
chown -R :libvirt-qemu /home/admin
chmod g+rwx /home/admin

systemctl enable sshd
systemctl start sshd
