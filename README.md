# Hyparvisor

A **work in progress** web interface for managing libvirt on Arch Linux.

## Installation

You can directly install Hyparvisor through your Archlinux installation disk by invoking the following command. To change the keyboardlayout before entering the main command you can use loadkeys followed by your keyboard layout (e.g. `loadkeys de`).

```bash
curl -Ls https://raw.githubusercontent.com/C-H-F/hyparvisor/main/setup.sh | bash -s -- -d /dev/sda -k de
```

This installs a minimal Archlinux system on your entire drive /dev/sda using a german keyboard-layout. Just replace the drive and keyboard layout as needed.

After the system reboots ensure that it boots from your hard drive.
Call `/opt/hyparvisor/update.sh` to install the application. (A permanent internet connection is required while this script is running!)

## More

- [Screenshots](./docs/screenshots/)
