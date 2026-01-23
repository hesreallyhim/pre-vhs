# Contributing

Contributions are welcome. Please make sure you have read the
[CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md) and agree that your submissions
will be licensed under the terms of this project.

There are three broad categories of contributions:

(i) Pack Extensions/Additions

The library ships with a number of pre-built macros (referred to as "packs") -
we are happy to extend this collection with others that users feel are
especially useful or interesting. Because packs are always "opt-in",
these are relavitely low-risk additions, as long as they are independently
useful, well-tested, documented, and include a demo tape/gif. Tests for
packs live in `/examples`, where there is a `tape.pre` file and
a `tape.expected` - during testing, a `.tape` is generated from the
`.tape.pre` and compared against the `tape.expected`, and then cleaned up.
(See `/scripts/examples.js`.)

**Exception:** If your extension involves non-determinism (e.g., see
the TypingStyles macros), either find a deterministic way to mock
the randomness, or you may omit this aspect of the test until a
generalized pattern for testing these kinds of cases has been
decided.

(ii) General Bug-Fixes or Enhancements

For simple bug fixes, you may report an Issue or simply open a PR.
For larger changes, please open an Issue to propose the change first.

(iii) Documentation Changes or Corrections

We strive to maintain accuracy across core documentation files.
The `README` is intended to describe and illustrate core functionality,
while the `docs/REFERENCE.md` file is meant to be a comprehensive
reference document. These files should be accurate and in sync -
if you notice any inaccuracies or drift, please feel free to
notify us using by opening an Issue, or submitting a correction
via PR.

## Local Development

1. Clone the repository.
2. Set your node version to comply with `.node-version`/`.nvmrc`
3. Run `npm i` and `npm i -D`.

Packs/extensions live in `src/packs`.

`docs/REFERENCE.md` contains comprehensive documentation of all features.

Anything that you think you think should be featured in the `README`
can be added to the `README.md` as well.

## Style

Follow the code style of the libary as it exists, in particular, observe
the modular structre of the `/src` directory. JS-docs are encouraged,
but this is not currently universally enforced in the codebase.

## Releasing

The deployment and release process will be managed by the maintainer,
so no need to trouble yourself with the CHANGELOG or anything like that.
