/**
 * @fileoverview Fonctions utilitaires réutilisables pour les statistiques Lycans
 */

// Constants pour les noms de feuilles
const LYCAN_SCHEMA = {
  GAMES: {
    SHEET: 'Game v2', //General game data par game
    COLS: {
      GAMEID: 'Game', //Game ID (unique)
      DATE: 'Date', //Date (format DD/MM/YYYY)
      MODDED: 'Game Moddée', //Checkbox: true / false if the game is modded
      VOD: 'VOD', //Link to the youtube VOD 
      NBPLAYERS: 'Nombre de joueurs', //Number of players in that game
      NBWOLVES: 'Nombre de loups', //Number of wolves in that game
      TRAITOR: 'Rôle Traître', //Checkbox: true / false if a traitor is in the game 
      LOVERS: 'Rôle Amoureux', //Checkbox: true / false if the lovers are in the game
      SOLO: 'Rôles solo',  //name of the solo roles. If several, separated with comma
      WINNERCAMP: 'Camp victorieux', //name of the winner camp ("Loups", "Villageois"...)
      VICTORYTYPE: 'Type de victoire', //Type of victory for the winning camp ("Vote", "Récolte", "Domination"...)
      NBDAYS: 'Nombre de journées', //number of days in the game
      SURVIVINGVILLAGERS: 'Survivants villageois', //number of villagers that survived at the end
      SURVIVINGWOLVES: 'Survivants loups (traître inclus)', //number of wolves (+ traitor) that survived in the end
      SURVIVINGLOVERS: 'Survivants amoureux', //number of lovers that survived in the end
      SURVIVINGSOLO: 'Survivants solo', //number of solo roles that survived in the game
      WINNERLIST: 'Liste des gagnants', //list of players that won this game, separated with comma if several winners
      HARVEST: 'Récolte', //haverst at the end of the game
      TOTALHARVEST: 'Total récolte', //total haverst needed in that game to win as villagers
      HARVESTPERCENT: 'Pourcentage de récolte', //percentage of haverst at the end of the game
      PLAYERLIST: 'Liste des joueurs' //list of players in that game, separated with comma    											
    }
  },
  GAMES2: {
    SHEET: 'Paramètres Games', //General game data par game, second page
    COLS: {
      GAMEID: 'Game', //Game ID (unique), same as Game v2 sheet
      MODDED: 'Game Moddée', //Checkbox: true / false if the game is modded
      VERSION: 'Versions', //Version of this game
      MAP: 'Map', //Map name of this game
      VODSTART: 'Début', //Youtube link to the start of the game. Format: https://www.youtube.com/watch?v=XXXXXXX&t=YYYs
      VODEND: 'Fin', //Youtube link to the end of the game. Format: https://www.youtube.com/watch?v=XXXXXXX&t=YYYs
      DURATION: 'Temps game' //Duration of the game
    }
  },
  PONCE: {
    SHEET: 'Ponce v2', //Data specific to player Ponce per game - secondary role, wolf role, players killed ... are only avaialble for him
    COLS: {
      GAMEID: 'Game', //Game ID (unique)
      MODDED: 'Game Moddée', //Checkbox: true / false if the game is modded
      CAMP: 'Camp', //Camp of Ponce ("Villageois", "Loups", "Idiot du village" ...)
      TRAITOR: 'Traître', //Checkbox: true / false if Ponce was the traitor in that game
      SECONDARYROLE: 'Rôle secondaire', //Name of the secondary role of Ponce
      WOLFROLE: 'Pouvoir de loup', //Name of the wolf role (if Ponce was wolf)
      VILLAGEROLE: 'Métier villageois', //Name of the villager role (if Ponce was Villager)
      PLAYERSKILLED: 'Joueurs tués', //List of players killed by Ponce, separated with comma
      DAYOFDEATH: 'Jour de mort', //Day of death (1, 2, 3, etc...) 
      TYPEOFDEATH: 'Type de mort',	//Type of death ("Tué par loup", "Mort de faim", "Mort aux votes"...)
      KILLERPLAYERS: 'Joueurs tueurs' //list of players involved in Ponce death (usually one, but several for "Vote" for example)
    }
  },
  ROLES: {
    SHEET: 'Loups et solo v2', //Data specific about the roles per game
    COLS: {
      GAMEID: 'Game', //Game ID (unique)
      MODDED: 'Game Moddée', //Checkbox: true / false if the game is modded
      WOLFS: 'Loups', //Name of the wolves in the game, separated by comma
      TRAITOR: 'Traître', //name of the traitor in the game (if any)
      IDIOT: 'Idiot du village', //name of the idiot in the game, if any
      CANNIBAL: 'Cannibale', //name of the cannibal in the game, if any
      AGENTS: 'Agent', //name of the agents in the game, if any
      SPY: 'Espion', //name if the spy un the game, if any
      SCIENTIST: 'Scientifique', //name of the scientist in the game, if any
      LOVERS: 'Amoureux', //name of the lovers in the game, if any
      THEBEAST: 'La Bête', //name of the beast in the game, if any
      BOUNTYHUNTER: 'Chasseur de primes', //name of the bounty hunter in the game, if any
      VOODOO: 'Vaudou'	//name of the voodoo in the game, if any																				
    }
  },
  BR: {
    SHEET: 'Battle Royale v2', //Data specific about the roles per game
    PARTIES_RANGE: 'BRParties', // Named range for parties data
    REF_PARTIES_RANGE: 'BRRefParties', // Named range for reference parties data
    COLS: {
      GAMEID: 'Game', //Battle Royal-specific Game ID
      PLAYER: 'Participants', //name of the player in that BR game
      SCORE: 'Score', //Number of points scored by that player
      WINNER: 'Gagnant', //Checkbox: true / false if the player has won		
      NBOFPLAYERS: 'Nombre de participants', //Number of players in that game
      DATE: 'Date', //Date of the BR game
      VOD: 'VOD', //Link to the Youtube VOD game				
      MODDED: 'Game Moddée', //Checkbox: true / false if the game is modded												
    }
  }
};


/**
 * Formate une date en format DD/MM/YYYY
 * @param {Date|string} calendarEntry - Date à formater
 * @return {string} Date formatée
 */
function formatLycanDate(calendarEntry) {
  if (Object.prototype.toString.call(calendarEntry) === '[object Date]') {
    var fullYear = calendarEntry.getFullYear();
    var monthNum = (calendarEntry.getMonth() + 1).toString().padStart(2, '0');
    var dayNum = calendarEntry.getDate().toString().padStart(2, '0');
    return `${dayNum}/${monthNum}/${fullYear}`;
  }
  
  // Conversion format YYYY-DD-MM en DD/MM/YYYY
  if (typeof calendarEntry === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(calendarEntry)) {
    var datePieces = calendarEntry.split('-');
    return `${datePieces[1]}/${datePieces[2]}/${datePieces[0]}`;
  }
  
  return calendarEntry;
}

/**
 * Récupère les données d'une feuille avec les différents formats
 * @param {string} tabName - Nom de la feuille
 * @return {Object} Données de la feuille (values, backgrounds)
 */
function getLycanSheetData(tabName) {
  var lycanDoc = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = lycanDoc.getSheetByName(tabName);
  var dataRange = targetSheet.getDataRange();
  
  return {
    values: dataRange.getValues(),
    backgrounds: dataRange.getBackgrounds()
  };
}

/**
 * Récupère les données d'une table spécifique via un named range
 * @param {string} namedRangeName - Nom du named range (ex: "Parties", "RefParties")
 * @return {Object} Données de la table (values, backgrounds)
 */
function getLycanTableData(namedRangeName) {
  try {
    var lycanDoc = SpreadsheetApp.getActiveSpreadsheet();
    var namedRange = lycanDoc.getRangeByName(namedRangeName);
    
    if (!namedRange) {
      throw new Error('Named range "' + namedRangeName + '" not found');
    }
    
    return {
      values: namedRange.getValues(),
      backgrounds: namedRange.getBackgrounds()
    };
  } catch (error) {
    Logger.log('Error in getLycanTableData: ' + error.message);
    throw error;
  }
}

/**
 * Trouve l'index d'une colonne par son nom
 * @param {Array} headerRow - Ligne d'en-tête avec les noms de colonnes
 * @param {string} columnName - Nom de la colonne à trouver
 * @return {number} Index de la colonne (-1 si non trouvée)
 */
function findColumnIndex(headerRow, columnName) {
  return headerRow.indexOf(columnName);
}
