# ADR 0001: Set Directives for Global Modifiers

## Status

Overturned by ADR 0003

## Context

Global modifiers like gap spacing and typing style are currently configured by
directive macros such as `Gap` and `SetTypingStyle`. These directives accept
arguments in multiple ways (directive line vs. payload), which is confusing and
creates ambiguity in documentation and usage. We also want a syntax that reads
closer to VHS while still clearly indicating pre-vhs behavior.

## Decision

Adopt a unified "Set" directive syntax for global modifiers:

```
> Set Gap 200ms
> Set Gap none
> Set TypingStyle human high fast
> Set TypingStyle none
```

This establishes:

- "Set" is always a pre-vhs directive (via `>`).
- The modifier name follows `Set` (e.g., `Gap`, `TypingStyle`).
- All arguments live on the directive line; no payload consumption.
- `none` is the explicit reset value for global modifiers.

## Consequences

- The new syntax is clearer and aligns with VHS-style `Set ...` language.
- Existing `Gap` and `SetTypingStyle` directives become legacy syntax.
- The engine needs a single `Set` directive entry point that can route to
  modifier-specific handlers, to avoid macro name collisions.

## Required Changes (Outline)

Core/Engine:

- Introduce a `Set` directive handler in core or via a new built-in pack.
- Add a registry for modifier setters so packs can register handlers:
  `registerSetter("Gap", fn)` / `registerSetter("TypingStyle", fn)`.

Builtins:

- Replace `Gap` directive macro with a `Set Gap ...` handler.
- Keep legacy `Gap` as a compatibility alias (optional) with a warning.

Typing Styles:

- Replace `SetTypingStyle` directive macro with `Set TypingStyle ...`.
- Remove payload-based configuration (no `$1` consumption).
- Keep legacy `SetTypingStyle` as a compatibility alias (optional) with a warning.

Docs:

- Update README and REFERENCE examples to use `> Set Gap ...` and
  `> Set TypingStyle ...`.
- Clarify that these are global modifiers with explicit `none` resets.

Tests:

- Add coverage for `Set` directive routing.
- Update existing typing styles and gap tests to use the new syntax.
- Add deprecation tests if legacy aliases are retained.
