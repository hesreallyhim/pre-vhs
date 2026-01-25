# Scripts

## examples.js

Regenerates and verifies example outputs for `.tape.pre` files.

Usage:

```sh
npm run examples:check   # verify example outputs are current
npm run examples:regen   # update .tape.expected files
```

## refactor-walkthrough.js

Regenerates walkthrough tapes and diffs them against the baseline.

Usage:

```sh
node scripts/refactor-walkthrough.js
```
