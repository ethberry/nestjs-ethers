#!/usr/bin/env bash

echo -e "\033[34mRenaming...\n\033[0m";

set -e # this will cause the shell to exit immediately if any command exits with a nonzero exit value.

#find . -name '*obfuscated.js' | xargs -I{} rename -f 's/-obfuscated//' {}

find . -name '*obfuscated.js' -exec bash -c 'mv "$1" "${1/-obfuscated/}"' _ {} \;
find . -name '*obfuscated.*.js' -exec bash -c 'mv -v "$1" "${1/-obfuscated/}"' _ {} \;
