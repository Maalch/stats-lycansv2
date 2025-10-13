# 🗳️ Voting Statistics Features - Implementation Summary

## Overview
Comprehensive voting behavior analysis system for the Lycans werewolf game, analyzing voting patterns, accuracy, and special role mechanics during meeting phases.

## ✨ New Features Implemented

### 1. **VotingStatisticsChart** - Main Voting Dashboard
**Path:** `src/components/playerstats/VotingStatisticsChart.tsx`

**Features:**
- **Multiple Views:**
  - 📊 **Vue d'ensemble**: Overall voting statistics with pie charts and top performers
  - 🗳️ **Comportements de vote**: Aggressiveness scores based on voting/skipping/abstention patterns
  - 🎯 **Précision des votes**: Accuracy rates for targeting enemy vs own camp
  - 🔻 **Joueurs ciblés**: Survival rates when targeted by votes

**Key Metrics:**
- **Aggressiveness Score**: `votingRate - (skippingRate * 0.5) - (abstentionRate * 0.7)`
- **Accuracy Rate**: `(votesForEnemyCamp / totalVotes) * 100`
- **Survival Rate**: `((totalTimesTargeted - eliminationsByVote) / totalTimesTargeted) * 100`

### 2. **VotingAnalysisChart** - Advanced Analysis
**Path:** `src/components/playerstats/VotingAnalysisChart.tsx`

**Features:**
- **📈 Tendances par Réunion**: Meeting-by-meeting participation trends and elimination rates
- **🎯 Consistance des Joueurs**: Voting behavior consistency across games
- **🗳️ Patterns de Vote**: Relationship between aggressiveness and accuracy
- **🎮 Détails par Partie**: Individual game voting breakdowns

**Advanced Analytics:**
- Meeting participation evolution throughout games
- Player consistency scoring based on behavioral variance
- Scatter plot analysis of voting patterns
- Reference lines for optimal voting rates (70% participation, 50% accuracy)

### 3. **VotingInsightsChart** - Special Role Analysis
**Path:** `src/components/playerstats/VotingInsightsChart.tsx`

**Features:**
- **🎭 Succès Idiot du Village**: Analysis of "Idiot du Village" strategy success rates
- **🔥 Feu Ami par Camp**: Friendly fire rates by camp (voting own teammates)
- **⏰ Patterns de Timing**: Early vs late game voting consistency
- **🎯 Précision par Camp**: Average accuracy rates by player camp affiliation

**Special Insights:**
- Idiot du Village win condition analysis (needs to be voted out to win)
- Camp-based friendly fire statistics
- Voting timing consistency metrics
- Role-specific voting behavior patterns

## 🔧 Technical Implementation

### Core Utilities
**File:** `src/utils/votingStatsUtils.ts`

**Key Functions:**
- `calculateGameVotingAnalysis()`: Per-game voting analysis
- `calculateAggregatedVotingStats()`: Cross-game statistics aggregation
- `wasPlayerAliveAtMeeting()`: Meeting participation validation
- `wasVoteSuccessful()`: Vote outcome determination

**Data Structures:**
```typescript
interface VotingBehaviorStats {
  playerName: string;
  totalMeetings: number;
  totalVotes: number;
  totalSkips: number;          // "Passé" votes
  totalAbstentions: number;    // No vote cast
  votingRate: number;
  skippingRate: number;
  abstentionRate: number;
  aggressivenessScore: number;
}

interface VotingAccuracyStats {
  playerName: string;
  totalVotes: number;
  votesForEnemyCamp: number;
  votesForOwnCamp: number;     // Friendly fire
  votesForSelf: number;
  accuracyRate: number;
  friendlyFireRate: number;
}

interface VotingTargetStats {
  playerName: string;
  totalTimesTargeted: number;
  timesTargetedByEnemyCamp: number;
  timesTargetedByOwnCamp: number;
  eliminationsByVote: number;
  survivalRate: number;
}
```

### Hooks Architecture
**File:** `src/hooks/useVotingStatisticsFromRaw.tsx`

- Follows established base hook pattern
- `useVotingStatisticsFromRaw()`: Core voting statistics
- `useFilteredVotingStatistics()`: Filtered by minimum participation threshold

### Data Source Integration
**Updated:** `src/hooks/useCombinedRawData.tsx`

**Vote Interface Enhancement:**
```typescript
interface Vote {
  MeetingNr: number;              // Meeting number (1, 2, 3, etc.)
  Target: string;                 // Player name or "Passé" for abstention
  Date: string | null;            // ISO date (may be null for legacy data)
}
```

## 📊 Game Rules Integration

### Meeting Phase Analysis
- **Participation**: Tracks votes, skips ("Passé"), and abstentions per meeting
- **Elimination Logic**: Majority vote leads to elimination (except "Idiot du Village" special case)
- **Camp Detection**: Uses `getPlayerCampFromRole()` for accurate camp classification

### Special Role Mechanics
- **Idiot du Village**: Wins by being eliminated by vote (opposite of normal logic)
- **Camp Accuracy**: Villagers should vote Loups, Loups should vote Villagers
- **Friendly Fire**: Penalty for voting same camp members

### Timing Analysis
- **Early Meetings**: First half of game meetings
- **Late Meetings**: Second half of game meetings
- **Consistency Scoring**: Measures behavioral stability across game phases

## 🎯 Key Insights Provided

### Player Behavior Patterns
1. **Aggressive Voters**: High voting rates, low abstentions
2. **Strategic Skippers**: High "Passé" rates during uncertain phases
3. **Silent Players**: High abstention rates, minimal participation

### Accuracy Metrics
1. **Sharp Shooters**: High accuracy targeting enemy camps
2. **Friendly Fire Risk**: Players who frequently vote own camp
3. **Self-Targeting**: Unusual self-vote patterns

### Role-Specific Analysis
1. **Idiot Success Rate**: Effectiveness of getting voted out to win
2. **Camp Loyalty**: How well camps avoid friendly fire
3. **Meeting Dynamics**: Participation trends throughout game progression

## 🔄 Integration with Existing System

### Menu Structure
Added to **Joueurs** tab:
- **Statistiques de Vote**: Main voting dashboard
- **Analyse des Votes**: Advanced meeting-by-meeting analysis  
- **Insights des Votes**: Special role and pattern insights

### Navigation Integration
- Full integration with `NavigationContext` for drill-down navigation
- Player highlighting system support
- `handlePlayerClick()` navigation to game details with proper filters

### Settings Integration
- Respects all existing game filters (date range, modded games, etc.)
- Minimum meetings threshold filtering
- Player highlighting across all voting charts

## 📈 Performance Considerations

### Data Processing
- Lazy loading for all voting components
- Optimized base hook pattern for caching
- Efficient aggregation algorithms for large datasets

### Chart Rendering
- ResponsiveContainer for adaptive sizing
- Tooltip optimization for complex data display
- Theme-adjusted colors for accessibility

## 🎮 User Experience

### Interactive Features
- **Clickable Charts**: Navigate to player game details
- **Dynamic Filtering**: Adjust minimum participation thresholds
- **Multi-View Dashboard**: Switch between different analysis perspectives
- **Detailed Tooltips**: Rich contextual information on hover

### Visual Design
- **Color Coding**: Camp-specific colors, player-specific colors
- **Reference Lines**: Ideal performance thresholds
- **Progress Indicators**: Loading states and error handling
- **Highlighting System**: Selected player emphasis across all charts

## 🔮 Future Enhancements

### Potential Extensions
1. **Meeting Prediction**: ML models for predicting voting outcomes
2. **Alliance Detection**: Graph analysis of voting patterns to detect temporary alliances
3. **Meta-Game Evolution**: Tracking how voting strategies change over time
4. **Role Reveal Impact**: Analysis of how role reveals affect subsequent voting
5. **Communication Correlation**: If chat logs become available, correlate messaging with voting

### Advanced Analytics
1. **Voting Networks**: Graph-based analysis of who votes for whom
2. **Influence Scoring**: Measure player influence on other's voting decisions
3. **Elimination Prediction**: Probability models for who gets voted out
4. **Strategy Classification**: Automated classification of voting strategies

---

**Integration Status**: ✅ Complete and fully integrated  
**Testing Status**: ✅ Development server verified  
**Documentation**: ✅ Comprehensive inline comments and type definitions