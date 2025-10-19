# Types Directory

## Overview

This directory contains TypeScript type definitions and constants used throughout the stats-lycansv2 application.

## Files

### `deathTypes.ts` ⭐ NEW
**Centralized Death Type System**

Single source of truth for all death types in the game. Provides:
- Type-safe constants (`DEATH_TYPES`)
- TypeScript type (`DeathType`)
- Categorization system (`DEATH_TYPE_CATEGORIES`)
- Utility functions (validators, labels, normalization)
- Human-readable French labels

**Usage:**
```typescript
import { DEATH_TYPES, type DeathType, isValidDeathType } from './types/deathTypes';

if (player.DeathType === DEATH_TYPES.VOTED) {
  // Type-safe comparison
}
```

See [DEATH_TYPES_MIGRATION.md](./DEATH_TYPES_MIGRATION.md) for complete migration guide.

### `api.ts`
API response types and data structures for game statistics.

### `joueurs.ts`
Player (joueurs) data type definitions.

## Design Principles

1. **Type Safety**: Leverage TypeScript's type system to catch errors at compile time
2. **Single Source of Truth**: One definition per concept, imported everywhere
3. **Developer Experience**: Autocomplete, inline documentation, helpful error messages
4. **Backward Compatibility**: Re-exports maintain existing import paths

## Adding New Types

When adding new type definitions:

1. Create a new file or add to existing file based on domain
2. Export types using `export type` or `export interface`
3. Export constants using `export const ... as const` for literal types
4. Add JSDoc comments for documentation
5. Update this README with usage examples

## Related Documentation

- [Death Types Migration Guide](./DEATH_TYPES_MIGRATION.md) - Complete migration documentation
- [Project Documentation](../../.github/copilot-instructions.md) - Overall architecture
