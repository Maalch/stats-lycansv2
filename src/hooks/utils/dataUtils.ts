/**
 * Shared utility functions for raw data processing hooks
 */

// Helper to parse DD/MM/YYYY to Date
export function parseFrenchDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year) return null;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

// Helper function to split and trim strings like the Google Apps Script
export function splitAndTrim(str: string | null | undefined): string[] {
  return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
}

// Helper function to determine if a player won the game
export function didPlayerWin(playerName: string, winnerList: string | null | undefined): boolean {
  if (winnerList && winnerList.trim() !== "") {
    const winners = splitAndTrim(winnerList);
    return winners.some(winner => winner.toLowerCase() === playerName.toLowerCase());
  }
  return false;
}

// Helper function to get player's camp in a specific game
export function getPlayerCamp(
  gamePlayerCampMap: Record<string, Record<string, string>>, 
  gameId: string, 
  playerName: string
): string {
  return (gamePlayerCampMap[gameId] && gamePlayerCampMap[gameId][playerName]) || "Villageois";
}

// Helper function to format date consistently
export function formatLycanDate(date: any): string {
  if (date instanceof Date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  if (typeof date === 'string') {
    // If it's already in DD/MM/YYYY format, return as is
    if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return date;
    }
    
    // Try to parse other formats and convert
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return formatLycanDate(parsed);
    }
  }
  
  return date?.toString() || '';
}

// Helper function to build game-player-camp mapping from role data
export function buildGamePlayerCampMap(rawRoleData: any[]): Record<string, Record<string, string>> {
  const gamePlayerCampMap: Record<string, Record<string, string>> = {};
  
  rawRoleData.forEach(roleRow => {
    const gameId = roleRow["Game"]?.toString();
    if (!gameId) return;

    if (!gamePlayerCampMap[gameId]) {
      gamePlayerCampMap[gameId] = {};
    }

    // Helper function to add a single role player
    const addRolePlayer = (player: string | null | undefined, roleName: string) => {
      if (player && player.toString().trim() !== "") {
        const playerName = player.toString().trim();
        if (!gamePlayerCampMap[gameId][playerName]) {
          gamePlayerCampMap[gameId][playerName] = roleName;
        }
      }
    };

    // Helper function to add multiple players from a comma-separated string
    const addMultiplePlayers = (players: string | null | undefined, roleName: string) => {
      if (players) {
        const playerArray = splitAndTrim(players.toString());
        playerArray.forEach(player => {
          if (!gamePlayerCampMap[gameId][player]) {
            gamePlayerCampMap[gameId][player] = roleName;
          }
        });
      }
    };

    // Add wolves (could be multiple)
    addMultiplePlayers(roleRow["Loups"], "Loups");

    // Add all other single roles
    addRolePlayer(roleRow["Traître"], "Traître");
    addRolePlayer(roleRow["Idiot du Village"], "Idiot du Village");
    addRolePlayer(roleRow["Cannibale"], "Cannibale");
    addRolePlayer(roleRow["Espion"], "Espion");
    addRolePlayer(roleRow["La Bête"], "La Bête");
    addRolePlayer(roleRow["Chasseur de primes"], "Chasseur de primes");
    addRolePlayer(roleRow["Vaudou"], "Vaudou");

    // Handle agents (could be multiple)
    addMultiplePlayers(roleRow["Agent"], "Agent");

    // Handle scientists (could be multiple)
    addMultiplePlayers(roleRow["Scientifique"], "Scientifique");

    // Handle lovers (could be multiple)
    addMultiplePlayers(roleRow["Amoureux"], "Amoureux");
  });

  return gamePlayerCampMap;
}

// Helper to determine if a camp won based on camp name and winner camp
export function didCampWin(camp: string, winnerCamp: string): boolean {
  if (camp === winnerCamp) return true;
  // Special case: Traitor wins if Wolves win
  if (camp === "Traître" && winnerCamp === "Loups") return true;
  return false;
}

// Helper to get player's main camp (Villageois or Loups) from game-player-camp map
export function getPlayerMainCamp(
  gamePlayerCampMap: Record<string, Record<string, string>>, 
  gameId: string, 
  playerName: string
): 'Villageois' | 'Loups' | 'Autres' {
  const camp = getPlayerCamp(gamePlayerCampMap, gameId, playerName);
  
  if (camp === 'Loups' || camp === 'Traître') {
    return 'Loups';
  } else if (['Idiot du Village', 'Cannibale', 'Agent', 'Espion', 'Scientifique', 'La Bête', 'Chasseur de primes', 'Vaudou', 'Amoureux'].includes(camp)) {
    return 'Autres';
  } else {
    return 'Villageois';
  }
}
