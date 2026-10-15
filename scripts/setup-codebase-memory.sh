#!/usr/bin/env bash
set -euo pipefail

# Pinned official release; no agent-global configuration or credentials are changed.
cbm_version=v0.11.0
cbm_install_dir=${CBM_INSTALL_ROOT:-/workspace/tools/codebase-memory}
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) cbm_platform=linux-amd64 ;;
  Linux-aarch64) cbm_platform=linux-arm64 ;;
  Darwin-x86_64) cbm_platform=darwin-amd64 ;;
  Darwin-arm64) cbm_platform=darwin-arm64 ;;
  *) echo 'Unsupported platform; use the official Codebase Memory installer.' >&2; exit 1 ;;
esac
cbm_archive="codebase-memory-mcp-${cbm_platform}.tar.gz"
cbm_base="https://github.com/DeusData/codebase-memory-mcp/releases/download/${cbm_version}"
cbm_staging=$(mktemp -d)
trap 'rm -rf -- "$cbm_staging"' EXIT
curl --fail --silent --show-error --location "${cbm_base}/checksums.txt" -o "$cbm_staging/checksums.txt"
curl --fail --silent --show-error --location "${cbm_base}/${cbm_archive}" -o "$cbm_staging/$cbm_archive"
python3 - "$cbm_staging" "$cbm_archive" <<'PY'
import hashlib, pathlib, sys, tarfile
folder = pathlib.Path(sys.argv[1])
name = sys.argv[2]
lines = (folder / 'checksums.txt').read_text().splitlines()
expected = next(line.split()[0] for line in lines if line.split()[-1].lstrip('*') == name)
if hashlib.sha256((folder / name).read_bytes()).hexdigest() != expected:
    raise SystemExit('Codebase Memory archive checksum mismatch')
with tarfile.open(folder / name) as archive:
    member = archive.getmember('codebase-memory-mcp')
    if not member.isfile():
        raise SystemExit('Invalid executable in archive')
    (folder / 'codebase-memory-mcp').write_bytes(archive.extractfile(member).read())
print('Official archive SHA-256 verified')
PY
mkdir -p -- "$cbm_install_dir"
if [ -e "$cbm_install_dir/codebase-memory-mcp" ]; then
  if ! cmp -s "$cbm_staging/codebase-memory-mcp" "$cbm_install_dir/codebase-memory-mcp"; then
    echo 'A different executable already exists; choose a separate CBM_INSTALL_ROOT.' >&2
    exit 1
  fi
else
  install -m 755 "$cbm_staging/codebase-memory-mcp" "$cbm_install_dir/codebase-memory-mcp"
fi
cat > "$cbm_install_dir/cbm" <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail
cbm_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
export CBM_CACHE_DIR="${CBM_CACHE_DIR:-$cbm_dir/cache}"
export CBM_ALLOWED_ROOT="${CBM_ALLOWED_ROOT:-/workspace/My-Skin}"
export CBM_WORKERS="${CBM_WORKERS:-2}"
exec "$cbm_dir/codebase-memory-mcp" "$@"
WRAPPER
chmod +x "$cbm_install_dir/cbm"
"$cbm_install_dir/cbm" --version
