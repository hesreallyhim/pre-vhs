# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-01-23

### Added

- Snapshot coverage for docs typing demo tapes.
- Committed generated docs typing demo `.tape` files for README assets.

### Changed

- `examples:check`/`examples:regen` now target only `/examples`.
- Docs scripts README updated to match examples-only coverage.
- Stop ignoring `docs/*.tape` in `.gitignore`.

## [1.0.0] - 2026-01-16

### Added

- CLI support for explicit input/output file paths.
- `$*` greedy multi-line argument syntax.
- CI workflow for lint/test.
- Dependabot config for npm updates.
- Expanded test coverage for CLI, parser, helpers, examples, and integration cases.
- Test coverage increased to ~95%.

### Changed

- Modularized `src/index.js` into focused modules.
- Pack path resolution relative to config file.
- Updated docs (README, REFERENCE, examples, badges, publishing notes).
- Dependency updates for vitest and coverage tooling.
- Security policy and license updates.

### Fixed

- `package.json` bin entry.

### Chore

- Banner image update and formatting/lint prep.
