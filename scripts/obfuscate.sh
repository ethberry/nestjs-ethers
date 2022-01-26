#!/usr/bin/env bash

echo -e "\033[34mObfuscating...\n\033[0m";

set -e # this will cause the shell to exit immediately if any command exits with a nonzero exit value.

javascript-obfuscator ./ --config jsobsrc.json --exclude 'node_modules/'

