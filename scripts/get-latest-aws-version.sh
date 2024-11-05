#!/usr/bin/env bash

set -euo pipefail

pulumi plugin install resource aws
pulumi plugin ls --json | jq -r '.[]|select(.name=="aws")|.version'
