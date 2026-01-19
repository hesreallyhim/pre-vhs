## Language Reference

A `.tape.pre` file has two sections: **header** and **body**, separated by a blank line.

- **Header**: `Use` statements and alias definitions (optional)
- **Body**: Directives (`>` lines) and raw VHS commands

```text
Use BackspaceAll Gap        ← header
TypeEnter = Type $1, Enter  ← header

> TypeEnter $1              ← body (blank line above separates)
echo "hello"
```

No strict enforcement—the parser is lenient. But following this structure keeps files readable.

---

## 1. Meta-directives (`>` lines)

A directive line:

```text
> CmdA, CmdB arg, CmdC
```

expands to a sequence of VHS commands.

If any command references $1, $2, … the next lines become its arguments:

```text
> Type $1, Enter
ls -la
```

produces:

```text
Type "ls -la"
Enter
```

**Expansion model (quick reference):**

- `$n` substitution happens before macro lookup.
- Inline args vs payload: if a header token has explicit text after the macro name, that text is treated as the payload; otherwise the payload comes from the consumed lines (`$1` etc.).
- Macro outputs are treated as final VHS unless they name another macro; recursion is allowed with guards (depth/step limits, cycle detection).
- All tokens on a directive share the same args—`$1` always refers to the first line consumed by that directive, regardless of which macro uses it.

---

## 2. Positional Arguments ($1..$n)

Each $n in a directive consumes one line beneath it:

```text
> Type $1, Enter, Type $2, Enter
echo "first"
echo "second"
```

---

## 3. Multi-line Arguments ($\*)

Use `$*` to consume all remaining non-blank lines as a single argument, joined with newlines:

```text
TypeBlock = Type $*

> TypeBlock
This is a long sentence with
multiple line breaks, it's
arbitrarily long...

# Next command starts here (blank line terminates $*)
```

Produces:

```text
Type `This is a long sentence with
multiple line breaks, it's
arbitrarily long...`
# Next command starts here (blank line terminates $*)
```

### Combining $\* with positional args

You can use both `$1`, `$2`, etc. and `$*` in the same macro. Positional args are consumed first, then `$*` gets the rest:

```text
PrefixAndBlock = Type $1, Type $*

> PrefixAndBlock $1
prefix text
line one
line two
line three
```

Produces:

```text
Type `prefix text`
Type `line one
line two
line three`
```

---

## 4. Header Aliases

Aliases are defined at the top of the file before the first non-header line.

```text
TypeEnter = Type $1, Enter
Clear = BackspaceAll $1, Type "", Enter
```

Usage:

```text
> TypeEnter $1
whoami

> Clear $1
garbage
```

Aliases expand just like directives. They may reference built-ins or other aliases.

---

## 5. Built-ins & `Use`

Only `Type` is always available for correct escaping. All other helpers are opt-in via packs + `Use ...`.

**Available macros (from builtins pack):**

| Macro                | Description                            |
| -------------------- | -------------------------------------- |
| `BackspaceAll`       | Deletes entire payload text            |
| `BackspaceAllButOne` | Deletes payload except last char       |
| `Gap`                | Inserts a timed Sleep between commands |
| `TypeEnter`          | Types payload + Enter                  |
| `ClearLine`          | Removes text + newline                 |

To activate:

```text
Use BackspaceAll BackspaceAllButOne Gap
```

---

## 6. Typing Styles (optional pack)

If you enable the typing-styles pack in `pre-vhs.config.js`:

```js
module.exports = {
  packs: ["./packs/typingStyles.js"],
};
```

…you can write:

```text
> SetTypingStyle human
> Type $1, Enter
echo "smoothly typed"
```

Human style emits one Type@xxms per character. Delays are based on a baseline
speed plus a simple keyboard-distance "difficulty" score between adjacent letters,
with jitter added.
Once set, the typing style stays active for subsequent `Type` commands until you change it or set it back to `default`.

You can also set the level and baseline inline:

```text
> SetTypingStyle human low
> Type $1
echo "faster rhythm"
```

```text
> SetTypingStyle human high fast
> Type $1
echo "dramatic variation"
```

```text
> SetTypingStyle human slow 50ms
> Type $1
echo "explicit baseline"
```

Another example:

```text
> SetTypingStyle sloppy
> Type $1
git commit -m "oops"
```

Sloppy style injects occasional mistakes and corrections for realism.

You can also tune how visible the human timing is in `pre-vhs.config.js`:

```js
module.exports = {
  packs: [
    {
      module: "./packs/typingStyles.js",
      enabled: true,
      options: { human: "high", humanSpeed: "slow" },
    },
  ],
};
```

Sloppy can be tuned via `options.sloppy` and `options.sloppySpeed` as well.

Supported levels: `low`, `medium` (default), `high` (multiplier for difficulty).
Speed presets: `fast`, `medium`/`normal` (default), `slow`, or an explicit `<ms>` baseline.

Sloppy supports the same inline pattern for level + speed:

```text
> SetTypingStyle sloppy high slow
> Type $1
git commit -m "oops"
```

For sloppy, levels control mistake frequency (`low`/`medium`/`high`) and speeds
set the baseline delay (`fast`/`medium`/`slow` or `<ms>`). Defaults are
`medium` + `medium` if you omit either.

---

## 7. Transforms & Phases (advanced)

Packs can hook into multiple phases:

- `header`: rewrite header tokens before expansion (e.g., Type→HumanType).
- `preExpandToken`: per-token tweaks before macro lookup.
- `postExpand`: operate on emitted VHS lines (e.g., Gap inserts Sleep between commands, screenshot-after-every-command).
- `finalize`: last chance to rewrite the entire tape.
  Transform ordering: runs in registration order within a phase.

Example: Doubling every command (header phase):

```text
Use Doubler
```

Now:

```text
> Type $1, Enter
echo hi
```

becomes:

```text
Type "echo hi"
Type "echo hi"
Enter
Enter
```

Typing styles use the same mechanism.

---

## 8. Recursive Macros (advanced)

Macros can expand into other macro calls; the engine recurses with guards
(depth/step limits and cycle detection). This makes layered helpers like:

```text
TypeSleep = Type $1, Sleep 1s
EnterEcho = Enter, Type $1
RunAndEcho = TypeSleep $1, EnterEcho $2
```

work as expected without manual “with-gap” variants.

---

## 9. Importing Packs (Project-wide)

Optional packs may be enabled globally with a configuration file.

pre-vhs.config.js:

```js
module.exports = {
  packs: [
    "./packs/builtins.js",
    "./packs/typingStyles.js",
    "./packs/emojiShortcuts.js",
  ],
};
```

These behave like Vim plugins: they provide macros, but the user still chooses whether to activate them with Use ....

---

## Examples

### Git demo

```text
Use Gap BackspaceAll

GitInit = Type "git init -q", Enter, Sleep 200ms
GitStatus = Type "git status", Enter

> GitInit

> Type $1, Enter
git add .

> GitStatus
```

---

### Complex one-liner

```text
Use BackspaceAll Gap

> Type $1, Sleep 200ms, Type $2, Enter, Gap 400ms, Type "Done", Enter
echo
"hello"
```

---

## CLI Options

```text
Usage: pre-vhs [options] <input> <output>
       pre-vhs [options] <basename>
       cat file | pre-vhs [options]

Options:
  -c, --config <path>  Path to config file
  -h, --help           Show this help message
```

Examples:

```bash
pre-vhs input.tape.pre output.tape   # explicit input/output paths
pre-vhs demo                          # convenience: reads demo.tape.pre → writes demo.tape
cat file.tape.pre | pre-vhs > out.tape
pre-vhs --config custom.config.js input.pre output.tape
```

---

## Testing

The test suite consists of:

- Golden file tests: `.tape.pre` → expected `.tape`
- Unit tests: header parsing, alias resolution, built-ins, error reporting
- Pack tests: typing styles, emoji shortcuts, probe
- Lint/format hooks: `npm run lint`, `npm run format`

---

## Design Principles

- Opt-in everything except Type
- No magic: preprocessing is visible, predictable, diff-able
- Tiny DSL: aliases and Use, not a programming language
- Composable: chain packs, transforms, macros
- Zero overhead: output is plain VHS
- Permissive: unknown syntax passes through to VHS; missing args default to empty string

---

## Roadmap

- More built-in macro packs (filesystem, shortcuts, demos)
- Optional fenced JS header sections if needed
- Examples gallery / cookbook
- VS Code syntax highlighting for .tape.pre
- Playground website

---

## Appendix: Error Handling

pre-vhs follows a **"fail fast on guardrails, lenient everywhere else"** philosophy.

### Strict (throws immediately)

| Scenario                                        | Why                     |
| ----------------------------------------------- | ----------------------- |
| Macro recursion (`A → B → A`)                   | Prevents infinite loops |
| Expansion depth exceeded (default 32)           | Guards against blowup   |
| Expansion steps exceeded (default 10,000)       | Guards against blowup   |
| Missing config file (when explicitly specified) | User error              |
| Missing input file                              | User error              |

### Lenient (silent degradation)

| Scenario                     | Behavior                     |
| ---------------------------- | ---------------------------- |
| Missing `$1`, `$2`, etc.     | Defaults to empty string     |
| Invalid header syntax        | Treated as body line         |
| Unknown macro name           | Passed through to VHS        |
| Duplicate macro registration | Last wins (warns by default) |

### Rationale

- **Preprocessor philosophy**: incomplete files should produce reasonable output
- **VHS compatibility**: unknown syntax passes through unchanged
- **Trust pack authors**: no deep validation of registered macros
- **Clear fatal errors**: recursion/depth errors include line numbers and stack traces
