![npm](https://img.shields.io/npm/v/pre-vhs)
![CI](https://github.com/hesreallyhim/pre-vhs/actions/workflows/ci.yml/badge.svg)
![coverage](https://img.shields.io/badge/coverage-97%25-brightgreen)
![license](https://img.shields.io/npm/l/pre-vhs)
![node](https://img.shields.io/node/v/pre-vhs)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

![preview image](./pre-vhs-image-asset.png)

A lightweight, adaptable Node.js preprocessor and macro engine for writing [@charmbracelet/VHS](https://github.com/charmbracelet/vhs) tapes with more complexity in fewer characters.

`pre-vhs` exposes a set of extensible syntactic conventions that you can easily adapt to your own workflow, potentially turning dozens of lines of repetitious VHS commands into a small handful of pre-defined (or user-defined) macros.

Additionally, `pre-vhs` unlocks functionality that is border-line unfeasible in the VHS syntax, such as advanced typing styles, and branching command sequences (conditionals). And what you get at the end is a perfectly valid VHS `.tape`.

---

## How to Get Started

```sh
npm i -g pre-vhs                  # install globally
pre-vhs demo.tape.pre demo.tape   # convert .tape.pre → .tape
```

> [!NOTE]
> For installation and setup instructions, see the [quickstart](#quickstart) below.

1. Take any sequence of commands and inline them for better readability.

**INSTEAD OF THIS**

```sh           
Type "pwd"          
Sleep 1s            
Enter              
Sleep 1s           
```

**DO THIS:**

```sh
> Type $1, Sleep 1s, Enter, Sleep 1s # ">" is the pre-vhs directive
pwd
```

2. Take any repeated sequence of commands and compress them into a macro.

**INSTEAD OF THIS**

```sh
Type "Hello there!"
Sleep 2s
Ctrl+U
Sleep 1s
```

**DO THIS**

```sh
TypeSleepErase = Type $1, Sleep 2s, Ctrl+U, Sleep 1s # Define a macro

> TypeSleepErase $1 # Invoke it using the directive
Hello There!
```

`pre-vhs` syntax uses `$`-numbering to refer to the lines that immediately follow the directive.

3. Compose macros to form even more advanced ways of expressing complex sequences in a more readable fashion.

**INSTEAD OF THIS**

```sh
Type "echo 'Hello There!'"
Sleep 2s
Enter
Sleep 1s
Sleep 0.5s
Screenshot
Sleep 1s
```

**DO THIS**

```sh
RunWithSleep = Type $1, Sleep 2s, Enter, Sleep 1s
TakeScreenshot = Sleep 0.5s, Screenshot, Sleep 1s

> RunWithSleep $1, TakeScreenshot
echo "Hello There!"
```

**OR THIS**

```sh
RunWithSleep = Type $1, Sleep 2s, Enter, Sleep 1s
TakeScreenshot = Sleep 0.5s, Screenshot, Sleep 1s
RunAndScreenshot = RunWithSleep $1, TakeScreenshot

> RunAndScreenshot $1
echo "Hello There!"
```

## Packs

`pre-vhs` also ships with powerful "packs" that provide out-of-the-box functionality:

- **Typing styles** — "human-style" typing with natural pacing variations between keystrokes
- **BackspaceAll** — automatically determines how many characters to delete
- **Probe** — enables conditional VHS sequences based on runtime conditions


## Motivation

VHS is a gorgeous library - but making really nice tapes requires a lot of fine-tuning, small pauses interwoven between commands, adjustments in pacing... This can end up being time-consuming, and while the visual output is spectacular, the script itself may be hard to read. This library is designed to relieve some of these problems. Once you hit up the perfect sequence of commands - you never have to write it again. `pre-vhs` provides the syntactic conventions that make it easy to streamline your workflows, as well as some super handy out-of-the-box functionality.

For a complete reference guide, including advanced configuration instructions, see [REFERENCE](REFERENCE.md).

---

## Quickstart

**1. Install**

```sh
npm i -g pre-vhs    # global
npm i -D pre-vhs    # or as dev dependency
```

**2. Write a `.tape.pre` file**

```sh
# header
Use BackspaceAll Gap
TypeEnter = Type $1, Enter

# body
> Gap 200ms
> Type $1, Enter
echo "hello"

> TypeEnter $1
echo "bye"
```

**3. Build the tape**

```sh
pre-vhs demo.tape.pre demo.tape
```

Or use the basename shorthand:

```sh
pre-vhs demo   # reads demo.tape.pre → writes demo.tape
```

Or pipe stdin→stdout:

```sh
cat demo.tape.pre | pre-vhs > demo.tape
```

---

[LICENSE](LICENSE)

2026 © Really Him
