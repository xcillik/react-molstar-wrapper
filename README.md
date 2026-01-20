# react-molstar-wrapper

[![npm version](https://img.shields.io/npm/v/@e-infra/react-molstar-wrapper.svg)](https://www.npmjs.com/package/@e-infra/react-molstar-wrapper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A React wrapper for the Mol* molecular visualization library, providing seamless integration of molecular structure visualization capabilities into React applications.

## Overview

This package provides a lightweight React wrapper around the [Mol*](https://molstar.org/) molecular visualization library, enabling developers to easily integrate 3D molecular structure visualization into their React applications.

## Installation

### npm

```bash
npm install react-molstar-wrapper
```

### bun

```bash
bun install react-molstar-wrapper
```

## Usage

### React

This component must be used within **Client Components** as Mol* requires the `document` object to be available at runtime.

```typescript
import Viewer from "react-molstar-wrapper";
import "react-molstar-wrapper/style.css";
```

### Next.js Integration

When using Next.js, the component must be imported dynamically to avoid server-side rendering issues. Add the `"use client"` directive and use Next.js's `dynamic` import:

```typescript
"use client";

import "react-molstar-wrapper/style.css";
import dynamic from "next/dynamic";

const Viewer = dynamic(
  () => import("react-molstar-wrapper").then((mod) => mod.Viewer),
  { ssr: false }
);
```

This approach prevents errors related to `document` not being defined during server-side rendering, as Mol* expects the DOM to be available during initialization.

### Notice

It is important to include library styles as well! Otherwise loader and error view will be broken.

```typescript
import "react-molstar-wrapper/style.css";
```

### Example

```typescript

import "react-molstar-wrapper/style.css";
import Viewer from "react-molstar-wrapper";
import type { Protein } from "react-molstar-wrapper";

const proteins: Protein[] = [
  {
    uniProtId: "P12345";
  },
];

<Viewer
  proteins={proteins}
  spin={true}
/>
```

## Advanced Usage

(TODO)

## Documentation

- [Contributing Guide](CONTRIBUTING.md) - Development setup, code quality, and contribution guidelines
- [Changelog](CHANGELOG.md) - Version history and release notes

## License

See [LICENSE.md](LICENSE.md) for details.
