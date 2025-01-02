#!/bin/bash

mkdir -p /opt/hyparvisor/tmp
curl -L https://github.com/C-H-F/hyparvisor/releases/download/v0.0.2/hyparvisor.tar.gz --output /opt/hyparvisor/tmp/app.tar.gz

exit_status=$?
if [[ $exit_status != 0 ]]; then
  echo "Failed to download update 0.0.2! Check internet connection and try again."
  exit $exit_status
fi

rm -Rf /opt/hyparvisor/app
mkdir -p /opt/hyparvisor/app
tar -xvf /opt/hyparvisor/tmp/app.tar.gz -C /opt/hyparvisor/app

mv /opt/hyparvisor/hyparvisor.db /opt/hyparvisor/hyparvisor_v0.0.1.db

echo "0.0.3" > /etc/hyparvisor/version
/opt/hyparvisor/update.sh
