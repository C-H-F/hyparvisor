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

pacman --noconfirm -S which git
curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s -- --no-profile --yes


rm -Rf /opt/hyparvisor/app
mkdir /opt/hyparvisor/app
rm -Rf /opt/hyparvisor/tmp
mkdir /opt/hyparvisor/tmp
curl -L https://github.com/C-H-F/hyparvisor/releases/download/v0.0.0/hyparvisor.tar.gz --output /opt/hyparvisor/tmp/app.tar.gz
tar -xvf /opt/hyparvisor/tmp/app.tar.gz -C /opt/hyparvisor/app
rm -Rf /opt/hyparvisor/tmp

pushd /opt/hyparvisor/app && ~/.proto/bin/proto use && popd


/opt/hyparvisor/update.sh
