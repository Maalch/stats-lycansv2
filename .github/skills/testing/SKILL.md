---
name: testing
user-invocable: false
description: "Use when writing, running, or extending unit tests (Vitest), hook tests, or React Testing Library tests in stats-lycansv2."
---

# Testing

Use this skill for anything under `*.test.ts` / `*.test.tsx`, Vitest configuration, or React Testing Library usage.

## Runner Choice: Vitest, Not Jest

This repo is full ESM (`package.json` `"type": "module"`, `tsconfig.app.json` `moduleResolution: "bundler"`, `verbatimModuleSyntax: true`). Jest fights those settings and needs ts-jest/babel-jest workarounds. **Vitest** is used instead: Vite-native, near-zero config, Jest-compatible `describe`/`it`/`expect`/`vi` API. `@testing-library/react` + `@testing-library/jest-dom` are used for component/hook rendering, same as a Jest+RTL setup would use.

## Configuration

- Vitest config lives inside the existing `vite.config.ts` under the `test` key (not a separate `vitest.config.ts`) — keep it that way so there's a single source of truth for both the dev/build pipeline and the test runner.
- `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`.
- `tsconfig.app.json` has `"types": ["vitest/globals", "@testing-library/jest-dom"]` so `describe`/`it`/`expect`/`vi` and jest-dom matchers type-check without per-file imports.
- `src/test/setup.ts` registers jest-dom matchers globally (`import '@testing-library/jest-dom/vitest'`). Add other global setup here, not in individual test files.
- Scripts: `npm run test` (single run, used in CI-style verification) and `npm run test:watch` (watch mode for local dev).

## File Placement And Naming

- Colocate test files next to the source they cover, e.g. `src/utils/roleUtils.ts` → `src/utils/roleUtils.test.ts`. This is Vitest's default discovery glob; no extra config needed.
- Test files under `src/` are included by `tsconfig.app.json`'s existing `include: ["src"]` and are type-checked by `tsc -b` (part of `npm run build`) like any other source file.

## Testing Patterns By Layer

| Target | Pattern |
| --- | --- |
| Pure functions (no DOM/context) | Plain `describe`/`it`, table-driven with `it.each` for multiple input/output pairs. See `src/utils/durationFormatters.test.ts`. |
| Branch logic over typed objects (e.g. `PlayerStat`) | Build a local `makeX(overrides)` factory that fills all required fields with sensible defaults and spreads `overrides`, instead of casting partial objects. See `src/utils/roleUtils.test.ts`. |
| `window.location`/history-dependent utils (`urlManager.ts`) | Reset `window.history.replaceState({}, '', '/')` in `beforeEach` since these mutate global URL state across tests in the same file. See `src/utils/urlManager.test.ts`. |
| Context + hook (`useSettings`, and by extension the `*FromRaw` hooks in `src/hooks/`) | `renderHook(() => useXxx(), { wrapper: XxxProvider })` from `@testing-library/react`; wrap state-mutating calls (e.g. `updateSettings(...)`) in `act(...)`. Clear `localStorage` and reset `window.history` in `beforeEach` for `SettingsContext`. See `src/context/SettingsContext.test.tsx`. |

## Known Gaps (Not Yet Set Up)

- **Component rendering tests are not yet configured.** Recharts' `ResponsiveContainer` renders at 0×0 in jsdom by default; a `ResizeObserver`/dimension mock or a `recharts` mock is needed before writing chart component tests. Flag this explicitly before starting that work rather than assuming it works out of the box.
- **Fetch-mocking for the `*FromRaw` data hooks is not yet set up.** Hooks that call `fetchDataFile()`/`fetchOptionalDataFile()` (ultimately backed by `useCombinedRawData`) need a fetch or MSW mock of the relevant `data/*.json` shape; only context-only hooks (no network calls) are covered by the current example tests.
- No coverage thresholds or CI workflow run tests automatically yet — tests are run locally via `npm run test`.
