# Joueurs Data Integration

This document explains how to use the new `joueurs.json` data integration in the stats-lycansv2 project.

## Files Created

### 1. TypeScript Interfaces (`src/types/joueurs.ts`)

```typescript
export interface Player {
  Joueur: string;        // Player name
  Image: string | null;  // Profile image URL (can be null)
  Twitch: string | null; // Twitch channel URL (can be null)
  Youtube: string | null; // YouTube channel URL (can be null)
}

export interface JoueursData {
  TotalRecords: number;  // Total number of players
  Players: Player[];     // Array of all players
}
```

### 2. React Hooks (`src/hooks/useJoueursData.tsx`)

Multiple hooks are provided for different use cases:

- `useJoueursData()` - Main hook to fetch all joueurs data
- `usePlayersList()` - Gets just the players array
- `usePlayer(playerName)` - Find a specific player by name
- `usePlayerNames()` - Gets array of player names only
- `usePlayersWithSocialMedia()` - Gets players who have Twitch or YouTube links

### 3. Utility Functions (`src/utils/playersUtils.ts`)

Helper functions for common player operations:

- `findPlayerByName(players, name)` - Case-insensitive player search
- `getPlayerNames(joueursData)` - Extract player names
- `getPlayersWithSocialMedia(players)` - Filter players with social links
- `searchPlayersByName(players, searchTerm)` - Search players by partial name
- `sortPlayersByName(players, ascending)` - Sort players alphabetically
- `isValidPlayerName(players, name)` - Check if player name exists

## Usage Examples

### Basic Data Fetching

```typescript
import { useJoueursData } from '../hooks/useJoueursData';

function PlayerList() {
  const { joueursData, isLoading, error } = useJoueursData();

  if (isLoading) return <div>Chargement des joueurs...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!joueursData) return <div>Aucune donnée disponible</div>;

  return (
    <div>
      <h2>Total: {joueursData.TotalRecords} joueurs</h2>
      <ul>
        {joueursData.Players.map(player => (
          <li key={player.Joueur}>
            {player.Joueur}
            {player.Image && <img src={player.Image} alt={player.Joueur} />}
            {player.Twitch && <a href={player.Twitch}>Twitch</a>}
            {player.Youtube && <a href={player.Youtube}>YouTube</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Player Search Component

```typescript
import { usePlayersList } from '../hooks/useJoueursData';
import { searchPlayersByName } from '../utils/playersUtils';
import { useState } from 'react';

function PlayerSearch() {
  const { players, isLoading, error } = usePlayersList();
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!players) return <div>Aucune donnée disponible</div>;

  const filteredPlayers = searchPlayersByName(players, searchTerm);

  return (
    <div>
      <input
        type="text"
        placeholder="Rechercher un joueur..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <ul>
        {filteredPlayers.map(player => (
          <li key={player.Joueur}>{player.Joueur}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Using Utility Functions

```typescript
import { usePlayersList } from '../hooks/useJoueursData';
import { getPlayersWithSocialMedia, sortPlayersByName } from '../utils/playersUtils';

function SocialMediaPlayers() {
  const { players, isLoading, error } = usePlayersList();

  if (isLoading || error || !players) return null;

  const playersWithSocial = getPlayersWithSocialMedia(players);
  const sortedPlayers = sortPlayersByName(playersWithSocial);

  return (
    <div>
      <h3>Joueurs avec réseaux sociaux ({playersWithSocial.length})</h3>
      {sortedPlayers.map(player => (
        <div key={player.Joueur}>
          <strong>{player.Joueur}</strong>
          <div>
            {player.Twitch && <a href={player.Twitch}>Twitch</a>}
            {player.Youtube && <a href={player.Youtube}>YouTube</a>}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Integration with Existing Systems

These new hooks and utilities can be integrated with the existing:

- **Player Selection System**: ✅ **IMPLEMENTED** - Player images and social media links displayed in PlayerSelectionPage
- **Settings Context**: Integrate with player filters using `isValidPlayerName()`
- **Achievement System**: Link player names to their social media profiles
- **Chart Components**: Add player profile images to charts using the `Image` field

## PlayerSelectionPage Integration

The PlayerSelectionPage has been updated to include:

### Visual Features
- **Player Avatars**: Profile images from Twitch/YouTube displayed for each player
- **Fallback Placeholders**: First letter of player name in colored circle when no image available
- **Social Media Links**: Direct links to Twitch and YouTube channels
- **Large Player Cards**: Enhanced display for highlighted players with bigger avatars

### Search Results
- Each suggestion now shows:
  - Player profile image or initial placeholder
  - Player name with highlighting indicator
  - Game statistics (games played, win rate)
  - Social media links (when available)

### Enhanced Player Display
- **Large Avatar**: 80x80px image for highlighted player
- **Social Links**: Clickable Twitch and YouTube buttons with platform colors
- **Statistics Summary**: Games, wins, and win rate in a clean format

## Data Source

The data is automatically copied from `/data/joueurs.json` to `/public/data/joueurs.json` during the build process, ensuring it's available for the frontend to fetch.