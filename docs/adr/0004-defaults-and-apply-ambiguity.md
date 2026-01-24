# ADR 0004: Defaults and Apply/Macro Ambiguity (Problem Statement)

## Status

Draft (problem only)

## Context

Pre-vhs supports global modifiers via `> Apply <Modifier> ...` (e.g., `Gap`,
`TypingStyle`) and macros like `WordGap`/`SentenceGap` that take explicit
arguments. There is intentionally minimal validation, so malformed or unknown
directives may pass through until VHS fails. `Gap` is expected to be one of the
most common features (a basic ergonomic win), not an advanced concept.

There is also a desire to allow defaults via configuration. This implies a
stable notion of "default values" for modifiers, but macros do not have obvious
defaults and cannot be configured globally in the same way.

## Problem

1. It is not self-evident which verbs are modifiers with defaults vs. macros
   requiring explicit values. Users can easily assume `> Apply WordGap` or
   `> Apply Gap` has a sensible default, but today a missing argument effectively
   means "no gap" and is not obvious.

2. Users should not have to read the full reference to use basic features.
   The current design requires knowing the modifier list, the `Apply` syntax,
   and the reset rules (`None`/`Default`) to avoid confusion.

3. Allowing defaults in config risks implying that _all_ transforms can have
   defaults, which is not true for macros. This blurs the boundary between
   modifiers and macros, and makes it harder for users to predict behavior.

4. With no validation, typos or misuse (e.g., `Apply WordGap`, missing values)
   fail silently, which reinforces confusion around defaults and expected
   behavior.

## Open Questions

- Should `Apply` require explicit values (error/warn on missing args)?
- Should modifiers have explicit, documented defaults beyond `None`/`Default`?
- Should `Apply` be restricted to a known modifier list?
- Should we provide a first-class way to define macro defaults (or just aliases)?
- How do we make "basic usage" discoverable without reading the full reference?
