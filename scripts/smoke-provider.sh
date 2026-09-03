#!/bin/sh

set -eu

if [ "$#" -ne 1 ]; then
    echo "usage: smoke-provider.sh <provider-executable>" >&2
    exit 2
fi

provider=$1
stdout=$(mktemp)
stderr=$(mktemp)
pid=

cleanup() {
    if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
        kill "${pid}" 2>/dev/null || true
        wait "${pid}" 2>/dev/null || true
    fi
    rm -f "${stdout}" "${stderr}"
}
trap cleanup EXIT HUP INT TERM

"${provider}" >"${stdout}" 2>"${stderr}" &
pid=$!

attempt=0
while [ "${attempt}" -lt 200 ]; do
    if [ -s "${stdout}" ]; then
        port=$(head -n 1 "${stdout}" | tr -d '\r')
        case "${port}" in
            ''|*[!0-9]*) ;;
            *)
                if [ "${port}" -ge 1 ] && [ "${port}" -le 65535 ]; then
                    printf 'provider started on port %s\n' "${port}"
                    if [ -s "${stderr}" ]; then
                        echo "provider stderr:" >&2
                        cat "${stderr}" >&2
                    fi
                    exit 0
                fi
                ;;
        esac
    fi

    if ! kill -0 "${pid}" 2>/dev/null; then
        wait "${pid}" || status=$?
        echo "provider exited before printing a valid port (status ${status:-0})" >&2
        cat "${stdout}" >&2
        cat "${stderr}" >&2
        exit 1
    fi

    sleep 0.1
    attempt=$((attempt + 1))
done

echo "provider did not print a valid port within 20 seconds" >&2
cat "${stdout}" >&2
cat "${stderr}" >&2
exit 1
