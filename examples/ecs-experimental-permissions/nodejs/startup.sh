#!/bin/sh
set -eu

# ECS, not the application, must pull the private image, fetch/decrypt both secret sources,
# and load the environment file. The default application task role has no AWS permissions.
test "$SECRETS_MANAGER_VALUE" = 'secret-injection-ok'
test "$PINNED_SECRET_VALUE" = 'secret-injection-ok'
test "$SSM_VALUE" = 'ssm-injection-ok'
test "$ENV_FILE_VALUE" = 'environment-file-ok'
printf '%s\n' "$SUCCESS_MARKER"

# Stay running only after every injected value has been validated.
exec sleep infinity
