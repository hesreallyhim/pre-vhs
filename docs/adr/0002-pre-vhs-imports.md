# ADR 0002: Importing/Including pre-vhs Scripts

## Status

Proposed

## Context

We want to decide whether pre-vhs should support importing other `.tape.pre`
files (scenes) beyond the existing `Use` mechanism for macros/packs. The goal
would be cleaner composition for large tapes without losing predictability.

This decision intersects with global modifiers (Gap, TypingStyle) and
transforms, which are currently global in scope.

## Options

### Option A: No pre-vhs imports (status quo)

- Keep only macro/packs via `Use`.
- Large scripts remain in a single file or are composed by macros.

Pros:

- Simplest behavior and mental model.
- No new global-state issues.

Cons:

- Harder to modularize complex tapes.

---

### Option B: Pre-vhs include that compiles subfiles to VHS and splices output

Behavior:

- Read an included `.tape.pre`, run pre-vhs on it, then splice the resulting
  VHS lines into the parent output.

Pros:

- No leakage of directives/macros/transforms between files.
- Mirrors VHS `Source` semantics (parse, validate, filter).

Cons:

- Included file cannot reuse macros from the parent.
- Global modifiers do not carry across the boundary.
- Must filter `Output`/`Source` in the included output.
- Error reporting needs file/line context.

---

### Option C: Header-only imports (macros only)

Behavior:

- `UseFile ./scene.pre` imports only header macros from the file.

Pros:

- Avoids global state leakage.
- Enables reuse of macro definitions across files.

Cons:

- Does not modularize body content.
- Header/body parsing becomes more complex.

---

### Option D: Inline include with explicit scoping

Behavior:

- `Include` inlines the body of another `.tape.pre` file.
- `IncludeScoped` saves/restores global modifier state.

Pros:

- Supports real scene modularization.
- Explicit scoping keeps global state predictable.

Cons:

- Complex semantics for header/body handling.
- Needs cycle detection and path resolution.

## Comparison: VHS `Source`

VHS `Source`:

- Reads and parses the source tape.
- Rejects nested `Source`.
- Filters `Output` to avoid overriding the parent output.
- Propagates errors from the source file.

If pre-vhs adds imports, Option B most closely matches this approach.

## Open Questions

- Should included files be allowed to modify global modifiers at all?
- Should imports be header-only, body-only, or both?
- How should paths be resolved (relative to caller vs repo root)?
- Should `Output`/`Require` be forbidden or filtered in included files?
- What cycle-detection/`IncludeOnce` semantics should exist?

## Decision (Deferred)

We will defer the decision while focusing on Gap/TypingStyle semantics.
