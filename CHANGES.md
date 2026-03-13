# Toolchain Simplification Changes

## Step 1: Switch from Yarn to pnpm

- Added `pnpm-workspace.yaml` with `packages/*` and `apps/*` globs
- Deleted `yarn.lock`
- Removed `"workspaces"` field from root `package.json`
- Ran `pnpm install` to generate `pnpm-lock.yaml`
- Verified all workspace packages resolve correctly

## Step 2: Replace ESLint + Prettier with Biome

- Installed `@biomejs/biome` v2.4.6 as root devDependency
- Created `biome.json` with: 2-space indent, single quotes, recommended lint rules, organized imports
- Deleted all 11 ESLint/Prettier config files (root + per-package/app)
- Removed 13 ESLint/Prettier devDependencies from root `package.json`
- Updated `lint-staged.config.js` to use `biome check --write`
- Added `lint` and `format` scripts to root `package.json`
- Ran `biome check --write .` to auto-fix formatting and lint issues across 61 files
- Downgraded pre-existing code issues (`noExplicitAny`, `noSvgWithoutTitle`, etc.) to warnings
- `pnpm biome check .` passes with 0 errors (warnings only from pre-existing code)
