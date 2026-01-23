#!/usr/bin/env bash
set -euo pipefail

input="${1:-pre-vhs-social.svg}"
output="${2:-pre-vhs-social.png}"
width="${3:-1280}"
height="${4:-640}"

if command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -w "$width" -h "$height" -o "$output" "$input"
  exit 0
fi

if command -v inkscape >/dev/null 2>&1; then
  inkscape "$input" \
    --export-type=png \
    --export-filename="$output" \
    --export-width="$width" \
    --export-height="$height"
  exit 0
fi

if command -v magick >/dev/null 2>&1; then
  magick -background none "$input" -resize "${width}x${height}!" "$output"
  exit 0
fi

if command -v convert >/dev/null 2>&1; then
  convert -background none "$input" -resize "${width}x${height}!" "$output"
  exit 0
fi

echo "No SVG renderer found. Install one of: rsvg-convert, inkscape, or ImageMagick (magick/convert)." >&2
exit 1
