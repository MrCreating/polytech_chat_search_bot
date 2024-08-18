#!/bin/sh

set -o errexit
set -o nounset
set -o pipefail

npm install
npm start
