// src/packs/probe.js

/**
 * Probe pack for pre-vhs.
 *
 * Provides:
 *
 *   Probe [/pattern/] $1
 *   IfProbeMatched $1
 *   IfProbeNotMatched $1
 *
 * Example:
 *
 *   > Probe /ready/ $1
 *   curl -s http://localhost:8080/health
 *
 *   > IfProbeMatched $1
 *   service is ready
 *
 *   > IfProbeNotMatched $1
 *   service is NOT ready
 *
 * Behavior:
 *   - Probe runs the payload line as a shell command (sh -c ...).
 *   - If /pattern/ is present in the header, it is tested against
 *     stdout and stderr (combined).
 *   - The result is stored and used by subsequent IfProbe* macros.
 */

const { spawnSync: defaultSpawnSync } = require("node:child_process");

module.exports = function probePack(engine) {
  const { registerMacros, helpers, options } = engine;
  const { formatType } = helpers;
  const spawnFn =
    options && typeof options.spawnSync === "function"
      ? options.spawnSync
      : defaultSpawnSync;

  const defaultTimeoutMs =
    (options && typeof options.defaultTimeoutMs === "number"
      ? options.defaultTimeoutMs
      : 5000);

  // Last probe result is kept in module-local state
  let lastProbe = {
    command: null,
    stdout: "",
    stderr: "",
    exitCode: null,
    matched: false,
    pattern: null,
    error: null,
  };

  function runProbe(command, pattern) {
    let stdout = "";
    let stderr = "";
    let exitCode = null;
    let error = null;

    try {
      const result = spawnFn(command, {
        shell: true,
        encoding: "utf8",
        timeout: defaultTimeoutMs,
      });

      stdout = result.stdout || "";
      stderr = result.stderr || "";
      exitCode = typeof result.status === "number" ? result.status : null;
      if (result.error) error = String(result.error);
    } catch (err) {
      error = String(err || "");
    }

    const combined = stdout + stderr + (error ? error : "");
    let matched = false;

    if (pattern instanceof RegExp) {
      matched = pattern.test(combined);
    }

    lastProbe = {
      command,
      stdout,
      stderr,
      exitCode,
      matched,
      pattern: pattern ? String(pattern) : null,
      error,
    };
  }

  const macros = {
    /**
     * Probe [/pattern/] $1
     *
     * - $1 is the shell command to run (e.g. "curl -s ...").
     * - Optional /pattern/ in the header is a JS-style regex literal.
     *   If present, it is tested against stdout+stderr+error.
     * - No VHS output is produced; state is stored for conditionals.
     */
    Probe(payload, rawCmd) {
      const cmdStr = String(payload || "").trim();
      if (!cmdStr) {
        lastProbe = {
          command: null,
          stdout: "",
          stderr: "",
          exitCode: null,
          matched: false,
          pattern: null,
          error: "No command provided to Probe",
        };
        return [];
      }

      // Optional /pattern/ in header: Probe /foo/ $1
      let pattern = null;
      const m = rawCmd.match(/Probe\s+\/(.+?)\/(?:\s|$)/);
      if (m) {
        try {
          pattern = new RegExp(m[1]);
        } catch {
          pattern = null;
        }
      }

      runProbe(cmdStr, pattern);
      return [];
    },

    /**
     * IfProbeMatched $1
     *
     * If the last Probe matched its pattern (or pattern was omitted
     * and the command exited with code 0), emit a Type of $1.
     * Otherwise emit nothing.
     */
    IfProbeMatched(payload /* string */) {
      // If no regex was supplied, fall back to exitCode === 0 as "match"
      const effectiveMatch =
        lastProbe.pattern != null
          ? !!lastProbe.matched
          : lastProbe.exitCode === 0 && lastProbe.command !== null;

      if (!effectiveMatch) return [];
      return [formatType(payload || "")];
    },

    /**
     * IfProbeNotMatched $1
     *
     * Logical negation of IfProbeMatched.
     */
    IfProbeNotMatched(payload /* string */) {
      const effectiveMatch =
        lastProbe.pattern != null
          ? !!lastProbe.matched
          : lastProbe.exitCode === 0 && lastProbe.command !== null;

      if (effectiveMatch) return [];
      return [formatType(payload || "")];
    },
  };

  registerMacros(macros);

  return macros;
};
