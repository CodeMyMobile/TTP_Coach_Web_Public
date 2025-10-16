const Module = require('module');
const path = require('path');
const { existsSync } = require('fs');
const { execFileSync } = require('child_process');

const DARWIN_ARCHS = ['arm64', 'x64'];
const nativeRequests = new Set([
  '../native.js',
  './native.js',
  'rollup/dist/native.js',
  'rollup/dist/native',
  './rollup.darwin-arm64.node',
  './rollup.darwin-x64.node',
  '@rollup/rollup-darwin-arm64',
  '@rollup/rollup-darwin-x64'
]);
const rollupDistSegment = `${path.sep}rollup${path.sep}dist${path.sep}`;
const esbuildLibSegment = `${path.sep}esbuild${path.sep}lib${path.sep}`;

const DARWIN_PACKAGE_BINARY_BUILDERS = [
  arch =>
    path.join(
      process.cwd(),
      'node_modules',
      '@rollup',
      `rollup-darwin-${arch}`,
      `rollup.darwin-${arch}.node`
    ),
  arch =>
    path.join(
      process.cwd(),
      'node_modules',
      '@esbuild',
      `darwin-${arch}`,
      'bin',
      'esbuild'
    )
];

function getCandidateBinaryPaths() {
  if (process.platform !== 'darwin') {
    return [];
  }
  return DARWIN_ARCHS.flatMap(arch =>
    DARWIN_PACKAGE_BINARY_BUILDERS.map(buildPath => buildPath(arch))
  );
}

function clearQuarantineAttribute(binaryPath) {
  if (!binaryPath || !existsSync(binaryPath)) {
    return;
  }
  try {
    execFileSync('xattr', ['-d', 'com.apple.quarantine', binaryPath], {
      stdio: 'ignore'
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Either xattr is missing or the binary vanished; nothing to do.
      return;
    }
    if (typeof error.status === 'number' && error.status !== 0) {
      // macOS returns exit status 1 if the attribute does not exist.
      if (error.status === 1) {
        return;
      }
    }
    // Re-throw unexpected failures so they are visible to the developer.
    throw error;
  }
}

function clearKnownQuarantineAttributes() {
  for (const binaryPath of getCandidateBinaryPaths()) {
    clearQuarantineAttribute(binaryPath);
  }
}

clearKnownQuarantineAttributes();

if (!global.__rollupUnquarantinePatched) {
  const originalLoad = Module._load;
  Module._load = function patchedModuleLoad(request, parent, isMain) {
    if (
      parent?.filename &&
      ((
        parent.filename.includes(rollupDistSegment) &&
        nativeRequests.has(request)
      ) || parent.filename.includes(esbuildLibSegment))
    ) {
      clearKnownQuarantineAttributes();
    }
    return originalLoad.apply(this, arguments);
  };
  global.__rollupUnquarantinePatched = true;
}
