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

## Building

This repository manages all its tools via proto. Proto ensures that the correct version of every tool is used in order to bild the application.

**Installing proto on Debian Linux and derivatives:**

The required versions of node, npm, bun, act can simply be installed using [proto](https://moonrepo.dev/docs/proto/install).

```
sudo apt install git unzip gzip xz-utils
curl -fsSL https://moonrepo.dev/install/proto.sh | bash
```

For _building the backend_ you also need:

```
sudo apt install build-essential make python3
```

**Checking out the source:**

```
git clone https://github.com/C-H-F/hyparvisor.git
```

**Install dependencies:**

```
cd hyparvisor
proto use
```

**Building the frontend:**

```
cd application/frontend
bun install --frozen-lockfile
npm run build
cd ../..
```

**Building the backend:**

```
cd application/backend
bun install --frozen-lockfile
npm run build
cd ../..
```
