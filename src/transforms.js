/**
 * Transform pipeline factory for pre-vhs engine.
 *
 * Creates transform registries and application functions for the
 * four processing phases: header, preExpandToken, postExpand, finalize.
 */

/**
 * Create a new transform pipeline.
 *
 * @returns {object} Transform pipeline with register and apply methods
 */
function createTransformPipeline() {
  const transforms = {
    header: [],
    preExpandToken: [],
    postExpand: [],
    finalize: [],
  };

  /**
   * Register a transform function for a specific phase.
   *
   * @param {string} phase - Transform phase (header, preExpandToken, postExpand, finalize)
   * @param {Function} fn - Transform function
   */
  function registerTransform(phase, fn) {
    if (!transforms[phase]) return;
    if (typeof fn === "function") {
      transforms[phase].push(fn);
    }
  }

  /**
   * Apply header transforms to command tokens.
   * Each transform receives the full array and returns a new array.
   *
   * @param {string[]} cmds - Command tokens
   * @param {object} ctx - Context object
   * @returns {string[]} Transformed tokens
   */
  function applyHeaderTransforms(cmds, ctx) {
    let current = cmds;
    for (const fn of transforms.header) {
      const next = fn(current, ctx);
      if (Array.isArray(next)) current = next;
    }
    return current;
  }

  /**
   * Apply pre-expand transforms to a single token.
   * Each transform can return string, array, or undefined (passthrough).
   *
   * @param {string} cmd - Single command token
   * @param {object} ctx - Context object
   * @returns {string[]} Expanded tokens
   */
  function applyPreExpandTransforms(cmd, ctx) {
    let bucket = [cmd];
    for (const fn of transforms.preExpandToken) {
      const nextBucket = [];
      for (const token of bucket) {
        const res = fn(token, ctx);
        if (Array.isArray(res) && res.length) {
          nextBucket.push(...res);
        } else if (typeof res === "string") {
          nextBucket.push(res);
        } else {
          nextBucket.push(token);
        }
      }
      bucket = nextBucket;
    }
    return bucket;
  }

  /**
   * Apply post-expand transforms to output lines.
   * Each transform can return string, array, or undefined (passthrough).
   *
   * @param {string|string[]} lines - Output line(s)
   * @param {object} ctx - Context object
   * @returns {string[]} Transformed lines
   */
  function applyPostExpandTransforms(lines, ctx) {
    let bucket = Array.isArray(lines) ? [...lines] : [lines];
    for (const fn of transforms.postExpand) {
      const nextBucket = [];
      for (const line of bucket) {
        const res = fn(line, ctx);
        if (Array.isArray(res) && res.length) {
          nextBucket.push(...res);
        } else if (typeof res === "string") {
          nextBucket.push(res);
        } else {
          nextBucket.push(line);
        }
      }
      bucket = nextBucket;
    }
    return bucket;
  }

  /**
   * Apply finalize transforms to the complete output.
   * Each transform receives and returns the full line array.
   *
   * @param {string[]} lines - All output lines
   * @returns {string[]} Finalized lines
   */
  function applyFinalizeTransforms(lines) {
    let current = lines;
    for (const fn of transforms.finalize) {
      const next = fn(current);
      if (Array.isArray(next)) current = next;
    }
    return current;
  }

  return {
    registerTransform,
    applyHeaderTransforms,
    applyPreExpandTransforms,
    applyPostExpandTransforms,
    applyFinalizeTransforms,
  };
}

module.exports = { createTransformPipeline };
