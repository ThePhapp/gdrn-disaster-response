#!/usr/bin/env bash
# Run in a disposable Ubuntu/Debian notebook or container as root.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends openjdk-21-jdk-headless postgresql postgresql-postgis python3 python3-psutil curl ca-certificates git unzip
K6_VERSION=1.6.1
ARCH=$(dpkg --print-architecture)
case "$ARCH" in amd64|arm64) ;; *) echo "Unsupported architecture: $ARCH"; exit 1;; esac
TMP=$(mktemp -d)
trap 'rm -rf -- "$TMP"' EXIT
ASSET="k6-v${K6_VERSION}-linux-${ARCH}.tar.gz"
URL="https://github.com/grafana/k6/releases/download/v${K6_VERSION}"
curl -fLsS --retry 3 "$URL/$ASSET" -o "$TMP/$ASSET"
curl -fLsS --retry 3 "$URL/k6-v${K6_VERSION}-checksums.txt" -o "$TMP/checksums.txt"
(cd "$TMP"; grep " $ASSET\$" checksums.txt | sha256sum --check --strict)
tar -xzf "$TMP/$ASSET" -C "$TMP"
install -m 755 "$TMP/k6-v${K6_VERSION}-linux-${ARCH}/k6" /usr/local/bin/k6
java -version
k6 version
