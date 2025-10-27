/**
 * GitHub Page Sync - Team Version
 * 
 * Ce fichier contient une version améliorée du script de synchronisation
 * qui gère mieux les permissions d'équipe.
 * 
 * INSTALLATION :
 * 1. Remplacer le contenu de GitHubPageSync.gs par ce fichier
 * 2. Configurer GITHUB_TOKEN dans les propriétés du script :
 *    - Dans l'éditeur : Paramètres du projet (⚙️) > Propriétés du script
 *    - Ajouter : GITHUB_TOKEN = votre_token_github
 * 3. Déployer comme "Application Web" :
 *    - Déployer > Nouveau déploiement > Application Web
 *    - Exécuter en tant que : Moi (propriétaire)
 *    - Qui a accès : Tous les membres de votre organisation
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔄 Mise à jour")
    .addItem("Mise à jour des données du site depuis le gdoc", "updateGameData")
    .addToUi();
}

/**
 * Fonction principale de mise à jour des données
 * Cette fonction déclenche le workflow GitHub Actions pour synchroniser les données
 */
function updateGameData() {
  const ui = SpreadsheetApp.getUi();
  
  // Vérifier qui exécute le script
  const currentUser = Session.getActiveUser().getEmail();
  Logger.log('Script exécuté par : ' + currentUser);
  
  // Confirmation dialog
  const response = ui.alert(
    'Confirmation',
    'Voulez-vous déclencher la synchronisation des données sur GitHub?\n\nCela va mettre à jour les fichiers de données sur le site web.',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    ui.alert('Annulé', 'La synchronisation a été annulée.', ui.ButtonSet.OK);
    return;
  }

  // Configuration
  const scriptProperties = PropertiesService.getScriptProperties();
  const GITHUB_TOKEN = scriptProperties.getProperty('GITHUB_TOKEN');
  const OWNER = 'Maalch';
  const REPO = 'stats-lycansv2';
  const WORKFLOW_ID = 'update-data.yml';
  const BRANCH = 'main';
  
  // Vérification du token
  if (!GITHUB_TOKEN) {
    ui.alert(
      'Erreur de configuration', 
      'Le token GitHub n\'est pas configuré.\n\n' +
      'Le propriétaire du script doit configurer GITHUB_TOKEN dans :\n' +
      'Paramètres du projet (⚙️) > Propriétés du script',
      ui.ButtonSet.OK
    );
    Logger.log('ERREUR: GITHUB_TOKEN manquant');
    return;
  }
  
  // Afficher un message de progression
  const progressDialog = ui.alert(
    'En cours...',
    'Déclenchement du workflow GitHub en cours...\n\nVeuillez patienter.',
    ui.ButtonSet.OK
  );
  
  try {
    const result = triggerGitHubWorkflow(GITHUB_TOKEN, OWNER, REPO, WORKFLOW_ID, BRANCH);
    
    if (result.success) {
      ui.alert(
        '✅ Succès', 
        'Le workflow GitHub a été déclenché avec succès!\n\n' +
        'Déclenché par : ' + currentUser + '\n\n' +
        'Vous pouvez vérifier son exécution sur :\n' +
        'https://github.com/Maalch/stats-lycansv2/actions',
        ui.ButtonSet.OK
      );
      Logger.log('SUCCESS: Workflow déclenché par ' + currentUser);
    } else {
      ui.alert(
        '❌ Erreur', 
        'Erreur lors du déclenchement du workflow.\n\n' +
        'Code HTTP : ' + result.statusCode + '\n' +
        'Réponse : ' + result.response,
        ui.ButtonSet.OK
      );
      Logger.log('ERREUR: Code ' + result.statusCode + ' - ' + result.response);
    }
    
  } catch (error) {
    ui.alert(
      '❌ Erreur critique', 
      'Une erreur est survenue :\n\n' + error.message + '\n\n' +
      'Vérifiez les logs (Extensions > Apps Script > Journal d\'exécution)',
      ui.ButtonSet.OK
    );
    Logger.log('ERREUR CRITIQUE: ' + error.message);
    Logger.log('Stack trace: ' + error.stack);
  }
}

/**
 * Fonction auxiliaire pour déclencher le workflow GitHub
 * Séparée pour faciliter le débogage et les tests
 * 
 * @param {string} token - Token GitHub (PAT)
 * @param {string} owner - Propriétaire du repo
 * @param {string} repo - Nom du repo
 * @param {string} workflowId - ID du workflow (nom du fichier .yml)
 * @param {string} branch - Branche à utiliser
 * @return {Object} Résultat de l'opération {success: boolean, statusCode: number, response: string}
 */
function triggerGitHubWorkflow(token, owner, repo, workflowId, branch) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;
  
  const options = {
    method: 'post',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Google-Apps-Script'
    },
    payload: JSON.stringify({
      ref: branch
    }),
    muteHttpExceptions: true
  };
  
  Logger.log('Envoi de la requête à : ' + url);
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  Logger.log('Code de réponse : ' + responseCode);
  Logger.log('Réponse : ' + responseText);
  
  return {
    success: responseCode === 204,
    statusCode: responseCode,
    response: responseText || 'Aucune réponse'
  };
}

/**
 * Fonction de test (pour le propriétaire uniquement)
 * Pour tester : Dans l'éditeur, Exécution > Exécuter > testGitHubSync
 */
function testGitHubSync() {
  Logger.log('=== Test de synchronisation GitHub ===');
  
  const scriptProperties = PropertiesService.getScriptProperties();
  const token = scriptProperties.getProperty('GITHUB_TOKEN');
  
  if (!token) {
    Logger.log('ERREUR: Token GitHub non configuré');
    return;
  }
  
  Logger.log('Token trouvé : ' + token.substring(0, 4) + '...');
  
  try {
    const result = triggerGitHubWorkflow(token, 'Maalch', 'stats-lycansv2', 'update-data.yml', 'main');
    Logger.log('Résultat du test : ' + JSON.stringify(result));
  } catch (error) {
    Logger.log('ERREUR lors du test : ' + error.message);
  }
}

/**
 * Fonction pour vérifier les autorisations actuelles
 * Utile pour le débogage
 */
function checkPermissions() {
  const user = Session.getActiveUser().getEmail();
  const effectiveUser = Session.getEffectiveUser().getEmail();
  
  Logger.log('Utilisateur actif : ' + user);
  Logger.log('Utilisateur effectif : ' + effectiveUser);
  Logger.log('Script owner : ' + (user === effectiveUser ? 'OUI (propriétaire)' : 'NON (utilisateur délégué)'));
  
  // Tester l'accès aux propriétés
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const token = scriptProperties.getProperty('GITHUB_TOKEN');
    Logger.log('Accès aux propriétés : OK');
    Logger.log('Token configuré : ' + (token ? 'OUI' : 'NON'));
  } catch (error) {
    Logger.log('Accès aux propriétés : ERREUR - ' + error.message);
  }
  
  // Tester UrlFetchApp
  try {
    UrlFetchApp.fetch('https://api.github.com/zen');
    Logger.log('Accès UrlFetchApp : OK');
  } catch (error) {
    Logger.log('Accès UrlFetchApp : ERREUR - ' + error.message);
  }
}
