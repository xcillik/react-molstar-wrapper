# react-molstar-wrapper

[![npm version](https://img.shields.io/npm/v/@e-infra/react-molstar-wrapper.svg)](https://www.npmjs.com/package/@e-infra/react-molstar-wrapper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A React wrapper for the Mol* molecular visualization library, providing seamless integration of molecular structure visualization capabilities into React applications.

## Table of Contents

- [Features](#features)
- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
  - [React](#react)
  - [Next.js Integration](#nextjs-integration)
  - [Important Notice](#important-notice)
- [Props](#props)
  - [Data Source (Required)](#data-source-required)
  - [Configuration](#configuration)
  - [Animation Controls](#animation-controls)
- [ViewerRef Methods](#viewerref-methods)
- [Protein Type](#protein-type)
- [Examples](#examples)
  - [Basic Example](#basic-example)
  - [Example with Multiple Proteins and Custom Styling](#example-with-multiple-proteins-and-custom-styling)
  - [Example with Ref Methods](#example-with-ref-methods)
  - [Example with Rock Animation](#example-with-rock-animation)
  - [Example with Local File](#example-with-local-file)
  - [Example with Custom Model Source URLs](#example-with-custom-model-source-urls)
- [Advanced Usage](#advanced-usage)
  - [Using Precomputed MVS Data](#using-precomputed-mvs-data)
  - [Combining Multiple Features](#combining-multiple-features)
- [Documentation](#documentation)
- [License](#license)

## Features

- **Molecular Visualization** - Display 3D molecular structures using the Mol* visualization engine
- **React Component** - Simple React component with minimal setup
- **Multiple Data Sources** - Load proteins from UniProt IDs or local files (PDB, CIF formats)
- **Customizable Appearance** - Configure background colors, labels, and UI presets (minimal, standard, expanded)
- **Animations** - Support for spin and rock animations with configurable speeds
- **Domain Highlighting** - Focus on specific protein domains using chopping data
- **Transform Controls** - Update protein superposition with custom rotation and translation
- **Imperative API** - Access viewer methods via forwarded ref for programmatic control
- **Next.js Compatible** - Works with Next.js using dynamic imports
- **Plugin Lifecycle Management** - Shared plugin instance with reference counting and automatic garbage collection
- **Multiple Representations** - Choose from cartoon, ball-and-stick, spacefill, line, surface, or backbone representations
- **Custom Model Sources** - Configure custom URLs for remote model retrieval
- **Precomputed MVS Support** - Load precomputed Mol* View State data directly
- **Styling Support** - Apply custom CSS classes and heights to the viewer container
- **Responsive Design** - Viewer fills available height by default, with optional explicit sizing

## Overview

This package provides a lightweight React wrapper around the [Mol*](https://molstar.org/) molecular visualization library, enabling developers to easily integrate 3D molecular structure visualization into their React applications.

## Installation

### npm

```bash
npm install @e-infra/react-molstar-wrapper
```

### bun

```bash
bun install @e-infra/react-molstar-wrapper
```

## Usage

### React

This component must be used within **Client Components** as Mol* requires the `document` object to be available at runtime.

```typescript
import Viewer from "@e-infra/react-molstar-wrapper";
import "@e-infra/react-molstar-wrapper/style.css";
```

### Next.js Integration

When using Next.js, the component must be imported dynamically to avoid server-side rendering issues. Add the `"use client"` directive and use Next.js's `dynamic` import:

```typescript
"use client";

import "@e-infra/react-molstar-wrapper/style.css";
import dynamic from "next/dynamic";

const Viewer = dynamic(
  () => import("@e-infra/react-molstar-wrapper").then((mod) => mod.Viewer),
  { ssr: false }
);
```

This approach prevents errors related to `document` not being defined during server-side rendering, as Mol* expects the DOM to be available during initialization.

### Important Notice

> [!IMPORTANT]
> It is important to include library styles as well! Otherwise loader and error view will be broken.
>
> ```typescript
> import "@e-infra/react-molstar-wrapper/style.css";
> ```

## Props

The `Viewer` component accepts the following props:

### Data Source (Required)

Exactly one of these must be provided:

| Prop | Type | Description |
|------|------|-------------|
| `proteins` | `Protein[]` | Array of protein objects to visualize. When provided, the component will call `createMVS` to compute the view state. |
| `mvs` | `MVSData` | Precomputed MVS (Mol* View State) data. If provided, the viewer loads this directly without calling `createMVS`. |

### Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelSourceUrls` | `Partial<ModelSourceUrls>` | `undefined` | Optional lookup mapping used by `createMVS` to resolve model source URLs for remote model retrieval when `proteins` is used. Format: `{ uniProtId: (id: string) => string }`. |
| `initialUI` | `"minimal" \| "standard" \| "expanded"` | `"standard"` | Which initial UI preset to use for the embedded plugin. Controls the visibility of control chrome. |
| `bgColor` | `ColorHEX` | `"#ffffff"` | Background color for the viewer (any valid CSS hex color). |
| `labels` | `boolean` | `true` | Whether to show labels in the viewer. |
| `height` | `number` | `undefined` | Optional explicit height (in pixels) for the outer wrapper. If omitted, the wrapper will fill available height (`100%`). |
| `className` | `string` | `undefined` | Optional CSS class to apply to the outer wrapper. |

### Animation Controls

At most one of these may be provided:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `spin` | `boolean` | `false` | Whether to enable continuous spin animation. Mutually exclusive with `rock`. |
| `rock` | `boolean` | `false` | Whether to enable rock animation (back-and-forth). Mutually exclusive with `spin`. |
| `spinSpeed` | `number` | `0.05` | Speed multiplier for the spin animation. |
| `rockSpeed` | `number` | `0.2` | Speed multiplier for the rock animation. |

## ViewerRef Methods

The component forwards a ref exposing the following async methods:

### `highlight(proteinIndex: number, label: string): Promise<void>`

Focuses/highlights a domain within the specified protein by matching the label against the protein's chopping data. The domain's first range (start/end) is used to focus the view.

- **Parameters:**
  - `proteinIndex` - Index of the protein in the `proteins` array
  - `label` - Label of the domain to highlight (must match a label in the protein's `chopping` data)

- **Behavior:** No-op if plugin, proteins, or matching domain is not available.

### `reset(): Promise<void>`

Resets the plugin's view to its default/original pose.

### `updateSuperposition(proteinIndex: number, translation?, rotation?): Promise<void>`

Updates the transform for a loaded structure (protein) without reloading the entire scene.

- **Parameters:**
  - `proteinIndex` - Index of the protein to update
  - `translation` - Optional `[x, y, z]` tuple for translation
  - `rotation` - Optional 3x3 matrix represented as `[[r11,r12,r13],[r21,r22,r23],[r31,r32,r33]]`

- **Behavior:** This method relies on the Mol* plugin API to update transforms in-place.

## Protein Type

The `Protein` type represents a protein structure to visualize:

```typescript
type Protein = {
  // Exactly one of these must be provided
  uniProtId?: string;  // UniProt ID for remote fetching
  file?: File;         // Local file to load

  // Optional properties
  chain?: string;      // Chain identifier
  superposition?: {
    rotation: Matrix3D;      // 3x3 rotation matrix
    translation: Vector3D;   // [x, y, z] translation vector
  };
  chopping?: Chopping[];     // Domain definitions for highlighting
  representation?: "cartoon" | "ball_and_stick" | "spacefill" | "line" | "surface" | "backbone";
};
```

### Chopping Type

```typescript
type Chopping = {
  label: string;           // Domain label for identification
  showLabel?: boolean;     // Whether to show the label in the viewer
  ranges: {
    start: number;         // Residue start position
    end: number;           // Residue end position
  }[];
}[];
```

## Examples

### Basic Example

```typescript
import "@e-infra/react-molstar-wrapper/style.css";
import Viewer from "@e-infra/react-molstar-wrapper";
import type { Protein } from "@e-infra/react-molstar-wrapper";

const proteins: Protein[] = [
  {
    uniProtId: "P12345",
  },
];

function App() {
  return (
    <Viewer
      proteins={proteins}
      spin={true}
    />
  );
}
```

### Example with Multiple Proteins and Custom Styling

```typescript
import "@e-infra/react-molstar-wrapper/style.css";
import Viewer from "@e-infra/react-molstar-wrapper";
import type { Protein } from "@e-infra/react-molstar-wrapper";

const proteins: Protein[] = [
  {
    uniProtId: "P12345",
    representation: "cartoon",
    chopping: [
      {
        label: "Domain A",
        ranges: [{ start: 1, end: 100 }],
      },
      {
        label: "Domain B",
        ranges: [{ start: 101, end: 200 }],
      },
    ],
  },
  {
    uniProtId: "P67890",
    representation: "ball_and_stick",
    superposition: {
      rotation: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      translation: [10, 0, 0],
    },
  },
];

function App() {
  return (
    <Viewer
      proteins={proteins}
      initialUI="minimal"
      bgColor="#1a1a2e"
      labels={true}
      height={600}
      className="my-viewer"
    />
  );
}
```

### Example with Ref Methods

```typescript
import "@e-infra/react-molstar-wrapper/style.css";
import Viewer, { type ViewerRef } from "@e-infra/react-molstar-wrapper";
import type { Protein } from "@e-infra/react-molstar-wrapper";
import { useRef } from "react";

const proteins: Protein[] = [
  {
    uniProtId: "P12345",
    chopping: [
      {
        label: "Active Site",
        ranges: [{ start: 50, end: 75 }],
      },
    ],
  },
];

function App() {
  const viewerRef = useRef<ViewerRef | null>(null);

  const handleHighlight = async () => {
    await viewerRef.current?.highlight(0, "Active Site");
  };

  const handleReset = async () => {
    await viewerRef.current?.reset();
  };

  const handleUpdateTransform = async () => {
    await viewerRef.current?.updateSuperposition(
      0,
      [5, 0, 0],
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]
    );
  };

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={handleHighlight}>Highlight Active Site</button>
        <button onClick={handleReset}>Reset View</button>
        <button onClick={handleUpdateTransform}>Update Transform</button>
      </div>
      <Viewer
        ref={viewerRef}
        proteins={proteins}
        bgColor="#ffffff"
        height={500}
      />
    </div>
  );
}
```

### Example with Rock Animation

```typescript
import "@e-infra/react-molstar-wrapper/style.css";
import Viewer from "@e-infra/react-molstar-wrapper";
import type { Protein } from "@e-infra/react-molstar-wrapper";

const proteins: Protein[] = [
  {
    uniProtId: "P12345",
  },
];

function App() {
  return (
    <Viewer
      proteins={proteins}
      rock={true}
      rockSpeed={0.3}
      bgColor="#f0f0f0"
    />
  );
}
```

### Example with Local File

```typescript
import "@e-infra/react-molstar-wrapper/style.css";
import Viewer from "@e-infra/react-molstar-wrapper";
import type { Protein } from "@e-infra/react-molstar-wrapper";
import { useState } from "react";

function App() {
  const [protein, setProtein] = useState<Protein | undefined>();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProtein({ file });
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept=".pdb,.cif" />
      {protein && (
        <Viewer
          proteins={[protein]}
          height={500}
        />
      )}
    </div>
  );
}
```

### Example with Custom Model Source URLs

```typescript
import "@e-infra/react-molstar-wrapper/style.css";
import Viewer from "@e-infra/react-molstar-wrapper";
import type { Protein } from "@e-infra/react-molstar-wrapper";

const proteins: Protein[] = [
  {
    uniProtId: "P12345",
  },
];

const modelSourceUrls = {
  uniProtId: (id: string) => `https://api.example.com/protein/${id}`,
};

function App() {
  return (
    <Viewer
      proteins={proteins}
      modelSourceUrls={modelSourceUrls}
      bgColor="#ffffff"
    />
  );
}
```

## Advanced Usage

### Using Precomputed MVS Data

If you have precomputed MVS (Mol* View State) data, you can pass it directly to the viewer:

```typescript
import "@e-infra/react-molstar-wrapper/style.css";
import Viewer from "@e-infra/react-molstar-wrapper";
import type { MVSData } from "molstar/lib/extensions/mvs/mvs-data.d.ts";

const mvsData: MVSData = {
  // Your precomputed MVS data
};

function App() {
  return (
    <Viewer
      mvs={mvsData}
      bgColor="#ffffff"
    />
  );
}
```

### Combining Multiple Features

```typescript
import "@e-infra/react-molstar-wrapper/style.css";
import Viewer, { type ViewerRef } from "@e-infra/react-molstar-wrapper";
import type { Protein } from "@e-infra/react-molstar-wrapper";
import { useRef, useEffect } from "react";

const proteins: Protein[] = [
  {
    uniProtId: "P12345",
    representation: "cartoon",
    chopping: [
      { label: "N-terminal", ranges: [{ start: 1, end: 50 }] },
      { label: "Core", ranges: [{ start: 51, end: 150 }] },
      { label: "C-terminal", ranges: [{ start: 151, end: 200 }] },
    ],
  },
  {
    uniProtId: "P67890",
    representation: "surface",
    superposition: {
      rotation: [
        [0.9, -0.1, 0],
        [0.1, 0.9, 0],
        [0, 0, 1],
      ],
      translation: [15, 0, 0],
    },
  },
];

function App() {
  const viewerRef = useRef<ViewerRef | null>(null);

  // Auto-highlight a domain after viewer loads
  useEffect(() => {
    const timer = setTimeout(async () => {
      await viewerRef.current?.highlight(0, "Core");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Viewer
      ref={viewerRef}
      proteins={proteins}
      initialUI="expanded"
      bgColor="#0d1117"
      labels={true}
      spin={false}
      height={700}
      className="custom-viewer"
    />
  );
}
```

## Documentation

- [Contributing Guide](CONTRIBUTING.md) - Development setup, code quality, and contribution guidelines
- [Changelog](CHANGELOG.md) - Version history and release notes

## License

See [LICENSE.md](LICENSE.md) for details.

## Acknowledgments

This library is built on top of [Mol*](https://molstar.org/), an open-source molecular visualization toolkit.
