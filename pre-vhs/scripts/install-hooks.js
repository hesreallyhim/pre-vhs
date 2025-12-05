const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const gitHooksDir = path.resolve(repoRoot, '..', '.git', 'hooks');

function installPreCommit() {
  if (!fs.existsSync(gitHooksDir)) {
    console.warn('[hooks] .git/hooks not found; skipping hook install');
    return;
  }

  // Copy our custom hook template if present
  const sourceHook = path.resolve(repoRoot, 'scripts', 'pre-commit.sample');
  const targetHook = path.join(gitHooksDir, 'pre-commit');

  if (fs.existsSync(sourceHook)) {
    fs.copyFileSync(sourceHook, targetHook);
    fs.chmodSync(targetHook, 0o755);
    console.log('[hooks] installed pre-commit hook');
  } else {
    console.log('[hooks] no pre-commit.sample found; skipping');
  }
}

installPreCommit();
