# Toolchain Simplification

## Goal
Remove Nx entirely. Replace ESLint+Prettier with Biome. Use pnpm workspaces for monorepo management and Vite for both library builds and app dev servers. Drop UMD output. Eliminate redundant config files.

## Current State (before migration)
- **Monorepo**: Nx 15.6.3 + Yarn workspaces
- **Library builds**: Vite (via `@nrwl/vite:build`) → ESM + CJS + UMD
- **App builds**: Webpack (via `@nrwl/webpack:webpack`) + SWC + Babel
- **Docs**: Next.js (via `nx:run-commands`)
- **Tests**: Vitest (via `@nrwl/vite:test`) for libs, Jest (via `@nrwl/jest:jest`) for apps
- **Linting**: ESLint (8 config files across repo) + Prettier (2 config files)
- **Commit tooling**: Husky + lint-staged + commitlint (2 duplicate configs) + commitizen
- **Babel**: 8 configs (root + 7 per-package/app) — only needed for Nx webpack pipeline
- **Build output location**: `dist/packages/{core,redux}` (root-level dist)
- **Node version**: 18.17.1 (`.nvmrc`)
- **Config file count**: ~31 config files across repo

## Target State (after migration)
- **Monorepo**: pnpm workspaces
- **Library builds**: Vite library mode (direct) → ESM + CJS only
- **App dev/build**: Vite (replaces Webpack)
- **Docs**: Next.js (direct commands)
- **Tests**: Vitest (direct, unified for libs and apps)
- **Linting + Formatting**: Biome (single `biome.json`)
- **Commit tooling**: Husky + lint-staged (simplified) + commitlint (single config)
- **Babel**: None (Vite uses esbuild)
- **Build output location**: `packages/{name}/dist/` (local to each package)
- **Node version**: 22 LTS
- **Package exports** (modern):
  - `exports.".".import` → `./dist/index.js` (ESM)
  - `exports.".".require` → `./dist/index.cjs` (CJS)
  - `exports.".".types` → `./dist/index.d.ts`

---

## Steps

### Step 1: Switch from Yarn to pnpm
- [x] Add `pnpm-workspace.yaml` with packages and apps globs
- [x] Delete `yarn.lock`
- [x] Remove `"workspaces"` field from root `package.json`
- [x] Run `pnpm install` to generate `pnpm-lock.yaml`
- **Test**: `pnpm install` succeeds, `node_modules` resolves correctly

### Step 2: Replace ESLint + Prettier with Biome
- [x] Install `@biomejs/biome` as root devDependency
- [x] Create root `biome.json` with:
  - Formatter: indent 2 spaces, single quotes (matching current `.prettierrc`)
  - Linter: recommended rules
  - Organize imports: enabled
- [x] Delete ALL ESLint configs:
  - `.eslintrc.json` (root)
  - `.eslintignore`
  - `packages/core/.eslintrc.json`
  - `packages/redux/.eslintrc.json`
  - `apps/react-trrack-example/.eslintrc.json`
  - `apps/rtk-trrack-example/.eslintrc.json`
  - `apps/dummy-testing-library/.eslintrc.json`
  - `apps/trrack-lineup-example/.eslintrc.json`
  - `apps/docs/.eslintrc.json`
- [x] Delete ALL Prettier configs:
  - `.prettierrc`
  - `.prettierignore`
- [x] Remove ESLint + Prettier devDependencies from root `package.json`:
  - `eslint`, `eslint-config-prettier`, `eslint-config-next`
  - `eslint-plugin-import`, `eslint-plugin-jsx-a11y`
  - `eslint-plugin-react`, `eslint-plugin-react-hooks`
  - `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
  - `@nrwl/eslint-plugin-nx`, `@nrwl/linter`
  - `prettier`
  - `vite-plugin-eslint`
- [x] Update lint-staged config to use `biome check --write`
- [x] Add scripts: `"lint": "biome check ."`, `"format": "biome check --write ."`
- **Test**:
  - `pnpm biome check .` runs without errors
  - `pnpm biome check --write .` formats all files consistently
- **Note**: Biome doesn't support all ESLint rules. Review any custom rules from `.eslintrc.json` files to confirm coverage.

### Step 3: Delete all Babel configs
- [ ] Delete root `babel.config.json`
- [ ] Delete `packages/core/.babelrc`
- [ ] Delete `packages/redux/.babelrc`
- [ ] Delete `apps/react-trrack-example/.babelrc`
- [ ] Delete `apps/rtk-trrack-example/.babelrc`
- [ ] Delete `apps/dummy-testing-library/.babelrc`
- [ ] Delete `apps/trrack-lineup-example/.babelrc`
- [ ] Remove `@babel/preset-react` from root devDependencies
- **Test**: `pnpm build` still works (Vite uses esbuild, not Babel)

### Step 4: Simplify Vite configs for library packages
- [ ] **`packages/core/vite.config.ts`**:
  - Remove UMD format (keep `es` + `cjs` only)
  - Remove `name` (UMD global name) and `globals` in rollupOptions
  - Output to local `./dist/` (default, no outputPath override needed)
  - Update `vite-plugin-dts` config for new tsconfig structure
  - Remove `define: { 'process.env': {} }` (not needed for library)
  - Remove stale comments
- [ ] **`packages/redux/vite.config.ts`**: Same changes as core
- [ ] **Update `packages/core/package.json`**:
  - Add modern `exports` with types, import, require pointing to `./dist/`
  - Add `"type": "module"`
  - Add `"files": ["dist"]` for npm publish
  - Add scripts: `"build"`, `"test"`, `"lint"`
- [ ] **Update `packages/redux/package.json`**: Same changes as core
- **Test**:
  - `cd packages/core && pnpm build` → verify `dist/` contains:
    - `index.js` (ESM) — check it's valid ES module
    - `index.cjs` (CJS) — check it's valid CommonJS
    - `index.d.ts` — check type declarations are present
    - NO `.umd.js` file
    - Source maps present
  - `cd packages/redux && pnpm build` → same checks
  - `cd packages/core && pnpm test` → vitest runs and passes
  - `cd packages/redux && pnpm test` → vitest runs and passes
- **Validate exports**:
  - `npx publint ./packages/core` → validates package.json exports config
  - `npx publint ./packages/redux`
  - `npx @arethetypeswrong/cli --pack ./packages/core` → verifies types resolve for ESM and CJS consumers
  - `npx @arethetypeswrong/cli --pack ./packages/redux`
  - List exported symbols and compare before/after:
    ```
    node --input-type=module -e "import * as m from './packages/core/dist/index.js'; console.log(Object.keys(m).sort().join('\n'))"
    ```
  - Quick CJS smoke test:
    ```
    node -e "const t = require('./packages/core/dist/index.cjs'); console.log(Object.keys(t).sort().join('\n'))"
    ```
  - Verify `.d.ts` has declarations: `grep "export" packages/core/dist/index.d.ts | head -20`

### Step 5: Convert example apps from Webpack to Vite
- [ ] For each app (`react-trrack-example`, `rtk-trrack-example`, `dummy-testing-library`, `trrack-lineup-example`):
  - Add `package.json` with name, private:true, scripts (`dev`, `build`, `preview`)
  - Add `vite.config.ts` with `@vitejs/plugin-react`
  - Add `index.html` at app root (Vite entry point — move from `src/index.html`)
  - Remove `polyfills.ts` (not needed with Vite)
  - Remove `project.json` (Nx config)
  - Remove `jest.config.ts` (not critical for example apps)
  - Remove `.browserslistrc` (Vite doesn't use browserslist)
  - Remove `environments/` directory (use Vite env if needed)
- [ ] For docs app:
  - Add `package.json` with scripts (`dev`, `build`)
  - Remove `project.json`
- **Test**:
  - `cd apps/react-trrack-example && pnpm dev` → app starts, renders
  - `cd apps/rtk-trrack-example && pnpm dev` → app starts, renders
  - Verify apps can import from `@trrack/core` and `@trrack/redux`

### Step 6: Remove all Nx config and dependencies
- [ ] Delete `nx.json`
- [ ] Delete all remaining `project.json` files
- [ ] Delete `jest.config.ts` and `jest.preset.js` (root-level Jest config)
- [ ] Delete `tools/` directory (Nx publish scripts)
- [ ] Remove from root `package.json` devDependencies:
  - All `@nrwl/*` packages (`@nrwl/cli`, `@nrwl/eslint-plugin-nx`, `@nrwl/jest`, `@nrwl/js`, `@nrwl/linter`, `@nrwl/nx-cloud`, `@nrwl/react`, `@nrwl/vite`, `@nrwl/web`, `@nrwl/workspace`)
  - `nx`
  - `@swc/cli`, `@swc/core`, `@swc/jest`, `swc-loader` (SWC — was for webpack)
  - `@pmmmwh/react-refresh-webpack-plugin`, `react-refresh` (webpack HMR)
  - `webpack`, `webpack-merge`
  - `css-loader`, `style-loader`, `stylus`, `stylus-loader`, `url-loader` (webpack loaders)
  - `@svgr/webpack` (webpack SVG loader)
  - `jest`, `@types/jest`, `ts-jest` (replaced by vitest)
  - `ts-node` (not needed with Vite)
  - `@jscutlery/semver`, `ngx-deploy-npm` (Nx release plugins)
- [ ] Remove from root `package.json` dependencies:
  - `@nrwl/next`
  - `@swc/helpers`
  - `core-js`, `regenerator-runtime` (polyfills — not needed for modern targets)
- **Test**: `pnpm install` succeeds with cleaned dependencies

### Step 7: Update root package.json scripts
- [ ] Replace Nx-based scripts with pnpm equivalents:
  ```
  "build": "pnpm -r --filter './packages/*' run build"
  "test": "pnpm -r --filter './packages/*' run test"
  "lint": "biome check ."
  "format": "biome check --write ."
  "dev:react-example": "pnpm --filter react-trrack-example dev"
  "dev:rtk-example": "pnpm --filter rtk-trrack-example dev"
  "dev:docs": "pnpm --filter docs dev"
  ```
- [ ] Remove Nx migration scripts (`nx-create-migrations`, `nx-migrate`)
- [ ] Remove `build-affected-libs`, `test-affected-libs`, `release` (Nx-specific)
- [ ] Keep: `prepare` (husky), `commit` (commitizen)
- **Test**:
  - `pnpm build` → builds core then redux (topological order)
  - `pnpm test` → runs all package tests
  - `pnpm lint` → biome checks all files
  - `pnpm dev:react-example` → starts dev server

### Step 8: Update CI workflows
- [ ] **`.github/workflows/build_test.yml`**:
  - Remove `nrwl/nx-set-shas` action
  - Replace yarn with pnpm (`pnpm/action-setup@v4`)
  - Replace `yarn run build-affected-libs` → `pnpm build`
  - Replace `yarn run test-affected-libs` → `pnpm test`
  - Add `pnpm lint` step
  - Update cache config for pnpm store
- [ ] **`.github/workflows/build_test_release.yml`**:
  - Same pnpm changes as above
  - Update release command to run semantic-release directly
- **Test**: Review workflow YAML for correctness

### Step 9: Update TypeScript configs
- [ ] Simplify `tsconfig.base.json`:
  - Update target to `es2022`
  - Update module to `es2022` or `esnext`
  - Remove `emitDecoratorMetadata`, `experimentalDecorators` (not used)
  - Remove `downlevelIteration` (not needed with modern target)
  - Keep path aliases for `@trrack/core`
- [ ] Simplify per-package tsconfig files:
  - Remove `"module": "commonjs"` override (use ESM)
  - Remove references to Nx-generated paths (`../../dist/out-tsc`)
  - Ensure `tsconfig.lib.json` works with vite-plugin-dts
- [ ] Delete per-package `.editorconfig` files (use root only, fix to 2-space)
- **Test**: `pnpm build` still produces correct `.d.ts` files

### Step 10: Clean up miscellaneous
- [ ] Update `.gitignore` (remove Nx-specific entries like `.nx/`, add pnpm)
- [ ] Fix `.editorconfig` — remove package-level 4-space configs, standardize on 2-space
- [ ] Update `.nvmrc` to `22` (Node 22 LTS)
- [ ] Update `.vscode/extensions.json` — replace Nx Console/Jest/ESLint with Biome
- [ ] Update `.vscode/settings.json` — add Biome as default formatter
- [ ] Consolidate commitlint: delete `.commitlintrc.json`, keep only `commitlint.config.js` (remove `@commitlint/config-nx-scopes`)
- [ ] Delete root `dist/` directory (Nx artifact)
- [ ] Update `release.config.js` files for new dist paths
- [ ] Verify `vercel.json` still applies
- **Test**: Full end-to-end: `pnpm install && pnpm build && pnpm test && pnpm lint`

### Step 11: Add AGENTS.md
- [ ] Create `AGENTS.md` describing repo structure, tooling, dev workflow, architecture

---

## Files to DELETE (total: ~30 files)

### Nx configs (9)
- `nx.json`
- `packages/core/project.json`
- `packages/redux/project.json`
- `apps/react-trrack-example/project.json`
- `apps/rtk-trrack-example/project.json`
- `apps/dummy-testing-library/project.json`
- `apps/trrack-lineup-example/project.json`
- `apps/docs/project.json`
- `tools/` (entire directory)

### Babel configs (8)
- `babel.config.json`
- `packages/core/.babelrc`
- `packages/redux/.babelrc`
- `apps/react-trrack-example/.babelrc`
- `apps/rtk-trrack-example/.babelrc`
- `apps/dummy-testing-library/.babelrc`
- `apps/trrack-lineup-example/.babelrc`
- (docs app has no .babelrc)

### ESLint + Prettier configs (11)
- `.eslintrc.json`
- `.eslintignore`
- `.prettierrc`
- `.prettierignore`
- `packages/core/.eslintrc.json`
- `packages/redux/.eslintrc.json`
- `apps/react-trrack-example/.eslintrc.json`
- `apps/rtk-trrack-example/.eslintrc.json`
- `apps/dummy-testing-library/.eslintrc.json`
- `apps/trrack-lineup-example/.eslintrc.json`
- `apps/docs/.eslintrc.json`

### Jest configs (4)
- `jest.config.ts`
- `jest.preset.js`
- `apps/react-trrack-example/jest.config.ts`
- `apps/rtk-trrack-example/jest.config.ts`
- `apps/trrack-lineup-example/jest.config.ts`

### Browserslist (3)
- `apps/react-trrack-example/.browserslistrc`
- `apps/rtk-trrack-example/.browserslistrc`
- `apps/dummy-testing-library/.browserslistrc`

### EditorConfig duplicates (2)
- `packages/core/.editorconfig`
- `packages/redux/.editorconfig`

### Commitlint duplicate (1)
- `.commitlintrc.json` (keep `commitlint.config.js`)

---

## Dependencies to REMOVE from root package.json

### devDependencies (~35 packages)
`@nrwl/cli`, `@nrwl/eslint-plugin-nx`, `@nrwl/jest`, `@nrwl/js`, `@nrwl/linter`, `@nrwl/nx-cloud`, `@nrwl/react`, `@nrwl/vite`, `@nrwl/web`, `@nrwl/workspace`, `nx`, `@babel/preset-react`, `@swc/cli`, `@swc/core`, `@swc/jest`, `swc-loader`, `@pmmmwh/react-refresh-webpack-plugin`, `react-refresh`, `webpack`, `webpack-merge`, `css-loader`, `style-loader`, `stylus`, `stylus-loader`, `url-loader`, `@svgr/webpack`, `jest`, `@types/jest`, `ts-jest`, `ts-node`, `@jscutlery/semver`, `ngx-deploy-npm`, `eslint`, `eslint-config-prettier`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `prettier`, `vite-plugin-eslint`

### dependencies (~4 packages)
`@nrwl/next`, `@swc/helpers`, `core-js`, `regenerator-runtime`

### Dependencies to ADD
`@biomejs/biome` (devDependency)

---

## Verification Checklist (final)
- [ ] `pnpm install` — clean install works
- [ ] `pnpm build` — both packages build successfully
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm lint` — biome check passes
- [ ] `packages/core/dist/` contains: `index.js`, `index.cjs`, `index.d.ts`, sourcemaps
- [ ] `packages/redux/dist/` contains: same structure
- [ ] No UMD files in output
- [ ] `exports` field in package.json resolves correctly for ESM and CJS consumers
- [ ] Example apps can `import` from `@trrack/core` and render
- [ ] No `nx`, `@nrwl/*`, webpack, eslint, prettier, babel, or jest references remain
- [ ] CI workflows use pnpm and run build/test/lint/release
- [ ] `npx publint` passes for both packages (validates package.json exports)
- [ ] `npx @arethetypeswrong/cli --pack` passes for both packages (types resolve for ESM + CJS)
- [ ] Exported symbols match before/after migration (no accidental drops)
- [ ] Config file count reduced from ~31 to ~10
