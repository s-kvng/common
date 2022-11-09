#!/bin/bash
set -e
cd "$(dirname "$0")/.."

scripts/build-all.sh

scripts/test-all.sh

node tools/scripts/publish-all.mjs "$@"

scripts/get-npm-install-commands.sh
