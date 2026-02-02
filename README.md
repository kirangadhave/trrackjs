# Trrack

Trrack (**r**eproducible **track**ing) is a TypeScript library for action-based provenance tracking in web applications. It maintains a directed acyclic graph (DAG) of application states, enabling undo/redo, time-travel debugging, and full audit trails of user interactions.

[![license](https://img.shields.io/github/license/trrack/trrackjs?style=flat)](https://github.com/Trrack/trrackjs/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/@trrack/core?style=flat)](https://www.npmjs.com/package/@trrack/core)
[![npm downloads](https://img.shields.io/npm/dt/@trrack/core?style=flat)](https://www.npmjs.com/package/@trrack/core)

## Installation

```bash
# npm
npm install @trrack/core

# pnpm
pnpm add @trrack/core

# yarn
yarn add @trrack/core
```

### Browser (ESM)

For browser usage without a bundler:

```html
<script type="module">
  import { createTrrack } from 'https://esm.sh/@trrack/core';

  const trrack = createTrrack({ initialState: { count: 0 } });
</script>
```

## Quick Start

```typescript
import { createTrrack } from '@trrack/core';

const trrack = createTrrack({
  initialState: { count: 0 },
});
```

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Setup

```bash
# Clone the repository
git clone https://github.com/Trrack/trrackjs.git
cd trrackjs

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

### Project Structure

```
trrackjs/
├── packages/
│   └── core/           # @trrack/core - Main provenance library
├── _reference/         # Archived v1 code for reference
└── ...config files
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm build:core` | Build core package |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Lint code |
| `pnpm lint:fix` | Lint and auto-fix |
| `pnpm format` | Format code |
| `pnpm typecheck` | Type check |

### Tooling

<!-- Keep this section updated when tooling changes -->

| Tool | Purpose | Config |
|------|---------|--------|
| [pnpm](https://pnpm.io/) | Package manager & workspaces | `pnpm-workspace.yaml` |
| [TypeScript](https://www.typescriptlang.org/) 5.x | Type checking | `tsconfig.json` |
| [tsup](https://tsup.egoist.dev/) | Build & bundle (ESM, CJS) | `packages/*/tsup.config.ts` |
| [Vitest](https://vitest.dev/) | Testing | `vitest.config.ts` |
| [Biome](https://biomejs.dev/) | Linting & formatting | `biome.json` |
| [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks) | Git hooks | `package.json` |
| [commitlint](https://commitlint.js.org/) | Commit message linting | `commitlint.config.js` |

### Build Outputs

| Format | File | Use Case |
|--------|------|----------|
| ESM | `dist/index.js` | Modern bundlers, Node.js, browsers |
| CJS | `dist/index.cjs` | Legacy Node.js, older bundlers |
| Types | `dist/index.d.ts` | TypeScript support |

## License

[MIT](LICENSE)
