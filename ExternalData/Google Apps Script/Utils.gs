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
      WINNERCAMP: 'Camp victorieux', //name of the winner camp ("Loup", "Villageois"...)
      VICTORYTYPE: 'Type de victoire', //Type of victory for the winning camp ("Vote", "Récolte", "Domination"...)
      NBDAYS: 'Nombre de journées', //number of days in the game. Could be either just an integer X, or a letter J/N/M + an integer (like J1 for Journée day 1, M3 for Meeting day 3)
      SURVIVINGPLAYERS: 'Survivants', //list of players alive at the end of the game
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
      GAMEMODID: 'Mod Game ID', //Name of the game in the original game mod log file: if set, only the LegacyData should be exported
      GSHEETPRIORITY: 'Utilisation du gdoc', //Checkbox : true / false, if true the export should returns all data and not only LegacyData, even if GAMEMODID is filled
      MAP: 'Map', //Map name of this game
      DURATION: 'Temps game' //Duration of the game, in mm:ss format (minutes/seconds)
    }
  },
  PLAYERS: {
    SHEET: 'Joueurs', //Players-specific infos
    COLS: {
      PLAYER: 'Joueur', //Name of the player
      IMAGEURL: 'Image', //URL of the image of that player
      TWITCHURL: 'Twitch', //URL of the twitch page of that player
      YOUTUBEURL: 'Youtube', //URL of the youtube page of that player
      COLOR:  'Couleur', //Most used color for this player
      ID: 'SteamID' //Steam unique ID for that player
    }
  },
  ROLECHANGES: {
    SHEET: 'Changements', //Camp, role and power changes during the games
    COLS: {
      GAMEID: 'Game', //Game ID (unique), same as Game v2 sheet
      PLAYER: 'Joueur', //Name of the player
      NEWCAMP: 'Camp', //New camp for that player (Villageois, Loup ...)	
      NEWMAINROLE: 'Rôle principal', //New main role of that player in the game, following the game logic (Villageois, Chasseur, Traître ...)
    }
  },
  VOTES: {
    SHEET: 'Conseils', //list of votes during meetings
    COLS: {
      GAMEID: 'Game', //Game ID (unique), same as Game v2 sheet
      MEETING: 'Conseils', //Number of the meeting in that day (1 for the first meeting, and so on)
      PLAYERS: 'Votants', //List of players for that specific VOTE category
      VOTE: 'Votes', //Target player of the vote, or "Passé" for Skip-vote / blank if no vote at all
      SELECTEDVOTE: 'Choix', //True/false if the VOTE is the selected vote type or not for that meeting
    }
  },
  ACTIONS: {
    SHEET: 'Actions', //list of objects usage and power/role usage
    COLS: {
      GAMEID: 'Game', //Game ID (unique), same as Game v2 sheet
      PLAYER: 'Joueur', //Name of the player
      ACTIONTYPE: 'ActionType', //Type of action: UsePower, UsePowerDeath, UseGadget, UsePortal, DrinkPotion, HunterShoot, Transform, Untransform, VictimPower, VictimGadget, VictimPotion, VictimChaos, VictimHanté, Sabotage, Sauvetage, TransferBombe, UntransformInfecté, ChooseImitateur, NewMayor, ActionMayor, DestitutionMayor, ActionElector, KillWolf
      ACTIONNAME: 'ActionName - Métier/Pouvoir/Rôle/Meeting', //Name of the action (power)
      ACTIONNAME2: 'ActionName - Effet/Objet/Potion', //Name of the action (object)
      TARGET: 'Target', //List of players name that are targetted (most of time 1 or empty, may be empty if action without target, like Transform)
      TIMING: 'Timing - Début', //Timing of the action, formated XY, with X = J/N/M (Day/Night/Meeting) and Y = the day number
      TIMINGEND: 'Timing - Fin', //End of action, , formated XY, with X = J/N/M (Day/Night/Meeting) and Y = the day number.  Maybe be empty if TIMINGSTART is filled
    }
  },
  ACTIONSINFO: {
    SHEET: 'Info Actions', //Information about actions (partial information or not)
    COLS: {
      GAMEID: 'Game', //Game ID (unique), same as Game v2 and Actions sheet. Only game that have actions info will be listed here
      INCOMPLETEGAMEPLAYERLIST: 'Partielle game', //List of player(s) that are missing action / power usage in that game. If empty, all players have action / power in that game
      INCOMPLETEMEETINGPLAYERLIST: 'Partielle meeting', //List of player(s) that are missing council / major / meeting info in that game. If empty, all players have council / major / meeting info in that game
    }
  },
  CLIPS: {
    SHEET: 'Clips', //list of clips / best moments of games
    COLS: {
      CLIPID: 'Clip id', //Unique ID of the video clip
      CLIPURL: 'Liens', //URL of the video clip (usually from Twitch)
      CLIPNAME: 'Nom du clip original', //Name of the video clip as displayed on Twitch/source
      GAMEID: 'Game', //Game ID (unique), same as Game v2 sheet
      POVPLAYER: 'POV', //Name of the player that displayed the POV of the clip
      OTHERSPLAYERS: 'Personnes impliquées', //List players involved in the clip. The POVPLAYER is in this list
      RELATEDCLIPS: 'Clips associés', //List of related CLIPID (for example, for different POVs). Empty most of the times.
      NEXTCLIP: 'Suite de clips', //Name of the next CLIPID, if the clip are directly in sequence. Empty most of the times.
      NEWNAME: 'Nom créé', //Displayed of the clip. Can be empty.
      ADDITIONALINFO: 'Contexte', //Additional information/explanation/context about the clip action
      TAGS: 'Tags', //List of Tags for the clip (to regroup them more easily). Can be empty 
    }
  },
  DETAILSV2: {
    SHEET: 'Détails v2', //Details data about each player each game in the new format
    COLS: {
      GAMEID: 'Game', //Game ID (unique),
      PLAYER: 'Joueur', //Name of the player
      VOD: 'POV', //Youtube link of the game for that player,
      COLOR: 'Couleur', //Name of the color (follow frenchColorMapping in api.ts),
      CAMP: 'Camp', //Name of the camp (Villageois, Loup ...)	
      MAINROLE: 'Rôle principal', //Main role of that player in the game, following the game logic (Villageois, Chasseur, Traître ...)
      POWER: 'Métier & Pouvoir', //Power of the player (any camp)
      SECONDARYROLE: 'Rôle secondaire', //Name of the secondary role for that player. Empty or 'N/A' if no secondary role
      DAYOFDEATH: 'Jour de mort', //Day of the death for that player. Could be either just an integer X, or a letter J/N/M + an integer (like J1 for Journée day 1, M3 for Meeting day 3)
      TYPEOFDEATH: 'Type de mort', //Type of death for that player (Tué par Loup, Mort aux votes, etc...). 'N/A' is not killed
      KILLEDPLAYERS: 'Personnes tuées', //List of player(s) killed by that player. If empty, killed no one
      KILLERPLAYERS: 'Joueurs tueurs', //List of player(s) that killed that player. Empty if not killed.

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

/**
 * Helper function to parse comma-separated player lists
 */
function parsePlayerList(playerListStr) {
  if (!playerListStr) return [];
  return playerListStr.split(',').map(function(p) { return p.trim(); });
}

/**
 * Helper function to determine if a player was victorious
 */
function isPlayerVictorious(playerName, gameRow, gameHeaders) {
  var winnerList = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.WINNERLIST)];
  if (!winnerList) return false;
  
  var winners = winnerList.split(',').map(function(p) { return p.trim(); });
  return winners.includes(playerName);
}

/**
 * Helper function to convert various date inputs to ISO (YYYY-MM-DDT00:00:00.000Z)
 * Accepts:
 *   - Date object (Google Sheets often returns this)
 *   - DD/MM/YYYY
 *   - YYYY-MM-DD
 *   - Already ISO (returns as is normalized)
 * Returns null if invalid.
 */
function convertDateToISO(dateInput) {
  if (!dateInput && dateInput !== 0) return null;
  
  // If already a Date object
  if (Object.prototype.toString.call(dateInput) === '[object Date]') {
    if (isNaN(dateInput.getTime())) return null;
    var y = dateInput.getFullYear();
    var m = (dateInput.getMonth() + 1).toString().padStart(2, '0');
    var d = dateInput.getDate().toString().padStart(2, '0');
    return y + '-' + m + '-' + d + 'T00:00:00.000Z';
  }
  
  // If number (sometimes Sheets serials leak through) -> treat as Date
  if (typeof dateInput === 'number') {
    try {
      var dateFromNumber = new Date(dateInput);
      if (!isNaN(dateFromNumber.getTime())) {
        var y2 = dateFromNumber.getFullYear();
        var m2 = (dateFromNumber.getMonth() + 1).toString().padStart(2, '0');
        var d2 = dateFromNumber.getDate().toString().padStart(2, '0');
        return y2 + '-' + m2 + '-' + d2 + 'T00:00:00.000Z';
      }
    } catch (e) {
      Logger.log('convertDateToISO: invalid numeric date ' + dateInput);
      return null;
    }
  }
  
  if (typeof dateInput !== 'string') {
    // Fallback: try to String() and continue
    dateInput = String(dateInput);
  }
  
  var trimmed = dateInput.trim();
  if (trimmed === '') return null;
  
  // Already ISO-like (YYYY-MM-DD or full ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    var isoParts = trimmed.substring(0, 10).split('-');
    if (isoParts.length === 3) {
      return isoParts[0] + '-' + isoParts[1] + '-' + isoParts[2] + 'T00:00:00.000Z';
    }
  }
  
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    var dmyparts = trimmed.split('/');
    var day = dmyparts[0];
    var month = dmyparts[1];
    var year = dmyparts[2];
    return year + '-' + month + '-' + day + 'T00:00:00.000Z';
  }
  
  Logger.log('convertDateToISO: unsupported date format "' + trimmed + '"');
  return null;
}


function formatDateForLegacyId(dateInput) {
  if (!dateInput && dateInput !== 0) return '00000000000000';
  
  var d;
  // Native Date
  if (Object.prototype.toString.call(dateInput) === '[object Date]') {
    if (isNaN(dateInput.getTime())) return '00000000000000';
    d = dateInput;
  } else if (typeof dateInput === 'number') {
    d = new Date(dateInput);
    if (isNaN(d.getTime())) return '00000000000000';
  } else {
    var str = String(dateInput).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) { // DD/MM/YYYY
      var parts = str.split('/');
      d = new Date(parts[2], parseInt(parts[1],10)-1, parts[0]);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) { // YYYY-MM-DD or ISO
      d = new Date(str);
      if (isNaN(d.getTime())) {
        // Fallback: manual parse first 10 chars
        var y = str.substring(0,4), m = str.substring(5,7), da = str.substring(8,10);
        d = new Date(y, parseInt(m,10)-1, da);
      }
    } else {
      return '00000000000000';
    }
  }
  
  var yyyy = d.getFullYear().toString();
  var MM = (d.getMonth()+1).toString().padStart(2,'0');
  var DD = d.getDate().toString().padStart(2,'0');
  var hh = d.getHours().toString().padStart(2,'0');
  var mm = d.getMinutes().toString().padStart(2,'0');
  var ss = d.getSeconds().toString().padStart(2,'0');
  return yyyy + MM + DD + hh + mm + ss;
}