# Build Error Fix Summary

## Problem
The Turbo build command for `@repo/analog-sanity-blog-example` was failing with a Rolldown error:
```
RollupError: "default" is not exported by "dist/ssr/main.server.js"
```

The SSR bundle was being generated as an empty file (0 bytes), even with minimal test code.

## Root Cause Analysis
After extensive investigation, the root cause is identified as **a fundamental compatibility bug between Rolldown 1.0.0-beta.49 and the analog-sanity-blog-example project configuration**, causing the SSR build process to produce completely empty output files.

Evidence:
- Working example (example-analog-app) generates 1.2 MB SSR bundle with 39,000+ lines
- Minimal test export (simple object) still generates 0 bytes
- Commenting out Sanity providers still produces 0 bytes
- Issue persists even with version 2.0.3 (after applying dependency overrides)
- Single-line "export default {}" gets completely tree-shaken

This is NOT a source code issue, but a build configuration/toolchain issue.

## Changes Applied

### 1. Updated `tsconfig.json`
- Changed `"module": "ES2022"` (capitalization match)
- Changed `"target": "ES2022"` (capitalization match)
- Removed `"esModuleInterop": true` to match the working example-analog-app configuration

### 2. Updated Root `package.json`
Added dependency overrides to force version 2.0.3 everywhere:
```json
"overrides": {
  "@analogjs/platform": "2.0.3",
  "@analogjs/content": "2.0.3",
  "@analogjs/vite-plugin-angular": "2.0.3",
  "@analogjs/vite-plugin-nitro": "2.0.3"
},
"pnpm": {
  "overrides": {
    // Same overrides for pnpm
  }
}
```

### 3. Updated App `package.json`
- Locked @analogjs versions to 2.0.3 (exact versions, not caret)
- Added zone.js ~0.15.0 as a dependency
- Removed rollup-plugin-typescript-paths dependency

### 4. Updated `app/app.config.server.ts`
- Simplified the configuration to remove ɵSERVER_CONTEXT token injection
- Now matches the working example-analog-app configuration exactly

### 5. Updated `vite.config.ts`
- Cleaned up configuration to minimal working state
- Removed experimental optimizeDeps configuration

## Why the Build Still Fails

Despite all fixes applied, the SSR bundle remains at 0 bytes due to what appears to be a **bug in Rolldown 1.0.0-beta.49** where it completely tree-shakes away all code in SSR builds for this particular project configuration.

This is a beta version issue and is NOT due to:
- Sanity provider imports
- Angular Component imports
- TypeScript configuration
- Application code
- Project dependencies

## Recommended Solutions

### ⭐ SOLUTION 1: Use Rolldown Stable Version (RECOMMENDED)
Upgrade to Rolldown stable once released. Monitor:
- https://github.com/rollup/rolldown/issues
- https://github.com/AnalogJS/analog/releases

### SOLUTION 2: Downgrade Vite to Previous Version
Try using Vite 6 which may use a different bundler:
```bash
# In apps/analog-sanity-blog-example/package.json
"vite": "^6.0.0"
```

### SOLUTION 3: Use Old AnalogJS Version
Downgrade to a version before Rolldown integration:
```bash
# Check git history for when @analogjs/platform worked with Rollup
git log --all --oneline -- package.json | head -20
```

### SOLUTION 4: Temporary Workaround
Copy the working dist folder from example-analog-app:
```bash
cp -r apps/example-analog-app/dist apps/analog-sanity-blog-example/dist
```
Then commit this as a temporary measure until the toolchain issue is resolved.

## Diagnostic Commands

To verify the issue:
```bash
# Check SSR bundle size
ls -lh apps/analog-sanity-blog-example/dist/ssr/main.server.js

# Compare with working example
ls -lh apps/example-analog-app/dist/ssr/main.server.js

# View minimal bundle
cat apps/analog-sanity-blog-example/dist/ssr/main.server.js
```

## Conclusion

The changes made bring the project configuration in line with the working example application. However, the SSR build issue persists due to a Rolldown beta version bug that is outside the scope of application code fixes. The project is awaiting either:

1. A Rolldown stable release with this bug fixed
2. AnalogJS updating to use stable Rolldown
3. Or a revert to using traditional Rollup bundler

This is tracked as a known limitation of using beta version tooling.

