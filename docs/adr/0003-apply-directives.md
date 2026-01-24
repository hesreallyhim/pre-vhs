# ADR 0003: Apply Directives for Global Modifiers

## Status

Proposed

## Context

Global modifiers like gap spacing and typing style are currently configured by
directive macros such as `Gap` and `SetTypingStyle`. These directives accept
arguments in multiple ways (directive line vs. payload), which is confusing and
creates ambiguity in documentation and usage. We want a syntax that clearly
signals pre-vhs behavior while avoiding VHS command collisions.

We also need to be explicit about the difference between macros and transforms:

- Macros are explicit, per-directive expansions that consume payload lines.
- Transforms are phase-based rewrite hooks that can affect all output lines.

## Decision

Adopt a unified "Apply" directive syntax for global modifiers:

```
> Apply Gap 200ms
> Apply Gap none
> Apply TypingStyle human high fast
> Apply TypingStyle none
```

This establishes:

- "Apply" is always a pre-vhs directive (via `>`).
- The modifier name follows `Apply` (e.g., `Gap`, `TypingStyle`).
- All arguments live on the directive line; no payload consumption.
- A value is required; use `none` (or `default`) to reset.
- `Apply` is always-on (no `Use` required).
- VHS commands are reserved; users cannot define macros with VHS command names.
- Gap is applied at pre-expansion (between directive tokens only), not
  between macro-expanded output lines.

Macro vs Transform rule:

- Use macros for payload-driven behavior (e.g., `TypeAndEnter $*`,
  `WordGap 200ms $1`, `SentenceGap 500ms $1`).
- Use transforms only for global, cross-cutting rewrites (e.g., TypingStyle).

## Consequences

- The new syntax is clearer and avoids VHS `Set ...` collisions.
- Existing `Gap` and `SetTypingStyle` directives become legacy syntax.
- The engine needs a single `Apply` directive entry point that can route to
  modifier-specific handlers, to avoid macro name collisions.
- This is a breaking change; acceptable due to low adoption (under 100 downloads).
- Do not implement runtime deprecations; only note legacy usage in the changelog.
- Fast-follow: add a warning when a body line starts with `Apply ...` without
  a directive marker (`>`).
- Gap no longer inserts sleeps between macro-expanded commands; macros own
  their internal pacing.
- WordGap/SentenceGap are macros (not global modifiers); they only affect
  the payload they are applied to.

## Required Changes (Outline)

Core/Engine:

- Introduce an `Apply` directive handler in core or via a new built-in pack.
- Add a registry for modifier setters so packs can register handlers:
  `registerSetter("Gap", fn)` / `registerSetter("TypingStyle", fn)`.
- Ensure `Apply` does not require `Use` (always-on directive).
- Parsing: `Apply <ModifierName> <args...>` (no payload consumption).
- Validate that `Apply` has at least one argument after the modifier name.

Builtins:

- Replace `Gap` directive macro with an `Apply Gap ...` handler.
- Remove legacy `Gap` usage entirely (breaking change).
- Move Gap behavior to a pre-expand transform (directive token level).
- Add a `TypeAndEnter` macro that consumes `$*` and emits `Type` + `Enter` per line.
- Add `WordGap` and `SentenceGap` macros that expand payload into `Type` + `Sleep` sequences.

Typing Styles:

- Replace `SetTypingStyle` directive macro with `Apply TypingStyle ...`.
- Remove payload-based configuration (no `$1` consumption).
- Remove legacy `SetTypingStyle` usage entirely (breaking change).

Docs:

- Update README and REFERENCE examples to use `> Apply Gap ...` and
  `> Apply TypingStyle ...`.
- Clarify that these are global modifiers with explicit `none` resets.
- Update any walkthroughs or examples that use `Gap` or `SetTypingStyle`.

Tests:

- Add coverage for `Apply` directive routing.
- Update existing typing styles and gap tests to use the new syntax.
- Add tests that `Apply` rejects missing values.
- Update gap tests to assert no sleeps are inserted between macro-expanded
  commands.
- Add tests for `TypeAndEnter $*` and for `WordGap`/`SentenceGap` payload expansion.
