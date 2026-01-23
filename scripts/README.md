# Scripts

## examples.js

Regenerates and verifies example outputs for `.tape.pre` files.

Usage:

```sh
npm run examples:check   # verify examples/docs outputs are current
npm run examples:regen   # update .tape.expected files
```

## render-social-png.sh

Converts the social SVG to PNG using a local SVG renderer.

Usage:

```sh
bash docs/render-social-png.sh docs/pre-vhs-social.svg docs/pre-vhs-social.png
```

Notes:

- Requires one of: `rsvg-convert`, `inkscape`, or ImageMagick (`magick`/`convert`).
