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

## Commit Conventions

Use the following prefixes for commit messages:

- **Fix**: Bug fixes and error corrections
- **Feat**: New features, feature updates, refactoring
- **Misc**: Deployment changes, comments, scripts, non-direct fixes
- **Doc**: Documentation changes
- **Review**: Small changes during code review
- **Tests**: Test-related changes

**Examples:**

- `Fix: Resolve protein search query validation`
- `Feat: Add 3D protein structure visualization`
- `Misc: Update deployment configuration`
- `Doc: Update API documentation`
- `Review: Improve error handling`
- `Tests: Add unit tests for search functionality`

## Branch Naming

Use descriptive branch names with appropriate prefixes:

- `feature/description` - New features
- `fix/description` - Bug fixes
- `misc/description` - Other changes
- `doc/description` - Documentation updates

**Examples:**

- `feature/protein-search-filters`
- `fix/3d-viewer-loading-issue`
- `misc/update-dependencies`
- `doc/api-documentation`


## Sources

```typescript
import { Viewer as ViewerMolstar } from "molstar/lib/apps/viewer/app.js";
```

https://molstar.org/docs/plugin/instance/#plugincontext-with-built-in-react-ui

https://github.com/molstar/molstar/blob/master/src/apps/viewer/app.ts

https://molstar.org/mol-view-spec-docs/mvs-molstar-extension/integration/#construct-mvs-view-on-frontend-and-pass-to-the-viewer

https://molstar.org/mol-view-spec-docs/mvs-molstar-extension/load-extensions/
