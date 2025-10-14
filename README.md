# react-molstar-wrapper - React wrapper for Mol*

Simple React wrapper for MolStar molecular visualization library.

## Information

- Package manager - **Bun**
- TypeScript
- Linting - **BiomeJS**
- Formatting - **Prettier**

Distribution output folder:\
`dist`

## Useful Commands

```bash
bun install
```

```bash
bun run dev
```

Local test:

```bash
bun link
```

Link it in any other of yours projects to test it:

```bash
bun link react-molstar
```

(TS import)

## Code Quality Commands

```bash
bun run lint
bun run lint:fix

bun run format:check
bun run format

bun run type:check

bun run check
```

## Sources

```typescript
import { Viewer as ViewerMolstar } from "molstar/lib/apps/viewer/app.js";
```

https://molstar.org/docs/plugin/instance/#plugincontext-with-built-in-react-ui

https://github.com/molstar/molstar/blob/master/src/apps/viewer/app.ts

https://molstar.org/mol-view-spec-docs/mvs-molstar-extension/integration/#construct-mvs-view-on-frontend-and-pass-to-the-viewer

https://molstar.org/mol-view-spec-docs/mvs-molstar-extension/load-extensions/
