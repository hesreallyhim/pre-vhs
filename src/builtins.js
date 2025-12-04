const BUILTIN_MACROS = {
  BackspaceAll(payload = "") {
    const n = String(payload).length;
    return [`Backspace ${n}`];
  },

  BackspaceAllButOne(payload = "") {
    const len = String(payload).length;
    const n = Math.max(len - 1, 0);
    return [`Backspace ${n}`];
  },

  Gap(_payload, rawCmd) {
    const m = rawCmd.match(/Gap\s+(.+)/);
    CURRENT_GAP = m ? m[1].trim() : null;
    return [];
  },
};

module.exports = BUILTIN_MACROS;
