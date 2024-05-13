# Trrack

Trrack stands for **r**eproducible **track**ing. Originally Trrack is a web-based provenance tracking library that can track application state in directed provenance graph.

This branch implements action based provenance tracking.

[![license](https://img.shields.io/github/license/trrack/trrackjs?style=plastic)](https://github.com/Trrack/trrackjs/blob/main/LICENSE)
[![npm latest version](https://img.shields.io/npm/v/@trrack/core?style=plastic)](https://www.npmjs.com/package/@trrack/core)
[![npm downloads](https://img.shields.io/npm/dt/@trrack/core?style=plastic)](https://www.npmjs.com/package/@trrack/core)
[![Github Action](https://img.shields.io/github/actions/workflow/status/trrack/trrackjs/release.yml?branch=main)](https://github.com/Trrack/trrackjs/actions/workflows/release.yml?query=branch%3Amain)

## Development

Clone the repository and switch to `trrack-action` branch.
This project was generated using [Nx](https://nx.dev). Please refer to [Nx](https://nx.dev) for more any questions about monorepo setup.

### Basic

Serve the react example by running the following:

```bash
npx nx react-trrack-example:serve
```

Any changes made to the `core` package will cause updates to the react example for easier testing

### Advanced

You need to have `pnpm` installed for local development. You can install `pnpm` using `npm i -g pnpm` or following alternate installation steps [here](https://pnpm.io/installation).

To get started with development run:

```bash
pnpm install

# Will run all examples
pnpm run dev:all

# Will run tests for all trrack pacakges in watch mode
pnpm run test:all:watch
```

The repository is structured as follows:

```bash
trrack-monorepo
|
|--- pacakges # trrack library is located in this folder
    |--- core # Core action-based tracking library
    |--- redux # Redux toolkit wrapper for core
|
|--- apps # Trrack examples are located in this folder
    |--- react-trrack-example
    |--- rtk-trrack-example
```

Following the standards for Nx monorepos please install any dependency for the applications directly to root workspace. This ensures all the applications use same versions of any dependency. For the packages, install the dependency to appropriate package.
