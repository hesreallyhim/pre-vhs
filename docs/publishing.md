# Publishing to npm (streamlined, via GitHub)

This repo is set up to publish automatically when you push a semver tag like `v0.2.0`.

## One-time setup

1. Create an npm automation token with publish rights.
2. In GitHub repo settings → Secrets → Actions, add `NPM_TOKEN` with that token.
3. Ensure `package.json` version matches the tag you plan to push.

## Release workflow

1. Bump version in `package.json` (e.g., `npm version patch`).
2. Commit and push to main (CI runs lint/test).
3. Tag the commit: `git tag v0.x.y && git push origin v0.x.y`.
   - The GitHub Action at `.github/workflows/publish.yml` will:
     - `npm ci`
     - `npm run lint`
     - `npm test`
     - `npm publish` (with `NODE_AUTH_TOKEN` from secrets)
4. Verify on npm: https://www.npmjs.com/package/pre-vhs

## Local dry-run (optional)

- `npm run pre-release` to lint/test/coverage locally.
- `npm publish --dry-run` to inspect the publish payload.

Notes:

- The workflow only triggers on tags matching `v*`. Non-tag pushes won’t publish.
- Coverage/format/lint are enforced via scripts and the Husky pre-commit hook.\*\*\*
