![npm](https://img.shields.io/npm/v/pre-vhs)</sub>

![preview image](./pre-vhs-image-asset.png)

A lightweight, adaptable preprocessor and macro engine for writing @charmbracelet/VHS tapes with more complexity in fewer characters.

`pre-vsh` exposes a set of extensible syntactic conventions that you can easily adapt to your own workflow, potentially turning dozens of lines of repitious VHS commands into a small handful of pre-defined (or user-defined) macros.

Additionally, `pre-vhs` unlocks functionality that is border-line unfeasible in the VHS syntax, such as advanced typing styles, and branching command sequences (conditionals). And what you get at the end is a perfectly valid VHS `.tape`.

---

## How to Get Started

> [!INFO]
> For installation and setup instructions, see the [quickstart](#quickstart) below.

1. Take any sequence of commands and inline them for better readabiliity.

**INSTEAD OF THIS**

```shell           
Type "pwd"          
Sleep 1s            
Enter              
Sleep 1s           
```

**DO THIS:**

```shell
> Type $1, Sleep 1s, Enter, Sleep 1s # ">" is the pre-vhs directive
pwd
```

2. Take any repeated sequence of commands and compress them into a macro.

**INSTEAD OF THIS**

```shell
Type "Hello there!"
Sleep 2s
Ctrl+U
Sleep 1s
```

**DO THIS**

```shell
TypeSleepErase = Type $1, Sleep 2, Ctrl+U, Sleep 1s # Define a macro

> TypeSleepErase $1 # Invoke it using the directive
Hello There!
```

`pre-vhs` syntax uses `$`-numbering to refer to the lines that immediately follow the directive.

3. Compose macros to form even more advanced ways of expressing complex sequences in a more readable fashion.

**INSTEAD OF THIS**

```shell
Type "echo 'Hello There!'"
Sleep 2s
Enter
Sleep 1s
Type "Let's take a screenshot!"
Sleep 0.5s
Screenshot
Sleep 1s
```

**DO THIS**

```shell
RunWithSleep = Type $1, Sleep 2s, Enter, Sleep 1s
TypeAndScreenshot = Type $1, Sleep 0.5s, Screenshot, Sleep 1s

> RunWithSleep $1, TypeAndScreenshot $2
echo "Hello There!"
Let's take a screenshot!
```

**OR THIS**
```
...
RunTypeAndScreenshot = RunWithSleep $1, TypeAndScreenshot $2

> RunTypeAndScreenshot
echo "Hello There!"
Let's take a screenshot!
```

## Packs

`pre-vhs` also ships with some powerful configuration "packs" that provide out-of-the box functionality such as:

- Different typing styles: "human-style" typing with small pacing changes between words
- `BackspaceAll` - Automatically determines the correct number of characters to delete preceding sentence.
- a special `Probe` command that enables _conditional vhs sequences_ depending on runtime conditions.


## Motivation

VHS is a gorgeous library - but making really nice tapes requires a lot of fine-tuning, small pauses interwoven between commands, adjustments in pacing... This can end up being time-consuming, and while the visual output is spectacular, the script itself may be hard to read. This library is designed to relieve some of these problems. Once you hit up the perfect sequence of commands - you never have to write it again. `pre-vhs` provides the syntactic conventions that make it easy to streamline your workflows, as well as some super handy out-of-the-box functionality.

For a complete reference guide, including advanced configuration instructions, see [REFERENCE](REFERENCE.md).

---

## Quickstart

1. Install

```sh
npm install -D pre-vhs
```

(or for `npx`, see below.)

2. Write a `.tape.pre`

### header

```sh
Use BackspaceAll Gap
TypeEnter = Type $1, Enter
```

### body

```sh
> Gap 200ms
> Type $1, Enter
echo "hello"

> TypeEnter $1
echo "bye"
```

## 3. Build the tape

```sh
npx pre-vhs demo.tape.pre demo.tape
```

Or use the basename shorthand:

```sh
npx pre-vhs demo   # reads demo.tape.pre → writes demo.tape
```

Or pipe stdin→stdout:

```sh
cat demo.tape.pre | npx pre-vhs > demo.tape
```

---

[LICENSE](LICENSE.md)]

2026 © Really Him
