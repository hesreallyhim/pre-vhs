# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-01-24

### Breaking

- Remove config file/CLI config support; pack loading is now header-based with `Pack`.
- First-party packs are no longer auto-loaded; use `Pack builtins|typingStyles|emojiShortcuts|probe` before `Use` or `Apply`.
- Replace `Set` directives with `> Apply ...` for global modifiers (e.g., `Gap`, `TypingStyle`).

### Added

- `Pack` header directive with first-party name resolution and local JS pack loading.
- `EachLine` macro to map a token template over `$*` payload lines.
- `WordGap`/`SentenceGap` helpers and updated gap semantics docs.
- Typing demo tapes/gifs plus snapshot tests.
- ADRs for directive and defaults decisions; new `docs/CONTRIBUTING.md` and `docs/CODE_OF_CONDUCT.md`.
- CI coverage reporting (lcov/codecov) and `.node-version`.

### Changed

- Typing styles: new tuning for human/sloppy pacing, per-character sloppy output, and Apply now affects raw `Type` lines and `EachLine`.
- Gap applies between directive tokens only (pre-expansion).
- Docs and assets reorganized under `docs/`; reference updated to match new pack loading model.
- Pre-commit hook now runs `npm run test:ci`.

### Fixed

- Example/golden outputs and typing demo snapshots updated for the new behavior.

### Chore

- Dependency bumps and packaging metadata cleanup.

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
