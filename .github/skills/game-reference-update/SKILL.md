---
name: game-reference-update
user-invocable: false
description: "Use when updating data/gameReference.json for a new Lycans game version, from an official patch note and/or game code git commits/hashes: roles, powers, accessories, gadgets, effects, events, game rules, or the reference version metadata in stats-lycansv2."
---

# Game Reference Update

Use this skill to bring `data/gameReference.json` up to date with a new Lycans v2 game version. Inputs can be an official patch note (French, pasted by the user), game code commits (repo URL + commit hashes/range), or both. Statistics/gameLog work belongs to `data-sync-statistics`, not here.

## Principles

- The reference documents **gameplay only**: what a role/power/item/effect does and the rules players must know. Do **not** track bug fixes, performance work, visual/particle/audio tweaks, UI polish, or keybinding changes.
- Keep it **qualitative**, matching the existing style: numbers are only kept when they define a mechanic (e.g. "40% de santé", "8 secondes"). Balance nudges without a value ("charge légèrement augmentée") are skipped or stated qualitatively.
- All text is in **French**, same tone and sentence style as neighbouring entries. No markup (`<color>`, `{0}`), no changelog phrasing ("nouveau", "désormais", "ne ... plus", version numbers): describe the *current* behaviour, not the diff.
- Edit the descriptions of existing entries in place; never append "V362: ..." notes.
- Edit only `data/gameReference.json` by hand. `docs/data/` and `public/data/` are generated copies (see Sync below).
- **If in doubt, ask the user** (one question at a time, with choices) instead of guessing. Typical doubts: ambiguous wording, whether a change is gameplay or only a bug fix, missing numbers, entries that no longer match the game.

## Workflow

1. **Triage every patch-note line** into: *document*, *skip* (non-gameplay), or *unclear* (ask). Do this before editing. Skip examples: bug fixes ("est correctement tué", "réduit correctement l'objectif"), particle/performance changes, visual-only changes, key rebinds, cosmetic/flavour changes, renames already reflected.
2. **Locate the target entries** with grep on the French name (patch-note names are the in-game names; ids are lowercase kebab-case without accents). Also check `gameRules`, `statusEffects`, `potionEffects`, `accessories`, `gadgets` for cross-mentions (e.g. an effect an ability applies).
3. **Apply edits** to `description`, and to `descriptionShort`, `descriptionVillager`/`descriptionWolf`, `tutorial`, `tinkererEffect` when those would become wrong.
4. **Update `_meta`**: `version` (format `"0.<number>"`, so patch V362 → `"0.362"`) and `lastUpdated` (today, `YYYY-MM-DD`).
5. **Validate**: `node -e "JSON.parse(require('fs').readFileSync('data/gameReference.json','utf8'));console.log('ok')"`, then review `git --no-pager diff data/gameReference.json`. Make sure no text was invented that is not in the patch note/code.
6. **Report** to the user: what was documented, what was skipped (and why), and any assumption made.

## Where Things Live In `data/gameReference.json`

| Section | Content | Notes |
|---|---|---|
| `_meta` | description, `version`, `lastUpdated`, notes | Bump version + date every update |
| `camps` | Villageois / Loups / Solo, `roles` list | Update `roles` if a main role is added/removed |
| `mainRoles` | Base, elite, special and solo roles (Bête, Cultiste, Vaudou...) | Have `translationKey` |
| `wolfPowers` | Pouvoirs de loup (Nécromancien, Traqueur, Artificier, Hôte...) | |
| `villagerPowers` | Métiers de villageois (Prêtre, Inventeur...) | |
| `elitePowers` | Chasseur, Alchimiste, Guetteur, Purificateur | |
| `secondaryRoles` | Politicien, Ingénieur... | May have `descriptionVillager` / `descriptionWolf`: keep consistent with `description` |
| `deadRoles` | Fantôme, Spectre, Ange gardien, Zombie | |
| `accessories` / `gadgets` | Items (Livre de sorts, Longue-vue...) | Accessories also have `tinkererEffect` (Bricoleur) |
| `potionEffects` / `statusEffects` | Effects with `tutorial` text | The same effect can appear in both; keep both in sync |
| `events` | Random game events | |
| `mayor` | Maire abilities | |
| `gameRules` | `details` arrays: game loop, meetings, harvest, transformation, sabotage, draft... | General mechanics and player-facing features (spectator mode, meeting actions) go here |
| `gameLogValueMappings` | Maps gameLog.json values to ids | See below |

TypeScript shapes are in `src/hooks/useGameReference.ts` (`GameReferenceData`); keep new fields compatible with them, or update the interfaces if a new field is truly needed.

## Adding / Removing / Renaming Entries

- **New role or power**: add the entry in the right section with `id`, `name` (exactly the French value written in gameLog.json), `emoji`, `description`, `descriptionShort`, and `translationKey` (`NALES_ROLE_DESCRIPTION_<NAME>` pattern, from the game's `translations.json` or the code if available). Then register it in `gameLogValueMappings` (`powerToCategory`, `mainRoleInitialToCategory`, or `secondaryRoleToId`) and in `camps[].roles` when it is a main role. An entry may already exist from an earlier beta commit: update it rather than duplicating it.
- **Removed/replaced role or power**: keep the mapping with `"legacy": true, "replacedBy": "<id>"` (old games still use the value in gameLog.json) and remove or rewrite the section entry, as previous removals did.
- **Renamed role**: change `name` (and the mapping key if gameLog values change) but keep the `id` stable; keep the old name as a legacy mapping if past games used it.
- **New effect**: add to `statusEffects` (and to `potionEffects` if obtainable from a potion/scroll, with `type` and `durationSeconds`). Nothing in `src/` or `scripts/` references individual power ids, so no other file normally needs updating.
- **New game-wide feature or rule**: add a line to the relevant `gameRules[].details`, or a new `gameRules` entry when it is a whole new system.

## Using Game Code Commits (When Provided)

The user may give a repository and commit hashes/range instead of (or on top of) a patch note.

1. Inspect the commits (`git --no-pager log --stat <range>` / `git show <hash>` in a clone, or `gh api` for remote repos). Never copy secrets or large code blocks into this repo.
2. Extract **behavioural** facts from the diff: ability triggers and targets, durations, charge/cooldown rules, win/lose conditions, applied effects. Changes in `translations.json` are the best source of final player-facing wording and `translationKey` values.
3. Cross-check with the patch note: the patch note is authoritative on *what changed*, the code on *exact mechanics/numbers*. If they contradict, ask the user.
4. Apply the same triage and style rules as above. Constants found only in code are documented only if they define the mechanic; otherwise keep wording qualitative.
5. Mention the commit hashes/range in the final report (not in the JSON file).

## Sync Of Generated Copies

- `data/` is the source of truth. `docs/data/` is produced by `npm run copy-data` (also part of `npm run build`) and `public/data/` (git-ignored) by `npm run copy-data-dev`.
- Previous reference updates committed both `data/gameReference.json` and `docs/data/gameReference.json`. To avoid touching unrelated data files, copy only this file (e.g. `Copy-Item data\gameReference.json docs\data\gameReference.json -Force`), and only when the user wants the copies refreshed/committed.
- The app's own `CHANGELOG`/`APP_VERSION` in `src/config/version.ts` is a separate concern: only touch it if the user asks.

## Final Checklist

- [ ] Every patch-note line triaged (documented / skipped / asked)
- [ ] Descriptions state current behaviour, in French, with no changelog wording or bug fixes
- [ ] Related fields updated (`descriptionShort`, variants, `tutorial`, cross-section mentions)
- [ ] New/renamed/removed entries reflected in `gameLogValueMappings` and `camps[].roles`
- [ ] `_meta.version` and `_meta.lastUpdated` bumped
- [ ] JSON parses; diff reviewed
- [ ] Final report lists skipped items and assumptions
