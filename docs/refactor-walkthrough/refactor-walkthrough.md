# Pre-VHS Refactor Walkthrough

In this folder we start with a lengthy VHS `.tape` file (`baseline.tape`) which illustrates some of the inherent verbosity in crafting a non-trivial VHS script. We start from a long raw tape and progressively refactor it with pre-vhs features, keeping steps 1-5 output-equivalent to the baseline (if you were to run `pre-vhs` on the `tape.pre` files you would get always the same output). Step 6, finally, is an enhancement pass to add some more "life" and intentionally changes the output.

## Files

- docs/refactor-walkthrough/baseline.tape (raw baseline)
- docs/refactor-walkthrough/step-1-basics.tape.pre -> docs/refactor-walkthrough/step-1-basics.tape
- docs/refactor-walkthrough/step-2-alias-gap.tape.pre -> docs/refactor-walkthrough/step-2-alias-gap.tape
- docs/refactor-walkthrough/step-3-recursive-aliases.tape.pre -> docs/refactor-walkthrough/step-3-recursive-aliases.tape
- docs/refactor-walkthrough/step-4-macro-pack.tape.pre -> docs/refactor-walkthrough/step-4-macro-pack.tape
- docs/refactor-walkthrough/step-5-semantic-macros.tape.pre -> docs/refactor-walkthrough/step-5-semantic-macros.tape
- docs/refactor-walkthrough/step-6-enhancement.tape.pre -> docs/refactor-walkthrough/step-6-enhancement.tape

If you want the full source, open the .tape.pre files listed above.

---

## 0) Raw VHS (no preprocessing)

Baseline in `docs/refactor-walkthrough/baseline.tape`.

- Goal: show the full, repetitive tape with Type/Enter/Sleep for every action.
- Pain point: pacing is hard to maintain and easy to mistype when copying repeated sequences.

---

## 1) Pre-VHS basics (directives + payloads)

File: `docs/refactor-walkthrough/step-1-basics.tape.pre`

- Technique: use directive lines (`> ...`) to consume payload lines with `$1`, `$2`, `$3`.
- Benefit: keeps commands and their sleeps together without duplicating raw VHS lines.
- Result: same output as baseline, but easier to scan.

---

## 2) Header aliases + Gap (built-in helpers)

File: `docs/refactor-walkthrough/step-2-alias-gap.tape.pre`

- Technique: define small header aliases (Say, VisitDir, WriteFile).
- Technique: use builtins Gap to avoid repeating Sleep between repeated tokens.
- Benefit: reduces local duplication and makes recurring patterns reusable.

---

## 3) Recursive aliases to bundle acts

File: `docs/refactor-walkthrough/step-3-recursive-aliases.tape.pre`

- Technique: compose aliases into higher-level acts (ExploreRoot, ScaffoldProject, TourProject).
- Benefit: the body reads like a storyboard while still producing the same tape.
- Note: this is the first step where the tape feels narrative rather than mechanical.

---

## 4) Macro pack cleanup

File: `docs/refactor-walkthrough/step-4-macro-pack.tape.pre`

- Technique: add small helper macros (WriteFile400, TouchKeep) and inline args.
- Benefit: compresses repeated Sleep + Type groups without changing behavior.

---

## 5) Semantic macros

File: `docs/refactor-walkthrough/step-5-semantic-macros.tape.pre`

- Technique: rename operations to intent (WriteGitignore, WriteREADME, SeedContent).
- Technique: EachLine for narration so multi-line payloads read cleanly.
- Benefit: the tape reads like a script instead of a command log.

---

## 6) Enhancement pass (look + feel)

File: `docs/refactor-walkthrough/step-6-enhancement.tape.pre`

- This step is intentionally not equivalent to the baseline.
- Technique: use `TypingStyle human` for narration and file content - this introduces _character-level_ timing variation, removing the purely mechanical feel of a standard VHS tape.
- Technique: interactive `cat > file` blocks so typing style applies to each line.
- Technique: ActBreak (Ctrl+L) to keep the viewport focused on the current act.

---

## Takeaways

- Start with directives to bind commands and their pacing in one place.
- Use aliases to remove repetition, then compose them into story-level acts.
- `$*` and EachLine make multi-line payloads readable and reusable.
- Built-in packs (Gap, TypeEnter, EachLine) eliminate boilerplate without magic.
- Save visual polish (TypingStyle, ActBreak) for a final enhancement pass.
- See the [REFERENCE](../REFERENCE.md) document to read about these more advanced techniques.
