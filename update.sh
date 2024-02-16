#!/bin/bash

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root!" 1>&2
  exit 1
fi

if [[ -f /etc/hyparvisor/version ]]; then
  version="$(cat /etc/hyparvisor/version)"
else
  version="0.0.0"
fi

update="$(curl -Ls https://raw.githubusercontent.com/C-H-F/hyparvisor/master/scripts/update/version)"
if [[ $version == $update ]]; then
  echo "System is up to date: $version"
  exit 0
fi

echo "Updating $version to version $update..."
curl -Ls https://raw.githubusercontent.com/C-H-F/hyparvisor/master/scripts/update/v$version.sh | bash -s
echo "Update finished."
