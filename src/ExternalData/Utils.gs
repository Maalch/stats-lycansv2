/**
 * @fileoverview Fonctions utilitaires réutilisables pour les statistiques Lycans
 */

// Constants pour les noms de feuilles
const LYCAN_SCHEMA = {
  GAMES: {
    SHEET: 'Game', //General game data par game
    COLS: {
      GAMEID: 'Game', //Game ID (unique)
      DATE: 'Date', //Date (format DD/MM/YYYY)
      VOD: 'VOD', //Link to the youtube VOD 
      NBPLAYERS: 'Nombre de joueurs', //Number of players in that game
      NBWOLVES: 'Nombre de loups', //Number of wolves in that game
      TRAITOR: 'Rôle Traître', //Checkbox: true / false if a traitor is in the game 
      LOVERS: 'Rôle Amoureux', //Checkbox: true / false if the lovers are in the game
      SOLO: 'Rôles solo',  //name of the solo roles. If several, separated with comma
      WINNERCAMP: 'Camp victorieux', //name of the winner camp ("Loups", "Villageois"...)
      AVATARKILLED: 'Avatar tué', //Checkbox: true / false if an avatar is in the game
      NBDAYS: 'Nombre de journées', //number of days in the game
      SURVIVINGVILLAGERS: 'Survivants villageois', //number of villagers that survived at the end
      SURVIVINGWOLVES: 'Survivants loups (traître inclus)', //number of wolves (+ traitor) that survived in the end
      SURVIVINGLOVERS: 'Survivants amoureux', //number of lovers that survived in the end
      SURVIVINGSOLO: 'Survivants solo', //number of solo roles that survived in the game
      HARVEST: 'Récolte', //haverst at the end of the game
      TOTALHARVEST: 'Total récolte', //total haverst needed in that game to win as villagers
      HARVESTPERCENT: 'Pourcentage de récolte', //percentage of haverst at the end of the game
      PLAYERLIST: 'Liste des joueurs' //list of players in that game, separated with comma    											
    }
  },
  PONCE: {
    SHEET: 'Ponce', //Data specific to player Ponce per game
    COLS: {
      GAMEID: 'Game', //Game ID (unique)
      CAMP: 'Camp', //Camp ("Villageois", "Loups", "Idiot du village" ...)
      ROLE: 'Rôle principal', //Name of the main role
      SECONDARYROLE: 'Rôle secondaire', //Name of the secondary role
      WOLFROLE: 'Pouvoir de loup', //Name of the wolf role
      VILLAGEROLE: 'Métier villageois', //Name of the villager role
      PLAYERSKILLED: 'Joueurs tués', //Number of player killed
      DAYOFDEATH: 'Jour de mort', //Day of death (1, 2, 3, etc...) 
      TYPEOFDEATH: 'Type de mort'	//Type of death ("Tué par loup", "Mort de faim", "Mort aux votes"...)
    }
  },
  ROLES: {
    SHEET: 'Loups et solo', //Data specific about the roles per game
    COLS: {
      GAMEID: 'Game', //Game ID (unique)
      WOLFS: 'Loup(s)', //Name of the wolves in the game, separated by comma
      TRAITOR: 'Traître', //name of the traitor in the game (if any)
      IDIOT: 'Idiot du village', //name of the idiot in the game, if any
      CANNIBAL: 'Cannibale', //name of the cannibal in the game, if any
      AGENTS: 'Agent', //name of the agents in the game, if any
      SPY: 'Espion', //name if the spy un the game, if any
      SCIENTIST: 'Scientifique', //name of the scientist in the game, if any
      LOVERS: 'Amoureux', //name of the lovers in the game, if any
      THEBEAST: 'La Bête', //name of the beast in the game, if any
      BOUNTYHUNDER: 'Chasseur de primes', //name of the bounty hunter in the game, if any
      VOODOO: 'Vaudou'	//name of the voodoo in the game, if any																				
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
 * Trouve l'index d'une colonne par son nom
 * @param {Array} headerRow - Ligne d'en-tête avec les noms de colonnes
 * @param {string} columnName - Nom de la colonne à trouver
 * @return {number} Index de la colonne (-1 si non trouvée)
 */
function findColumnIndex(headerRow, columnName) {
  return headerRow.indexOf(columnName);
}