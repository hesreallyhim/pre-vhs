# Pre-VHS Refactor Walkthrough

A realistic VHS tape that provisions a tiny Express app, hits it, and commits it. We’ll start from a verbose raw VHS tape and progressively refactor with pre-vhs features to show the reduction in size and noise.

---

## 0) Raw VHS (no preprocessing)

```text
Output demo
Set FontSize 14
Type `mkdir api-demo`
Enter
Sleep 200ms
Type `cd api-demo`
Enter
Sleep 200ms
Type `npm init -y`
Enter
Sleep 2s
Type `npm install express`
Enter
Sleep 2s
Type `cat <<'EOF' > index.js`
Enter
Type `const express = require("express");`
Enter
Type `const app = express();`
Enter
Type `app.get("/health", (req, res) => res.json({ ok: true }));`
Enter
Type `app.listen(3000, () => console.log("ready"));`
Enter
Type `EOF`
Enter
Sleep 300ms
Type `node index.js`
Enter
Sleep 1s
Type `curl -s http://localhost:3000/health`
Enter
Sleep 500ms
Type `git init -q`
Enter
Type `git add .`
Enter
Type `git commit -m "init"`
Enter
```

Lines: 32 (and easy to make mistakes copying Type/Enter/Sleep).

---

## 1) Pre-VHS basics (directives + payloads)

Use meta lines to consume payloads and keep sleeps with the directives.

```text
Output demo
Set FontSize 14

> Type $1, Enter, Sleep 200ms
mkdir api-demo
cd api-demo
npm init -y

> Type $1, Enter, Sleep 2s
npm install express

> Type $1, Enter
cat <<'EOF' > index.js
const express = require("express");
const app = express();
app.get("/health", (req, res) => res.json({ ok: true }));
app.listen(3000, () => console.log("ready"));
EOF

> Sleep 300ms
> Type $1, Enter, Sleep 1s
node index.js
> Type $1, Enter, Sleep 500ms
curl -s http://localhost:3000/health

> Type $1, Enter
git init -q
git add .
git commit -m "init"
```

Lines: 20. Less repetition; sleeps colocated with the commands they affect.

---

## 2) Header aliases + Gap (opt-in builtins)

Add aliases for common patterns and opt into the built-in `Gap` to remove most explicit sleeps.

```text
Use Gap TypeEnter
WriteFile = Type $1, Enter, Type $2, Enter, Type $3, Enter, Type $4, Enter, Type $5, Enter, Type $6, Enter

> Gap 200ms

> TypeEnter $1
Output demo
> TypeEnter $1
Set FontSize 14

> TypeEnter $1
mkdir api-demo
> TypeEnter $1
cd api-demo
> TypeEnter $1
npm init -y

> Type $1, Enter, Sleep 2s
npm install express

> WriteFile $1 $2 $3 $4 $5 $6
cat <<'EOF' > index.js
const express = require("express");
const app = express();
app.get("/health", (req, res) => res.json({ ok: true }));
app.listen(3000, () => console.log("ready"));
EOF

> Type $1, Enter, Sleep 1s
node index.js
> Type $1, Enter, Sleep 500ms
curl -s http://localhost:3000/health

> TypeEnter $1
git init -q
> TypeEnter $1
git add .
> TypeEnter $1
git commit -m "init"
```

Lines: 29, but far less manual sleep noise—the `Gap` adds inter-command sleeps automatically.

---

## 3) Recursive aliases to bundle workflows

Compose the steps into reusable higher-level macros; `Gap` still handles inter-command pacing.

```text
Use Gap TypeEnter
> Gap 200ms

TypeEnterSleep = TypeEnter $1, Sleep $2
InitProject = TypeEnter "mkdir api-demo", TypeEnter "cd api-demo", TypeEnter "npm init -y", Sleep 2s, TypeEnter "npm install express", Sleep 2s
WriteApp = TypeEnter "cat <<'EOF' > index.js", TypeEnter $1, TypeEnter $2, TypeEnter $3, TypeEnter $4, TypeEnter "EOF"
RunAndProbe = TypeEnter "node index.js", Sleep 1s, TypeEnter "curl -s http://localhost:3000/health"
GitWrap = TypeEnter "git init -q", TypeEnter "git add .", TypeEnter "git commit -m \"init\""

> InitProject

> WriteApp $1 $2 $3 $4
const express = require("express");
const app = express();
app.get("/health", (req, res) => res.json({ ok: true }));
app.listen(3000, () => console.log("ready"));

> RunAndProbe
> GitWrap
```

Lines: 19, but reads at the workflow level (“InitProject”, “WriteApp”, “RunAndProbe”).

---

## 4) Add typing style + clarity (optional pack)

If typing realism matters, enable the typing styles pack globally and switch for the file:

```text
Use Gap TypeEnter SetTypingStyle
Gap 200ms
> SetTypingStyle human

InitProject = TypeEnter "mkdir api-demo", TypeEnter "cd api-demo", TypeEnter "npm init -y", Sleep 2s, TypeEnter "npm install express", Sleep 2s
WriteApp = TypeEnter "cat <<'EOF' > index.js", TypeEnter $1, TypeEnter $2, TypeEnter $3, TypeEnter $4, TypeEnter "EOF"
RunAndProbe = TypeEnter "node index.js", Sleep 1s, TypeEnter "curl -s http://localhost:3000/health"
GitWrap = TypeEnter "git init -q", TypeEnter "git add .", TypeEnter "git commit -m \"init\""

> InitProject

> WriteApp $1 $2 $3 $4
const express = require("express");
const app = express();
app.get("/health", (req, res) => res.json({ ok: true }));
app.listen(3000, () => console.log("ready"));

> RunAndProbe
> GitWrap
```

Lines: 18 plus the typing-style opt-in, with humanized typing automatically applied to every `Type`.

---

### Takeaways

- The raw tape is noisy and error-prone (32 lines of repeated Type/Enter/Sleep).
- Basic pre-vhs cuts noise by ~40% by lifting payloads under directives.
- Aliases + Gap remove most repetition; recursion bundles workflows into readable blocks.
- Optional packs (typing styles) add polish without more boilerplate.

You can mix and match: start with a simple directive style, then layer aliases and packs as needed. The final version is concise, intention-revealing, and easy to maintain.
