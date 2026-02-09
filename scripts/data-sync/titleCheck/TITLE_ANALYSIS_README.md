# Title Eligibility Analysis Tool

## Overview

The `analyze-title-eligibility.js` script analyzes which players are closest to earning each title, especially hard-to-achieve combination titles like "La Légende", "Sniper Elite", and "Le·a Justicier·ère".

## Usage

```bash
# Basic usage (analyze all titles for main team)
node scripts/data-sync/titleCheck/analyze-title-eligibility.js main

# Filter by priority (show only high-priority titles)
node scripts/data-sync/titleCheck/analyze-title-eligibility.js main --priority 18

# Specific titles only
node scripts/data-sync/titleCheck/analyze-title-eligibility.js main --title legende,sniper_elite,justicier

# Show more candidates per title
node scripts/data-sync/titleCheck/analyze-title-eligibility.js main --top 10

# JSON output for programmatic consumption
node scripts/data-sync/titleCheck/analyze-title-eligibility.js main --json

# Discord team data
node scripts/data-sync/titleCheck/analyze-title-eligibility.js discord --priority 15
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
   - Available: Win rate data ✓, Win series data ✓, Games played ✓
   - **Status**: All data available but no player meets all 3 thresholds simultaneously
   - Top candidates: Arkantors (2/3 met, 97%), BoccA (2/3 met, 95%), Baout (1/3 met, 99%)
   - **Closest**: BoccA and Arkantors both have EXTREME_HIGH win rate + HIGH win series, but game count percentiles don't match the undefined requirement

2. **Le·a MVP** (Priority 19)
   - Available: Win rate data ✓
   - **Missing**: Loot stats, Survival stats
   - Top candidates: Ponce (78th % win rate), Khalen (81st %), Monodie (62nd %)

3. **Sniper Elite** (Priority 18)
   - Available: Hunter shot accuracy ✓, Hunter kill accuracy ✓
   - **Status**: 6 players have data, but no one meets BOTH HIGH thresholds
   - Top candidates: Lutti (95.3%, has HIGH shot accuracy but ABOVE_AVERAGE kill accuracy), Anaee (81.4%), Khalen (82.2%)
   - **Challenge**: Requires excellence in both shot accuracy (hits/misses) AND kill targeting (non-Villageois victims)

4. **Le·a Justicier·ère** (Priority 18)
   - Available: Kill rate ✓, Survival rate ✓
   - **Blocker**: No players have 12%+ Chasseur games (role frequency requirement)
   - Top candidates: Khalen (2/3 met, only 4.6% Chasseur), Monodie (2/3 met, 7.8%), Arkantors (2/3 met, 10.1%)
   - **Status**: IMPOSSIBLE due to role RNG - highest Chasseur frequency is 10.1% (Arkantors)

5. **Le Loup Solitaire** (Priority 18)
   - Available: Win rate Loup data (several HIGH performers) ✓
   - **Missing**: Loot Loup stats, Talking stats
   - Top candidates have good Loup win rates but lack other data

6. **La Machine** (Priority 18)
   - **Missing**: Loot stats, Talking stats
   - **Status**: IMPOSSIBLE - All required data missing

### 📊 **Missing Statistics Summary**

The following statistics are **not computed** or **not available** in current data:

- ❌ `lootPer60Min` / `lootVillageoisPer60Min` / `lootLoupPer60Min` - All loot stats (not in game logs)
- ❌ `talkingPer60Min` / `talkingOutsidePer60Min` / `talkingDuringPer60Min` - Talking stats (not in game logs)
- ⚠️  `hunterAccuracy` / `hunterShotAccuracy` - Available but requires 10+ games/shots as Chasseur (only 6 players qualify)
- ⚠️  `votingAccuracy` / `votingAggressiveness` / `votingFirst` - Vote data availability unknown

### ✅ **Statistics That Work**

- ✓ `winRate` - Overall win rate (working correctly)
- ✓ `winRateVillageois` / `winRateLoup` / `winRateSolo` - Camp-specific win rates (working)
- ✓ `longestWinSeries` / `longestLossSeries` - Series data (working correctly)
- ✓ `survivalRate` / `survivalDay1Rate` - Survival stats (working correctly)
- ✓ `killRate` - Kill rate per game (working correctly)
- ✓ `gamesPlayed` - Game count (working)
- ✓ `hunterAccuracy` - Kill-based accuracy for hunters with 10+ games (working, 6 players qualify)
- ✓ `hunterShotAccuracy` - Shot-based accuracy for hunters with 10+ shots (working, 6 players qualify)
- ✓ Role frequency data - Works for all role checks (but players rarely meet HIGH thresholds due to RNG)

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
   - Add loot statistics to game logs and compute functions
   - Add talking time statistics to game logs and compute functions
3. 🎯 **Consider "La Légende" eligibility** - All data exists, need to clarify the `gamesPlayed` requirement (currently undefined category)

### Future Improvements

4. 📉 **Consider title requirement adjustments**:
   - **"Sniper Elite"**: Current requirements work but are extremely difficult - no player achieves both HIGH thresholds. Consider:
     - Accepting one HIGH + one ABOVE_AVERAGE threshold, OR
     - Lowering percentile thresholds slightly
   - **"Le·a Justicier·ère"**: Impossible due to 12% Chasseur frequency (highest is 10.1%). Consider:
     - Lowering Chasseur frequency from HIGH (12%) to ABOVE_AVERAGE (8%), OR
     - Removing role frequency requirement entirely (rely on kill rate + survival only)
   - Role-based titles are inherently difficult due to RNG

5. 🎯 **Implement missing data collection**:
   - Start tracking loot statistics in game logs
   - Start tracking talking time in game logs
   - Backfill historical data if possible from game recordings

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

## Example: Why "Sniper Elite" Isn't Awarded

```
🎖️ Sniper Elite (Priority 18)
Requirements:
  1. hunterShotAccuracy: HIGH (≥65th percentile)
  2. hunterAccuracy: HIGH (≥65th percentile)

Top Candidate: Lutti (340 games)
  Proximity: 95.3% (1/2 conditions met)
  ✓ hunterShotAccuracy: 100% (83rd percentile) ✓✓✓
  ✗ hunterAccuracy: 77.3% (56th percentile, ABOVE_AVERAGE)
     Gap: 9 percentile points needed

Diagnosis: Lutti has exceptional shot accuracy (never misses) but their kill 
targeting accuracy (77% non-Villageois kills) falls just below the HIGH threshold.
Title requires excellence in BOTH metrics simultaneously, which is extremely rare.

Alternative candidates:
- Anaee: High shot accuracy (94%, 67th %ile) but low kill accuracy (60%, 28th %ile)
- Tsuna: High kill accuracy (100%, 83rd %ile) but low shot accuracy (73%, 17th %ile)

No player combines both HIGH thresholds. Consider adjusting requirements to one HIGH 
+ one ABOVE_AVERAGE, or lowering percentile thresholds.
```

## Support

For issues or questions:
- Check compute functions in `scripts/data-sync/compute/`
- Verify data availability in gameLog.json
- Compare with generate-titles.js for correct field mappings
