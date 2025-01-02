#!/bin/bash

# Nothing to do. Directly use v0.0.2

echo "0.0.2" > /etc/hyparvisor/version
/opt/hyparvisor/update.sh
