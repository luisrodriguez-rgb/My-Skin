#!/usr/bin/env bash
set -euo pipefail
brand_project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$brand_project_root"
brand_export_dir="$(mktemp -d)"
trap 'rm -rf -- "$brand_export_dir"' EXIT
pnpm exec tauri icon public/brand/myskin-mark.png --output "$brand_export_dir/native" --ios-color '#111A20'
pnpm exec tauri icon public/brand/myskin-mark.png --output "$brand_export_dir/web" \
  --png 16 --png 32 --png 64 --png 128 --png 180 --png 192 --png 512
while IFS= read -r brand_icon_path; do
  brand_relative_path="${brand_icon_path#src-tauri/icons/}"
  if [[ ! -f "$brand_export_dir/native/$brand_relative_path" ]]; then
    echo "Falta la exportación: $brand_relative_path" >&2
    exit 1
  fi
  cp -- "$brand_export_dir/native/$brand_relative_path" "$brand_icon_path"
done < <(git ls-files src-tauri/icons)
mkdir -p public/brand
for brand_icon_size in 16 32 64 128 180 192 512; do
  cp -- "$brand_export_dir/web/${brand_icon_size}x${brand_icon_size}.png" "public/brand/myskin-mark-${brand_icon_size}.png"
done
cp -- "$brand_export_dir/native/icon.ico" public/favicon.ico
