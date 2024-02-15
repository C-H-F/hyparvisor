#!/bin/bash

mkdir /etc/hyparvisor
echo "0.0.1" > /etc/hyparvisor/version

pacman --noconfirm -S archlinux-keyring
pacman-key --init
pacman-key --populate
pacman --noconfirm -Syu
pacman --noconfirm -Rdd iptables
pacman --noconfirm -S qemu-base libvirt iptables-nft dnsmasq dmidecode bridge-utils openbsd-netcat openssh screen curl tar

systemctl enable libvirtd
systemctl start libvirtd

curl -fsSL https://moonrepo.dev/install/proto.sh | bash

systemctl enable sshd
systemctl start sshd

/opt/hyparvisor/update.sh
