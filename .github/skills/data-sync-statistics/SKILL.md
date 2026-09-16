---
name: data-sync-statistics
user-invocable: false
description: "Use when working on data sync, gameLog.json, server-side player statistics, compute modules, rankings, titles, achievements, achievement evaluators, playerRankings.json, playerTitles.json, or playerAchievements.json in stats-lycansv2."
---

# Data-Sync Statistics

Use this skill for server-side statistics and the generated player metadata they produce. For global architecture and data shapes, consult `.github/copilot-instructions.md`; keep ordinary chart-only UI, deployment, and source-fetching work outside this skill unless it changes a statistics contract.

## First Route The Request

Identify the output type before editing:

| Requested behavior | Owning code |
| --- | --- |
| Reusable aggregate metric | `scripts/data-sync/compute/` |
| Comparative player ranking | `scripts/data-sync/processors/` plus `generate-rankings.js` |
| Percentile-based player title | `compute/compute-titles-stats.js`, `shared/titleGenerators.js`, `shared/titleDefinitions.js` |
| Permanent threshold achievement | `shared/achievementDefinitions.js` plus `compute/achievements/evaluators-*.js` and `compute/achievements/index.js` |
| Source/team availability | `shared/data-sources.js` (`main`, `discord`) |

Do not edit `playerRankings.json`, `playerTitles.json`, `playerAchievements.json`, or `playerStatsCache.json` directly. They are generated outputs.

## Non-Negotiable Domain Rules

- Group or compare a player across games by `getPlayerId()` from `src/utils/datasyncExport.js`, never by a raw `Username`. Resolve display names through existing canonical-name utilities or `joueurs.json`.
- For camp-based win, kill, and survival metrics, resolve role changes first:

  ```js
  const finalRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
  const camp = getPlayerMainCampFromRole(finalRole, player.Power);
  ```

- For loot, talking time, role-assignment frequency, and wolf-transformation metrics, retain `MainRoleInitial`. This is intentional: a changed player no longer loots or talks, and role frequency records assigned roles.
- Support legacy elite roles and the modern `Villageois Élite` plus `Power` representation with shared role/camp helpers; do not add direct elite-role checks unless an existing helper cannot represent the rule.
- In achievement evaluators, match `KillerName`, vote targets, and action targets through `compute/achievements/helpers.js` (`isKilledByPlayer`, `getKillerPlayerId`, `isVoteTargetPlayer`, `isActionTargetPlayer`). Username equality is only valid for locating a player within the same game's `PlayerStats` array before comparing IDs.

## Integration Requirements

### Rankings

Add ranking logic in a matching file under `scripts/data-sync/processors/`, then integrate it in `generate-rankings.js`. When its input participates in cached ranking computation, update both full and incremental/cache paths so `playerStatsCache.json` remains correct. Keep the matching client ranking processor or hook in sync when the client also calculates or interprets that ranking.

### Titles

Expose a new source metric from `compute/compute-titles-stats.js`. Register it in `TITLE_STAT_REGISTRY` in `shared/titleGenerators.js`, then add its labels or combination conditions in `shared/titleDefinitions.js`. Preserve title eligibility thresholds, percentile direction, and the existing unique primary-title assignment behavior.

### Achievements

Add the display definition to `shared/achievementDefinitions.js`, implement the evaluator in the domain-appropriate `compute/achievements/evaluators-*.js` file, and export it through `compute/achievements/index.js`. Mark dependencies unavailable to Discord, including BR- or main-team-only clip data, with `mainTeamOnly: true`.

## Validation

Run the narrow generator after changing its pipeline:

```powershell
node scripts/data-sync/generate-rankings.js main
node scripts/data-sync/generate-titles.js main
node scripts/data-sync/generate-achievements.js main
```

When the behavior supports Discord, also run the corresponding command with `discord`. Inspect generated data for the intended schema and values, player-ID deduplication, role-change camp attribution, and Discord gating. Run `npm run build` when a generated-data client contract changes.

Use `--force-full` with rankings when a full cache recomputation is needed. Never hand-edit a generated file to make validation pass.