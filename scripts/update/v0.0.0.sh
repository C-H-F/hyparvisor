#!/bin/bash

mkdir /etc/hyparvisor
echo "0.0.1" > /etc/hyparvisor/version

pacman --noconfirm -S archlinux-keyring
pacman-key --init
pacman-key --populate
pacman --noconfirm -Syu
pacman --noconfirm -Rdd iptables
pacman --noconfirm -S qemu-base libvirt iptables-nft dnsmasq dmidecode bridge-utils openbsd-netcat

systemctl enable libvirtd
systemctl start libvirtd

# Proto
pacman --noconfirm -S which git
curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s -- --no-profile --yes

# Hyparvisor
pacman --noconfirm -S openssh screen curl tar expect libosinfo

rm -Rf /opt/hyparvisor/app
mkdir /opt/hyparvisor/app
rm -Rf /opt/hyparvisor/tmp
mkdir /opt/hyparvisor/tmp
curl -L https://github.com/C-H-F/hyparvisor/releases/download/v0.0.0/hyparvisor.tar.gz --output /opt/hyparvisor/tmp/app.tar.gz
tar -xvf /opt/hyparvisor/tmp/app.tar.gz -C /opt/hyparvisor/app
rm -Rf /opt/hyparvisor/tmp

pushd /opt/hyparvisor/app && ~/.proto/bin/proto use && popd

curl -L https://raw.githubusercontent.com/C-H-F/hyparvisor/master/scripts/update/res/v0.0.0/hyparvisor.sh --output /opt/hyparvisor/hyparvisor.sh
chmod +x /opt/hyparvisor/hyparvisor.sh

curl -L https://raw.githubusercontent.com/C-H-F/hyparvisor/master/scripts/update/res/v0.0.0/hyparvisor.service --output /etc/systemd/system/hyparvisor.service

systemctl enable hyparvisor
systemctl start hyparvisor

/opt/hyparvisor/update.sh
