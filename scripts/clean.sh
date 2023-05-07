#!/usr/bin/env bash

echo -e "\033[34mCleaning...\n\033[0m";

set -e # this will cause the shell to exit immediately if any command exits with a nonzero exit value.

find . -type d -name "dist" | xargs rm -rf
find . -type d -name "node_modules" | xargs rm -rf
find . -type d -name "coverage" | xargs rm -rf
find . -type f -name "package-lock.json" | xargs rm -rf
find . -type f -name "yarn.lock" | xargs rm -rf

find . -type d -name ".openzeppelin" | xargs rm -rf
find . -type f -name "artifacts" | xargs rm -rf
find . -type f -name "cache" | xargs rm -rf
find . -type f -name "typechain" | xargs rm -rf
find . -type f -name "typechain-types" | xargs rm -rf
