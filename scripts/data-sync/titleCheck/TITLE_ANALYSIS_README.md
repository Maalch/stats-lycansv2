# Title Eligibility Analysis Tool

## Overview

The `analyze-title-eligibility.js` script analyzes which players are closest to earning each title, especially hard-to-achieve combination titles like "La Légende", "Sniper Elite", and "Le·a Justicier·ère".

## Usage

```bash
# Basic usage (analyze all titles for main team)
node scripts/data-sync/analyze-title-eligibility.js main

# Filter by priority (show only high-priority titles)
node scripts/data-sync/analyze-title-eligibility.js main --priority 18

# Specific titles only
node scripts/data-sync/analyze-title-eligibility.js main --title legende,sniper_elite,justicier

# Show more candidates per title
node scripts/data-sync/analyze-title-eligibility.js main --top 10

# JSON output for programmatic consumption
node scripts/data-sync/analyze-title-eligibility.js main --json

# Discord team data
node scripts/data-sync/analyze-title-eligibility.js discord --priority 15
```

## Options

- `[main|discord]` - Team to analyze (default: main)
- `--priority <num>` - Only show titles with priority >= <num>
- `--title <ids>` - Comma-separated list of specific title IDs to analyze
- `--top <num>` - Number of top candidates to show per title (default: 5)
- `--json` - Output JSON format instead of formatted text
- `--include-awarded` - Include titles currently awarded to players

## Key Findings from Current Analysis

### ✅ **Titles That CAN Be Awarded**

1. **L'Adaptable** (Priority 18) - 🏆 **3 players with 100% match!**
   - **Ponce** (406 games) - Meets all 3 conditions
   - **Khalen** (346 games) - Meets all 3 conditions  
   - **Monodie** (385 games) - Meets all 3 conditions
   - Requirements: High win rates in all three camps (Villageois, Loup, Solo)
   - **Status**: READY TO AWARD - All required data available

### ❌ **Titles That CANNOT Be Awarded (Missing Data)**

Most high-priority titles cannot be awarded due to missing statistics:

1. **La Légende** (Priority 20)
   - Available: Win rate data (several players with EXTREME_HIGH: 86-97th percentile)
   - **Missing**: Win series data (longestWinSeries)
   - Top candidates: Arkantors (86th %), Noamouille (89th %), BoccA (97th %)

2. **Le·a MVP** (Priority 19)
   - Available: Win rate data  
   - **Missing**: Loot stats, Survival stats
   - Top candidates: Ponce (78th % win rate), Khalen (81st %), Monodie (62nd %)

3. **Sniper Elite** (Priority 18)
   - Problem 1: No players have 12%+ Chasseur games (need HIGH role frequency)
   - Problem 2: Even players with Chasseur don't have 10+ games to calculate hunter accuracy
   - **Status**: IMPOSSIBLE - Role assignment RNG prevents qualification

4. **Le·a Justicier·ère** (Priority 18)
   - Problem 1: No players have 12%+ Chasseur games
   - Problem 2: Kill rate shows 0 for all players (likely data computation issue)
   - **Missing**: Survival stats, correct kill rate calculation
   - **Status**: IMPOSSIBLE - Multiple blockers

5. **Le Loup Solitaire** (Priority 18)
   - Available: Win rate Loup data (several HIGH performers)
   - **Missing**: Loot Loup stats, Talking stats
   - Top candidates have good Loup win rates but lack other data

6. **La Machine** (Priority 18)
   - **Missing**: Loot stats, Talking stats
   - **Status**: IMPOSSIBLE - All required data missing

### 📊 **Missing Statistics Summary**

The following statistics are **not computed** or **not available** in current data:

- ❌ `longestWinSeries` / `longestLossSeries` - Series data
- ❌ `lootPer60Min` / `lootVillageoisPer60Min` / `lootLoupPer60Min` - All loot stats
- ❌ `talkingPer60Min` / `talkingOutsidePer60Min` / `talkingDuringPer60Min` - Talking stats
- ❌ `survivalRate` / `survivalDay1Rate` - Survival stats
- ⚠️  `killRate` - Shows 0 for all players (computation issue)
- ⚠️  `hunterAccuracy` - Only available if player has 10+ games as Chasseur (rare)
- ⚠️  `votingAccuracy` / `votingAggressiveness` / `votingFirst` - Vote data availability unknown

### ✅ **Statistics That Work**

- ✓ `winRate` - Overall win rate (working correctly)
- ✓ `winRateVillageois` / `winRateLoup` / `winRateSolo` - Camp-specific win rates (working)
- ✓ `gamesPlayed` - Game count (working)
- ✓ Role frequency data - Works for roleChasseur checks (but players don't meet thresholds)

## Understanding Proximity Scores

The script calculates a **Proximity Score** (0-100%) showing how close a player is to earning each title:

- **100%** = Player meets ALL conditions and can receive the title
- **50%** = Player meets half the conditions
- **0%** = Player meets none of the conditions or has missing data
- Values between 0-100% indicate partial qualification

The proximity score accounts for:
1. **Met conditions**: Count as 1.0 (100%)
2. **Nearly-met conditions**: Scored based on percentile gap
3. **Missing data**: Contributes 0 to the score

## Output Interpretation

For each title, the report shows:

```
🏆 TOP N CANDIDATES:

🥇 #1: PlayerName (X games)
   Proximity Score: 100% (3/3 conditions met)  ← Overall readiness
   ✓ statName (CATEGORY):                     ← Met condition
      Current: value (Xth %ile, CATEGORY)
   ✗ statName (CATEGORY):                     ← Unmet condition
      Current: value (Xth %ile, CURRENT_CAT)
      Gap: X percentile points needed          ← How far from threshold
```

## Recommendations

### Immediate Actions

1. ✅ **Award "L'Adaptable"** to top candidate(s) - All data available and 3 players qualify
2. 🔧 **Fix missing statistics** to enable more titles:
   - Implement series tracking (win/loss streaks)
   - Add loot statistics to compute functions
   - Add talking time statistics
   - Add survival rate calculations
   - Fix kill rate calculation (currently shows 0 for everyone)

### Future Improvements

3. 📉 **Consider title requirement adjustments**:
   - "Sniper Elite" and "Le·a Justicier·ère" may need lower Chasseur frequency (8% instead of 12%)
   - Or reduce minimum hunter accuracy games from 10 to 5
   - Role-based titles are inherently difficult due to RNG

4. 🎯 **Add incremental data collection**:
   - Start tracking series, loot, talking, and survival in new games
   - Backfill historical data if possible

## Technical Details

### How It Works

1. **Load game data** - Reads from gameLog.json
2. **Compute statistics** - Uses same compute functions as generate-titles.js
3. **Calculate percentiles** - Ranks all players for each stat
4. **Evaluate conditions** - Checks each player against each title's requirements
5. **Calculate proximity** - Scores how close players are to qualifying
6. **Generate report** - Shows top candidates with detailed breakdown

### Dependencies

- All compute functions from `scripts/data-sync/compute/`
- Title definitions from `scripts/data-sync/titleDefinitions.js`
- Data sources config from `scripts/data-sync/shared/data-sources.js`

### Performance

- Processes 451 modded games in ~2-3 seconds
- Analyzes 37 eligible players (25+ games) against 77 combination titles
- Outputs detailed reports with condition-by-condition breakdowns

## Example: Why "La Légende" Isn't Awarded

```
🏅 La Légende (Priority 20)
Requirements:
  1. winRate: EXTREME_HIGH (≥85th percentile)
  2. winSeries: HIGH (≥65th percentile)

Top Candidate: BoccA (76 games)
  Proximity: 50% (1/2 conditions met)
  ✓ winRate: 52.6% (97th percentile) ✓✓✓
  ✗ winSeries: Missing data ❌

Diagnosis: Win series data not computed. BoccA has exceptional win rate
(top 3%) but we can't evaluate win streaks. Need to implement series tracking.
```

## Support

For issues or questions:
- Check compute functions in `scripts/data-sync/compute/`
- Verify data availability in gameLog.json
- Compare with generate-titles.js for correct field mappings
